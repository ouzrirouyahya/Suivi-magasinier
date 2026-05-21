/**
 * OBLIGATORY SRE INDUSTRIAL IMPLEMENTATION - INTEGRITY SCANNER v7.0
 * Module: SRE System Corruption Hunter & Diagnostics
 * File: /src/core/integrityScanner.ts
 */

import { Article, Mouvement } from '../types';
import { ImmutableInventoryLedger } from './recoveryEngine';

export interface IntegrityAnomaly {
  anomalyId: string;
  category: 'QUANTITY_UNDERFLOW' | 'CHRONO_GAP' | 'ORPHAN_REFERENCE' | 'LEDGER_BAL_DRIFT' | 'MEMORY_TAMPERING';
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  targetRefId: string; // SKU or movement ID
  timestamp: number;
}

export interface InspectionReport {
  timestamp: number;
  anomalies: IntegrityAnomaly[];
  totalCheckedArticles: number;
  totalCheckedMovements: number;
  ledgerValidation: {
    isCorrupted: boolean;
    brokenBlockIndex: number;
  };
  healthScorePct: number; // 0 to 100
}

/**
 * Runs a complete, rigorous security diagnostic scan over the state
 */
export function runDeepIntegrityScan(
  articles: Article[],
  movements: Mouvement[],
  targetSite: string
): InspectionReport {
  const anomalies: IntegrityAnomaly[] = [];
  const epoch = Date.now();

  // 1. Audit Ledgers for Cryptographic Tampering
  const ledgerStatus = ImmutableInventoryLedger.verifyIntegrity();
  if (ledgerStatus.isCorrupted) {
    anomalies.push({
      anomalyId: `ANOM_LEDGER_${epoch}_01`,
      category: 'MEMORY_TAMPERING',
      severity: 'CRITICAL',
      description: `CRYPTO_CHAIN_BROKEN: Le ledger d'inventaire immuable local est corrompu au bloc #${ledgerStatus.brokenIndex}. Signature invalide.`,
      targetRefId: `BLOCK_${ledgerStatus.brokenIndex}`,
      timestamp: epoch,
    });
  }

  // 2. Quantity Underflow & Value Incoherence checks
  articles.forEach((a) => {
    if (a.site === targetSite) {
      if (a.quantity < 0) {
        anomalies.push({
          anomalyId: `ANOM_UNDER_${a.id}`,
          category: 'QUANTITY_UNDERFLOW',
          severity: 'CRITICAL',
          description: `STOCK_NEGATIF: L'article ${a.designation} (${a.ref}) affiche un solde négatif anormal de ${a.quantity} unités. Opération hors-jeu.`,
          targetRefId: a.ref,
          timestamp: epoch,
        });
      }
      if (a.price !== undefined && (a.price < 0 || a.price > 1000000)) {
        anomalies.push({
          anomalyId: `ANOM_VAL_${a.id}`,
          category: 'QUANTITY_UNDERFLOW',
          severity: 'ERROR',
          description: `VALUATION_POISONING: Le prix unitaire (${a.price || 0} MAD) est hors limites réalistes.`,
          targetRefId: a.ref,
          timestamp: epoch,
        });
      }
    }
  });

  // 3. Chronological holes and orphan check
  const articleIds = new Set(articles.map((a) => a.id));
  const sortedMovements = [...movements].sort((a, b) => {
    const timeA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date?.seconds * 1000 || 0;
    const timeB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date?.seconds * 1000 || 0;
    return timeA - timeB;
  });

  let previousTime = 0;
  sortedMovements.forEach((mov, index) => {
    const mTime = typeof mov.date === 'string' ? new Date(mov.date).getTime() : mov.date?.seconds * 1000 || 0;

    // Detect chronological inversion or time jumps indicating manual modification
    if (index > 0 && mTime < previousTime) {
      anomalies.push({
        anomalyId: `ANOM_TIME_INVERT_${mov.id}`,
        category: 'CHRONO_GAP',
        severity: 'ERROR',
        description: `INVERSION_TIME: Le mouvement ${mov.id} (${mov.type}) présente un horodatage antérieur au mouvement précédent. Chronologie en désordre.`,
        targetRefId: mov.id,
        timestamp: epoch,
      });
    }

    // Detect gap if time diff is enormous between two consecutive validations
    if (index > 0 && mTime - previousTime > 30 * 24 * 60 * 60 * 1000) { // More than 30 days gap
      anomalies.push({
        anomalyId: `ANOM_TIME_GAP_${mov.id}`,
        category: 'CHRONO_GAP',
        severity: 'WARNING',
        description: `LACUNE_TEMPORELLE: Interruption de traçabilité de plus de 30 jours détectée entre deux écritures physiques de stocks.`,
        targetRefId: mov.id,
        timestamp: epoch,
      });
    }

    previousTime = mTime;

    // Check for orphan references (movement items referencing non-existent articles)
    for (const item of mov.items) {
      if (!articleIds.has(item.articleId)) {
        anomalies.push({
          anomalyId: `ANOM_ORPH_${mov.id}_${item.articleId}`,
          category: 'ORPHAN_REFERENCE',
          severity: 'CRITICAL',
          description: `REFERENCE_ORPHELINE: Le mouvement ${mov.id} référence l'article inexistant ID [${item.articleId}]. Risque élevé d'impuretés relationnelles.`,
          targetRefId: mov.id,
          timestamp: epoch,
        });
      }
    }
  });

  // 4. Ledger vs Stock calculated reconciliation
  // Reconstruct step-by-step from Ledger ledger entries
  const calculatedStock: Record<string, number> = {};
  const ledgerEntries = ImmutableInventoryLedger.getEntries();

  // Seed with base or zero
  articles.forEach((a) => {
    if (a.site === targetSite) {
      calculatedStock[a.id] = 0; // We assume zero-baseline and sum up entries
    }
  });

  // Process movements inside ledger payload
  ledgerEntries.forEach((entry) => {
    if (entry.actionType === 'MOUVEMENT_SUBMISSION') {
      const mov = entry.payload;
      if (mov && mov.status === 'VALIDE') {
        for (const item of (mov.items || [])) {
          const val = calculatedStock[item.articleId] || 0;
          if (mov.site === targetSite) {
            if (mov.type === 'ENTREE' || mov.type === 'RETOUR') {
              calculatedStock[item.articleId] = val + item.quantity;
            } else if (mov.type === 'SORTIE' || mov.type === 'TRANSFERT_OUT') {
              calculatedStock[item.articleId] = val - item.quantity;
            }
          }
          if (mov.targetSite === targetSite && mov.type === 'TRANSFERT_IN') {
            calculatedStock[item.articleId] = val + item.quantity;
          }
        }
      }
    }
  });

  // Verify if computed balances matches current state values for actively tracked SKU articles
  let driftCount = 0;
  articles.forEach((a) => {
    if (a.site === targetSite && a.quantity > 0) {
      const calculated = calculatedStock[a.id];
      // If we have calculated stock recorded in ledger and it diverges, raise warnings
      if (calculated !== undefined && calculated !== a.quantity) {
        driftCount++;
        anomalies.push({
          anomalyId: `ANOM_DRIFT_${a.id}`,
          category: 'LEDGER_BAL_DRIFT',
          severity: 'WARNING',
          description: `DEVIATION_SOLDE: L'article ${a.designation} (${a.ref}) affiche un écart. Enregistré database: ${a.quantity}, Calculé ledger: ${calculated}. Écart: ${a.quantity - calculated}`,
          targetRefId: a.ref,
          timestamp: epoch,
        });
      }
    }
  });

  // Compute final structural health score of memory
  let deduction = 0;
  anomalies.forEach((anom) => {
    if (anom.severity === 'CRITICAL') deduction += 30;
    else if (anom.severity === 'ERROR') deduction += 15;
    else deduction += 5;
  });

  const healthScorePct = Math.max(0, 100 - deduction);

  return {
    timestamp: epoch,
    anomalies,
    totalCheckedArticles: articles.length,
    totalCheckedMovements: movements.length,
    ledgerValidation: {
      isCorrupted: ledgerStatus.isCorrupted,
      brokenBlockIndex: ledgerStatus.brokenIndex,
    },
    healthScorePct,
  };
}
