/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PCV v2.0 (PLS v3.3)
 * Module: Business State Validator (BSV)
 * File: /src/core/BusinessStateValidator.ts
 *
 * Simulates intent operations on currently resolved snapshots to enforce hard stock 
 * and relationship invariants. Allows transactional continuity unless invariants fail.
 */

import { Article, Mouvement, Transfert, MaintenanceLog } from '../types';

export interface BSVValidationResult {
  isValid: boolean;
  classification: 'NETWORK_DRIFT' | 'STATE_INCONSISTENCY' | 'TRANSACTION_CONFLICT' | 'VALID';
  errorMsg?: string;
  inconsistentField?: string;
}

/**
 * Validates a stock movement (ENTREE, SORTIE, TRANSFERT, RETOUR) before execution.
 * Simulates impact and ensures stock levels and reference integrity remain verified.
 */
export function validateMouvementInvariants(
  mouvement: Mouvement,
  articles: Article[],
  mouvements: Mouvement[]
): BSVValidationResult {
  if (!mouvement.items || mouvement.items.length === 0) {
    return {
      isValid: false,
      classification: 'STATE_INCONSISTENCY',
      errorMsg: 'Le mouvement doit contenir au moins un article.',
    };
  }

  // Find if mouvement has a duplicate identifier representing transaction conflict
  const isDuplicate = mouvements.some((m) => m.id === mouvement.id && m.status === 'VALIDE');
  if (isDuplicate) {
    return {
      isValid: false,
      classification: 'TRANSACTION_CONFLICT',
      errorMsg: `Id de transaction en double détecté : ${mouvement.id}`,
    };
  }

  const articleMap = new Map<string, Article>(articles.map((a) => [a.id, a]));

  for (const item of mouvement.items) {
    const article = articleMap.get(item.articleId);
    
    // Check article presence
    if (!article) {
      return {
        isValid: false,
        classification: 'STATE_INCONSISTENCY',
        errorMsg: `Article introuvable pour ID : ${item.articleId}. Intégrité du référentiel compromise.`,
        inconsistentField: item.articleId,
      };
    }

    // AJOUTER CE CHECK :
    if (article.site !== mouvement.site && article.site !== undefined) {
      return {
        isValid: false,
        classification: 'STATE_INCONSISTENCY',
        errorMsg: `Incohérence de chantier : l'article "${article.designation}" (${article.ref}) 
                   appartient au chantier ${article.site} mais le mouvement est pour ${mouvement.site}.`,
        inconsistentField: 'site',
      };
    }

    // Verify negative stock limits for stock reduction operations
    const isReduction = mouvement.type === 'SORTIE' || mouvement.type === 'TRANSFERT_OUT';
    if (isReduction) {
      const projectedQty = article.quantity - item.quantity;
      if (projectedQty < 0) {
        return {
          isValid: false,
          classification: 'STATE_INCONSISTENCY',
          errorMsg: `Opération bloquée par le validateur : stock insuffisant pour ${article.designation} (${article.ref}). Requis: ${item.quantity}, Disponible: ${article.quantity}.`,
          inconsistentField: 'quantity',
        };
      }
    }
  }

  // Outward transfer specific validation
  if (mouvement.type === 'TRANSFERT_OUT' && !mouvement.targetSite) {
    return {
      isValid: false,
      classification: 'STATE_INCONSISTENCY',
      errorMsg: 'Site destinataire obligatoire pour les transferts sortants.',
      inconsistentField: 'targetSite',
    };
  }

  return { isValid: true, classification: 'VALID' };
}

/**
 * Validates a maintenance log entry which references replacement spare parts.
 * Simulates spare parts reduction and enforces non-negative physical stock.
 */
export function validateMaintenanceInvariants(
  log: MaintenanceLog,
  articles: Article[]
): BSVValidationResult {
  if (!log.partsUsed || log.partsUsed.length === 0) {
    return { isValid: true, classification: 'VALID' }; // No parts used is valid
  }

  const articleMap = new Map<string, Article>(articles.map((a) => [a.id, a]));

  for (const part of log.partsUsed) {
    const article = articleMap.get(part.articleId);
    
    if (!article) {
      return {
        isValid: false,
        classification: 'STATE_INCONSISTENCY',
        errorMsg: `Pièce détachée introuvable : ${part.articleId}`,
        inconsistentField: part.articleId,
      };
    }

    const projectedQty = article.quantity - part.quantity;
    if (projectedQty < 0) {
      return {
        isValid: false,
        classification: 'STATE_INCONSISTENCY',
        errorMsg: `Pièce indisponible : ${article.designation}. Requis: ${part.quantity}, Disponible: ${article.quantity}.`,
        inconsistentField: 'quantity',
      };
    }
  }

  return { isValid: true, classification: 'VALID' };
}

/**
 * Validates a transfer sending event.
 * Avoids circular transfers and verifies structural integrity.
 */
export function validateTransferInvariants(
  transfer: Transfert,
  articles: Article[]
): BSVValidationResult {
  if (transfer.sourceSite === transfer.targetSite) {
    return {
      isValid: false,
      classification: 'STATE_INCONSISTENCY',
      errorMsg: 'Le site d\'envoi et le site de réception ne peuvent pas être identiques.',
      inconsistentField: 'targetSite',
    };
  }

  if (!transfer.items || transfer.items.length === 0) {
    return {
      isValid: false,
      classification: 'STATE_INCONSISTENCY',
      errorMsg: 'Le transfert doit contenir au moins une ligne d\'article.',
    };
  }

  const articleMap = new Map<string, Article>(articles.map((a) => [a.id, a]));

  for (const item of transfer.items) {
    const article = articleMap.get(item.articleId);

    if (!article) {
      return {
        isValid: false,
        classification: 'STATE_INCONSISTENCY',
        errorMsg: `Référence article ${item.articleId} non cataloguée pour expédition.`,
        inconsistentField: item.articleId,
      };
    }

    const projectedQty = article.quantity - item.quantity;
    if (projectedQty < 0) {
      return {
        isValid: false,
        classification: 'STATE_INCONSISTENCY',
        errorMsg: `Quantité insuffisante pour envoi de transfert : ${article.designation}. Restant: ${article.quantity}, Demandé: ${item.quantity}`,
        inconsistentField: 'quantity',
      };
    }
  }

  return { isValid: true, classification: 'VALID' };
}

/**
 * Validates active receipt of an in-transit transfer.
 */
export function validateCompleteTransferInvariants(
  transferId: string,
  recepteur: string,
  transferts: Transfert[]
): BSVValidationResult {
  const currentTx = transferts.find((t) => t.id === transferId);

  if (!currentTx) {
    return {
      isValid: false,
      classification: 'STATE_INCONSISTENCY',
      errorMsg: `Avis d'expédition ${transferId} introuvable dans le snapshot actuel.`,
    };
  }

  if (currentTx.status === 'RECU' || currentTx.status === 'RECEIVED' || currentTx.status === 'CLOSED' || currentTx.status === 'DISPUTED') {
    return {
      isValid: false,
      classification: 'TRANSACTION_CONFLICT',
      errorMsg: `Le transfert (${transferId}) a déjà été réceptionné par le passé.`,
    };
  }

  if (!recepteur || recepteur.trim() === '') {
    return {
      isValid: false,
      classification: 'STATE_INCONSISTENCY',
      errorMsg: 'Le nom du réceptionnaire est requis.',
    };
  }

  return { isValid: true, classification: 'VALID' };
}
