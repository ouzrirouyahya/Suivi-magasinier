/**
 * OBLIGATORY SRE INDUSTRIAL IMPLEMENTATION - DISASTER RECOVERY ENGINE & LEDGER v7.0
 * Module: Snapshot Recovery Engine & Immutable Inventory Ledger
 * File: /src/core/recoveryEngine.ts
 */

import { Article, Mouvement } from '../types';
import { logForensicEvent } from './forensicJournal';

export interface StateSnapshot {
  snapshotId: string;
  timestamp: number; // UTC Epoch
  label: string;
  articles: Article[];
  movementsCount: number;
  integrityHash: string; // Dynamic state fingerprint
}

export interface LedgerEntry {
  ledgerId: string;
  timestamp: number;
  intentId: string;
  actionType: 'MOUVEMENT_SUBMISSION' | 'ARTICLE_MUTATION' | 'INVENTAIRE_ALIGN' | 'MANUAL_OVERWRITE' | 'LEDGER_RESTORE';
  payload: any;
  prevHash: string;
  hash: string;
}

const SNAPSHOTS_KEY = 'hydromines_state_snapshots';
const LEDGER_KEY = 'hydromines_immutable_ledger';
const MAX_SNAPSHOTS = 15; // History window to protect storage limits

/**
 * Super-fast, lightweight rolling Adler/Jenkins FNV-inspired hash to secure blockchain chaining in browser safely.
 */
function computeLightweightHash(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Creates a unique deterministic fingerprint of the articles array
 */
export function computeArticlesFingerprint(articles: Article[]): string {
  const serialized = articles
    .map((a) => `${a.id}:${a.ref}:${a.quantity}:${a.minStock}:${a.active ? '1' : '0'}`)
    .sort()
    .join('|');
  return computeLightweightHash(serialized);
}

// ==========================================
// SECTION 1: IMMUTABLE INVENTORY LEDGER
// ==========================================

export const ImmutableInventoryLedger = {
  /**
   * Appends an append-only block to the tamper-proof ledger chain.
   * Every block contains a hash computed over the previous block's hash + block data.
   */
  appendEntry(
    intentId: string,
    actionType: LedgerEntry['actionType'],
    payload: any
  ): LedgerEntry {
    const epoch = Date.now();
    const ledgerId = `LEDGER_${epoch}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    let chain: LedgerEntry[] = [];
    try {
      const raw = localStorage.getItem(LEDGER_KEY);
      if (raw) chain = JSON.parse(raw);
    } catch {
      chain = [];
    }

    const prevBlock = chain[chain.length - 1];
    const prevHash = prevBlock ? prevBlock.hash : 'GENESIS_BLOCK_HYDRO_00000000';

    // Stringify payload stably for hashing
    const payloadStr = JSON.stringify(payload || {});
    const contentToHash = `${prevHash}|${epoch}|${intentId}|${actionType}|${payloadStr}`;
    const hash = computeLightweightHash(contentToHash);

    const entry: LedgerEntry = {
      ledgerId,
      timestamp: epoch,
      intentId,
      actionType,
      payload,
      prevHash,
      hash,
    };

    chain.push(entry);

    // Write-back safely to store
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(chain));
      logForensicEvent(
        'INFO',
        'STORAGE_SHIELD',
        `Ledger Block committed. Height: ${chain.length}. Hash: ${hash.substring(0, 8)}...`,
        { ledgerId, actionType, intentId }
      );
    } catch (e) {
      logForensicEvent(
        'CRITICAL',
        'STORAGE_SHIELD',
        'Fail-safe write to ledger buffer failed. Non-volatile protection warning.',
        { payloadBrief: payloadStr.substring(0, 100) }
      );
    }

    return entry;
  },

  /**
   * Reads all registered ledger events sequentially
   */
  getEntries(): LedgerEntry[] {
    try {
      const raw = localStorage.getItem(LEDGER_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Audits the ledger chain from Genesis to current height.
   * Detects block dropping, link corruptions, or unauthorized item alterations.
   */
  verifyIntegrity(): {
    isCorrupted: boolean;
    brokenIndex: number;
    expectedHash?: string;
    computedHash?: string;
    chainSize: number;
  } {
    const entries = this.getEntries();
    if (entries.length === 0) {
      return { isCorrupted: false, brokenIndex: -1, chainSize: 0 };
    }

    let expectedPrevHash = 'GENESIS_BLOCK_HYDRO_00000000';

    for (let i = 0; i < entries.length; i++) {
      const block = entries[i];

      // 1. Verify block linkage
      if (block.prevHash !== expectedPrevHash) {
        return {
          isCorrupted: true,
          brokenIndex: i,
          expectedHash: expectedPrevHash,
          computedHash: block.prevHash,
          chainSize: entries.length,
        };
      }

      // 2. Re-compute block fingerprint
      const payloadStr = JSON.stringify(block.payload || {});
      const contentToHash = `${block.prevHash}|${block.timestamp}|${block.intentId}|${block.actionType}|${payloadStr}`;
      const recalculatedHash = computeLightweightHash(contentToHash);

      if (block.hash !== recalculatedHash) {
        return {
          isCorrupted: true,
          brokenIndex: i,
          expectedHash: block.hash,
          computedHash: recalculatedHash,
          chainSize: entries.length,
        };
      }

      expectedPrevHash = block.hash; // Link to next
    }

    return { isCorrupted: false, brokenIndex: -1, chainSize: entries.length };
  },

  /**
   * Force reset of the ledger chain (restricted to disaster recovery rollbacks only)
   */
  dangerouslyOverwriteLedger(newChain: LedgerEntry[]): void {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(newChain));
  }
};

// ==========================================
// SECTION 2: SNAPSHOT RECOVERY ENGINE
// ==========================================

export const SnapshotRecoveryEngine = {
  /**
   * Automated Snapshot generation engine
   */
  saveAutomaticSnapshot(articles: Article[], label: string): StateSnapshot {
    const epoch = Date.now();
    const snapshotId = `SNAP_${epoch}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const finger = computeArticlesFingerprint(articles);

    let list: StateSnapshot[] = [];
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch {
      list = [];
    }

    const snapshot: StateSnapshot = {
      snapshotId,
      timestamp: epoch,
      label,
      articles: JSON.parse(JSON.stringify(articles)), // Clone state values faithfully
      movementsCount: 0,
      integrityHash: finger,
    };

    list.push(snapshot);

    // Sliding retention window of snapshots to maintain LocalStorage balance
    if (list.length > MAX_SNAPSHOTS) {
      list = list.slice(list.length - MAX_SNAPSHOTS);
    }

    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list));
    
    logForensicEvent(
      'INFO',
      'PCV_ENGINE',
      `Auto-Snapshot saved: "${label}". Id: ${snapshotId}. State signature: ${finger}`,
      { snapshotId, label }
    );

    return snapshot;
  },

  /**
   * Retrieves all snapshots
   */
  getSnapshots(): StateSnapshot[] {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Rollback the inventory list totally to a targeted snapshot state
   */
  rollbackToSnapshot(snapshotId: string): Article[] {
    const snapshots = this.getSnapshots();
    const found = snapshots.find((s) => s.snapshotId === snapshotId);
    if (!found) {
      throw new Error(`CRITICAL_DISASTER: Snapshot identifier [${snapshotId}] does not exist in local registries.`);
    }

    logForensicEvent(
      'CRITICAL',
      'PCV_ENGINE',
      `Manual Rollback to Snapshot completed. Target label: "${found.label}". Hash state re-instated: ${found.integrityHash}`,
      { snapshotId, label: found.label }
    );

    return JSON.parse(JSON.stringify(found.articles));
  },

  /**
   * Selective SKU Item Rollback: Performs selective restore of single Article without overriding other items.
   */
  selectiveSKURollback(sku: string, snapshotId: string, currentArticles: Article[]): Article[] {
    const snapshots = this.getSnapshots();
    const found = snapshots.find((s) => s.snapshotId === snapshotId);
    if (!found) {
      throw new Error(`CRITICAL_DISASTER: Target snapshot not found for SKU rollback.`);
    }

    const snapArticle = found.articles.find((a) => a.ref === sku);
    if (!snapArticle) {
      throw new Error(`SKU_NOT_IN_SNAPSHOT: Item containing SKU ref [${sku}] wasn't catalogued inside the snapshot.`);
    }

    // Clone array
    const cloned = JSON.parse(JSON.stringify(currentArticles)) as Article[];
    const index = cloned.findIndex((a) => a.ref === sku);

    if (index !== -1) {
      cloned[index].quantity = snapArticle.quantity;
      cloned[index].minStock = snapArticle.minStock;
      cloned[index].designation = snapArticle.designation;
      cloned[index].location = snapArticle.location;
    } else {
      // Re-add missing article from snapshot history
      cloned.push(JSON.parse(JSON.stringify(snapArticle)));
    }

    logForensicEvent(
      'INFO',
      'PCV_ENGINE',
      `Selective SKU restoration of [${sku}] to Snapshot (${snapshotId}) complete. Restored Qty: ${snapArticle.quantity}.`,
      { sku, snapshotId }
    );

    return cloned;
  },

  /**
   * Fully reconstructs the theoretical stock state step-by-step from zero using movement logs
   */
  reconstructChronologicalStock(
    baseArticles: Article[],
    movements: Mouvement[],
    targetSite: string
  ): Record<string, number> {
    const reconstructedBalances: Record<string, number> = {};

    // Initialise baseline quantities
    baseArticles.forEach((a) => {
      if (a.site === targetSite) {
        reconstructedBalances[a.id] = 0; // Absolute reconstitution from seed index
      }
    });

    // Sort movements chronically
    const sortedMovements = [...movements].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date?.seconds * 1000 || 0;
      const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date?.seconds * 1000 || 0;
      return dateA - dateB;
    });

    for (const mov of sortedMovements) {
      if (mov.status !== 'VALIDE' && mov.status !== 'COMPLETE') continue;

      for (const item of mov.items) {
        // Source site reduction
        if (mov.site === targetSite) {
          const prev = reconstructedBalances[item.articleId] || 0;
          if (mov.type === 'ENTREE' || mov.type === 'AJUSTEMENT' || mov.type === 'RETOUR') {
            reconstructedBalances[item.articleId] = prev + item.quantity;
          } else if (mov.type === 'SORTIE' || mov.type === 'TRANSFERT_OUT') {
            reconstructedBalances[item.articleId] = prev - item.quantity;
          }
        }
        
        // Target site increment for inter-site receipts
        if (mov.targetSite === targetSite && mov.type === 'TRANSFERT_IN') {
          const prev = reconstructedBalances[item.articleId] || 0;
          reconstructedBalances[item.articleId] = prev + item.quantity;
        }
      }
    }

    return reconstructedBalances;
  }
};
