/**
 * HYDROMINES INDUSTRIAL PREDICTIVE INTELLIGENCE ENGINE v8.0
 * Module: Maintenance & Logistic Predictive Core
 * File: /src/core/predictiveEngine.ts
 */

import { Article, Mouvement } from '../types';

export interface PredictiveAlert {
  id: string;
  type: 'CRITICAL_STOCKOUT' | 'PREDICTIVE_RUPTURE' | 'DORMANT_ASSET' | 'INCOHERENT_FLOW' | 'REPETITIVE_ANOMALY';
  title: string;
  message: string;
  sku: string;
  designation: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  timestamp: string;
}

export interface SKUReviewPrediction {
  articleId: string;
  sku: string;
  designation: string;
  estimatedStockoutDays: number; // -1 if stable, never, or infinite. Otherwise positive number of days.
  dormantIndexPct: number; // 0 to 100% (lack of movement activity over tracked epochs)
  suggestedSafetyStock: number;
  estimatedReplenishmentLeadDays: number;
}

/**
 * Executes a holistic predictive log analysis to foresight inventory deficits.
 */
export function executePredictiveForecasting(
  articles: Article[],
  movements: Mouvement[],
): { predictions: Record<string, SKUReviewPrediction>; alerts: PredictiveAlert[] } {
  const predictions: Record<string, SKUReviewPrediction> = {};
  const alerts: PredictiveAlert[] = [];

  const nowMs = Date.now();
  const thirtyDaysAgoMs = nowMs - 30 * 86400 * 1000;

  // Track absolute timestamps & items consumed
  const articleRates: Record<string, number> = {}; // Quantity consumed per day (positive rate)
  const lastMovementTime: Record<string, number> = {};
  const totalMvmtCount: Record<string, number> = {};

  // Track flow structures to find duplicate transfers or rapid additions-subtractions
  const recentFlowLogs: Record<string, Array<{ type: string; qty: number; date: number }>> = {};

  // Sort movements oldest to newest
  const sortedMovements = [...movements].sort((a, b) => {
    const timeA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date?.seconds * 1000 || 0;
    const timeB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date?.seconds * 1000 || 0;
    return timeA - timeB;
  });

  sortedMovements.forEach((m) => {
    const timeMs = typeof m.date === 'string' ? new Date(m.date).getTime() : m.date?.seconds * 1000 || 0;
    
    m.items.forEach((item) => {
      totalMvmtCount[item.articleId] = (totalMvmtCount[item.articleId] || 0) + 1;
      lastMovementTime[item.articleId] = Math.max(lastMovementTime[item.articleId] || 0, timeMs);

      // Track flows to check consistency
      if (!recentFlowLogs[item.articleId]) {
        recentFlowLogs[item.articleId] = [];
      }
      recentFlowLogs[item.articleId].push({
        type: m.type,
        qty: item.quantity,
        date: timeMs
      });

      // Calculate consumption rate (only SUBTRACTIONS like SORTIE, TRANSFERT_OUT)
      const isConsumption = m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT';
      if (isConsumption) {
        articleRates[item.articleId] = (articleRates[item.articleId] || 0) + item.quantity;
      }
    });
  });

  // Normalize consumption rates to daily values
  articles.forEach((art) => {
    const totalOut = articleRates[art.id] || 0;
    let dailyRate = 0;

    // Use full range of movements to figure out daily rate
    const oldestMvmt = sortedMovements.find(m => m.items.some(it => it.articleId === art.id));
    if (oldestMvmt) {
      const oldestTime = typeof oldestMvmt.date === 'string' ? new Date(oldestMvmt.date).getTime() : oldestMvmt.date?.seconds * 1000 || 0;
      const daysDiff = Math.max(1, (nowMs - oldestTime) / (86400 * 1000));
      dailyRate = totalOut / daysDiff;
    } else {
      // Small baseline speed if no custom movements exist
      dailyRate = art.quantity > 0 ? 0.05 : 0;
    }

    // Days until stock runs out
    let estimatedStockoutDays = -1;
    if (art.quantity <= 0) {
      estimatedStockoutDays = 0;
    } else if (dailyRate > 0) {
      estimatedStockoutDays = parseFloat((art.quantity / dailyRate).toFixed(1));
    }

    // Calculate Dormancy Index
    const lastActivity = lastMovementTime[art.id] || 0;
    let dormantIndexPct = 0;
    if (lastActivity === 0) {
      dormantIndexPct = 100; // No recorded movements ever
    } else {
      const daysSinceLastActivity = (nowMs - lastActivity) / (86400 * 1000);
      dormantIndexPct = Math.min(100, Math.round((daysSinceLastActivity / 45) * 100)); // Consider fully dormant after 45 days
    }

    // Dynamic suggested safety stock: based on daily velocity plus 20% margin
    // Defaulting to safety buffer equivalent to 10 days of continuous mining needs, min 5
    const suggestedSafetyStock = Math.max(5, Math.ceil(dailyRate * 12 + (art.minStock * 0.1)));

    // Replenishment lead time model (based on historical standard or estimated catalog constraints)
    let estimatedReplenishmentLeadDays = 4; // Default standard Surface North transport time
    if (art.ref.startsWith('DSJ') || art.ref.startsWith('PERFO')) {
      estimatedReplenishmentLeadDays = 7; // Heavy machinery parts take longer
    } else if (art.ref.startsWith('EPI')) {
      estimatedReplenishmentLeadDays = 3; // Basic gear is fast
    }

    predictions[art.id] = {
      articleId: art.id,
      sku: art.ref,
      designation: art.designation,
      estimatedStockoutDays,
      dormantIndexPct,
      suggestedSafetyStock,
      estimatedReplenishmentLeadDays
    };

    // -----------------------------------------------------------------
    // SMART ALERT TRIGGER LOGIC
    // -----------------------------------------------------------------

    // 1. Critical Stockout Alert (Rupture déjà consommée)
    if (art.quantity <= 0) {
      alerts.push({
        id: `alert-critical-${art.id}`,
        type: 'CRITICAL_STOCKOUT',
        title: `RUPTURE CRITIQUE CONSTАТÉE : ${art.ref}`,
        message: `Le SKU ${art.ref} (${art.designation}) est actuellement à zéro ou en sous-écoulement (${art.quantity} un.). Veuillez initier un réapprovisionnement de surface immédiat.`,
        sku: art.ref,
        designation: art.designation,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Predictive Rupture Alert (Rupture future sous 5 jours)
    if (estimatedStockoutDays > 0 && estimatedStockoutDays <= 5) {
      alerts.push({
        id: `alert-pred-${art.id}`,
        type: 'PREDICTIVE_RUPTURE',
        title: `PRÉDICTION DE SURCHAUFFE DE STOCKOUT : ${art.ref}`,
        message: `Vitesse de consommation dynamique élevée. Rupture prédite dans ${estimatedStockoutDays} jours face à la cadence actuelle de la mine.`,
        sku: art.ref,
        designation: art.designation,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      });
    } else if (estimatedStockoutDays > 5 && estimatedStockoutDays <= 12) {
      alerts.push({
        id: `alert-pred-warn-${art.id}`,
        type: 'PREDICTIVE_RUPTURE',
        title: `Alerte de Déviation Logistique : ${art.ref}`,
        message: `Niveau d'alerte intermédiaire. Rupture probable estimée sous ${estimatedStockoutDays} jours de travail continu.`,
        sku: art.ref,
        designation: art.designation,
        severity: 'WARNING',
        timestamp: new Date().toISOString()
      });
    }

    // 3. Dormant Assets Alert
    if (dormantIndexPct >= 100 && art.quantity > 50) {
      alerts.push({
        id: `alert-dormant-${art.id}`,
        type: 'DORMANT_ASSET',
        title: `STOCK DORMANT IDLE CONSTАТÉ : ${art.ref}`,
        message: `Le stock d'articles accumulés (${art.quantity} unités) n'a subi aucun flux depuis plus de 45 jours. Envisagez un transfert vers d'autres dépôts pour libérer l'espace.`,
        sku: art.ref,
        designation: art.designation,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });
    }

    // 4. Inconsistent Flow Patterns Detection (double transfers or self-cancelling movements within short window)
    const flows = recentFlowLogs[art.id] || [];
    if (flows.length >= 2) {
      for (let i = 1; i < flows.length; i++) {
        const current = flows[i];
        const prev = flows[i - 1];
        const timeDiffMins = (current.date - prev.date) / (60 * 1000);

        // Inconsistency rule: same quantity added then subtracted within 15 minutes
        if (timeDiffMins <= 15 && current.qty === prev.qty) {
          const oppositeTypes = 
            ((current.type === 'ENTREE' || current.type === 'RETOUR') && (prev.type === 'SORTIE')) ||
            ((prev.type === 'ENTREE' || prev.type === 'RETOUR') && (current.type === 'SORTIE'));

          if (oppositeTypes) {
            alerts.push({
              id: `alert-incoherent-${art.id}-${i}`,
              type: 'INCOHERENT_FLOW',
              title: `MOUVEMENTS EN ANNULATION RAPIDE : ${art.ref}`,
              message: `Mouvements hautement contradictoires de ${current.qty} unités exécutés à moins de 15 minutes d'écart (possible correction d'urgence ou transfert fantôme).`,
              sku: art.ref,
              designation: art.designation,
              severity: 'WARNING',
              timestamp: new Date().toISOString()
            });
            break; // Stop duplicate alert creation for same SKU
          }
        }
      }
    }
  });

  return { predictions, alerts };
}
