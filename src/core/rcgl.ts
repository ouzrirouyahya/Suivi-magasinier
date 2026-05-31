/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PCV v2.0 (PLS v3.3)
 * Module: Probabilistic Consistency & Business-State Validation Layer
 * File: /src/core/rcgl.ts
 *
 * Distinguishes between sheer network-induced freshness delay (NETWORK_DRIFT)
 * and logical anomalies (STATE_INCONSISTENCY). Implements high-throughput mining site
 * data availability.
 */

import { Article, Mouvement, Transfert } from '../types';
import { calculateSnapshotConfidence, ConfidenceMetrics } from './ConfidenceEngine';

export interface ReadFreshnessToken {
  snapshotTimestamp: number;
  collectionVersions: {
    articles: string;
    mouvements: string;
    transferts: string;
  };
}

export interface ConsistencyCheckResult {
  isHighlyStale: boolean;
  hasCollectionVersionSkew: boolean;
  isGloballyConsistent: boolean; // green/uncritical
  skewDescription?: string;
  freshnessGapMs: number;
  confidenceScore: number;
  mode: 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED';
  classification: 'NETWORK_DRIFT' | 'STATE_INCONSISTENCY' | 'TRANSACTION_CONFLICT' | 'VALID';
}

const MAX_STALENESS_WINDOW_MS = 15000;

/**
 * Computes a deterministic version hash representing the collection's logical sequence of updates.
 */
export function generateCollectionHash(items: any[]): string {
  if (!items || items.length === 0) return 'empty_sha';
  
  const fingerprints = items
    .map((item) => {
      const id = item.id || '';
      const updateMarker = item.updatedAt || item.date || item.queuedAt || '';
      return `${id}:${updateMarker}`;
    })
    .sort()
    .join('|');

  let hash = 0;
  for (let i = 0; i < fingerprints.length; i++) {
    hash = (hash << 5) - hash + fingerprints.charCodeAt(i);
    hash |= 0;
  }
  return `v_${Math.abs(hash)}`;
}

/**
 * Evaluates the absolute freshness window threshold of a given server snapshot block.
 * Represents client-server drift guard.
 */
export function isSnapshotStale(snapshotTimestamp: number): boolean {
  if (snapshotTimestamp <= 0) return true;
  const elapsed = Date.now() - snapshotTimestamp;
  return elapsed > MAX_STALENESS_WINDOW_MS;
}

/**
 * Core Cross-Collection Consistency & PCV v2.0 Classifier.
 * Classifies data drift anomalies under active communication networks.
 */
export function validateGlobalSnapshotState(
  articles: Article[],
  mouvements: Mouvement[],
  transferts: Transfert[],
  lastServerSnapshotTimestamp: number,
  pendingQueueLength: number = 0,
  dlqLength: number = 0
): ConsistencyCheckResult {
  const now = Date.now();
  const freshnessGapMs = lastServerSnapshotTimestamp > 0 ? now - lastServerSnapshotTimestamp : Infinity;
  const isHighlyStale = lastServerSnapshotTimestamp > 0 && freshnessGapMs > MAX_STALENESS_WINDOW_MS;

  // 1. Calculate the Probabilistic Confidence Score
  const metrics = calculateSnapshotConfidence(
    lastServerSnapshotTimestamp,
    pendingQueueLength,
    dlqLength
  );

  let skewDescription: string | undefined;
  let hasCollectionVersionSkew = false;

  // 2. Perform Logical Auditing: Look for STATE_INCONSISTENCY (split-brain)
  
  // Rule A: Audit check
  if (mouvements.length > 0 && articles.length > 0) {
    const articleIdsSet = new Set(articles.map((a) => a.id));
    const recentMouvements = mouvements.slice(0, 15);
    
    for (const mv of recentMouvements) {
      if (mv.items) {
        for (const item of mv.items) {
          if (!articleIdsSet.has(item.articleId)) {
            const mvTime = mv.date ? new Date(mv.date).getTime() : 0;
            const ageMs = now - mvTime;
            // Only trigger a consistency violation if the movement was made within the last 45 seconds (transient sync drift).
            // If the movement is older, the referenced article was likely deleted, which is a normal state.
            if (mvTime > 0 && ageMs < 45000) {
              hasCollectionVersionSkew = true;
              skewDescription = `Incohérence de stock : le mouvement récent (${mv.id || "N/A"}) fait référence à un identifiant d'article introuvable (${item.articleId}). SRE attend la synchronisation.`;
              break;
            }
          }
        }
      }
      if (hasCollectionVersionSkew) break;
    }
  }

  // Rule B: Outbox check (Transfers vs Movements mapping mismatch)
  if (!hasCollectionVersionSkew && transferts.length > 0 && mouvements.length > 0) {
    const transferRefsInMouvements = new Set(
      mouvements
        .filter((m) => m.type === 'TRANSFERT_IN' || m.type === 'TRANSFERT_OUT')
        .map((m) => m.reference)
        .filter(Boolean)
    );

    const recentTransfers = transferts.slice(0, 10);
    for (const t of recentTransfers) {
      if (t.status === 'RECU' && !transferRefsInMouvements.has(t.reference)) {
        hasCollectionVersionSkew = true;
        skewDescription = `Erreur de liaison mouvement / log : le transfert régularisé (${t.reference || t.id}) ne possède aucun mouvement logistique correspondant en base de données.`;
        break;
      }
    }
  }

  // 3. Classify PCV v2.0 State
  let classification: 'NETWORK_DRIFT' | 'STATE_INCONSISTENCY' | 'TRANSACTION_CONFLICT' | 'VALID' = 'VALID';

  if (hasCollectionVersionSkew) {
    classification = 'STATE_INCONSISTENCY';
  } else if (isHighlyStale) {
    classification = 'NETWORK_DRIFT';
  }

  // Globally consistent if there are NO state inconsistencies
  // Note: NETWORK_DRIFT is NOT classified as globally inconsistent in terms of time freshness,
  // but it does NOT trigger blocking.
  const isGloballyConsistent = !hasCollectionVersionSkew; 

  return {
    isHighlyStale,
    hasCollectionVersionSkew,
    isGloballyConsistent,
    skewDescription,
    freshnessGapMs,
    confidenceScore: metrics.score,
    mode: metrics.mode,
    classification,
  };
}
