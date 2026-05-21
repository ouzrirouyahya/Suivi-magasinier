/**
 * HYDROMINES INDUSTRIAL INTEGRITY & ANOMALY ENGINE v8.0
 * Module: Predictive & Behavioural Anomaly Detection Core
 * File: /src/core/anomalyEngine.ts
 */

import { Article, Mouvement } from '../types';

export interface SKUAnomalyScore {
  articleId: string;
  ref: string;
  designation: string;
  stabilityIndex: number; // 0 to 100 (high = safe/stable)
  criticalityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  consumptionTrend: 'STABLE' | 'UPWARD_SPIKE' | 'DOWN_TREND' | 'VOLATILE';
  probabilityOfRupturePct: number; // 0 to 100%
  anomalyHistoryCount: number;
  unusualSpikeDetected: boolean;
  frequencyScore: number; // daily access rate
  operatorAnomalies: string[];
}

/**
 * Calculates a dynamic, multi-factor risk profile and behavior scoring for each catalog item
 */
export function analyseOperationalAnomalies(
  articles: Article[],
  movements: Mouvement[],
): Record<string, SKUAnomalyScore> {
  const result: Record<string, SKUAnomalyScore> = {};

  // Sort movements historically to trace operator frequencies
  const sortedMovements = [...movements].sort((a, b) => {
    const timeA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date?.seconds * 1000 || 0;
    const timeB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date?.seconds * 1000 || 0;
    return timeA - timeB;
  });

  // Keep track of access counts per article
  const articleAccessTimeline: Record<string, number[]> = {};
  const articleQuantitiesTimeline: Record<string, number[]> = {};
  const operatorPatterns: Record<string, string[]> = {};

  sortedMovements.forEach((m) => {
    const time = typeof m.date === 'string' ? new Date(m.date).getTime() : m.date?.seconds * 1000 || 0;
    const operator = m.demandeur || m.mecanicien || m.foreur || m.beneficiaire || 'Opérateur inconnu';

    m.items.forEach((item) => {
      if (!articleAccessTimeline[item.articleId]) {
        articleAccessTimeline[item.articleId] = [];
      }
      articleAccessTimeline[item.articleId].push(time);

      if (!articleQuantitiesTimeline[item.articleId]) {
        articleQuantitiesTimeline[item.articleId] = [];
      }
      // Record magnitude of modification (positive for adds, negative for subctions)
      const magnitude = m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR' 
        ? item.quantity 
        : -item.quantity;
      articleQuantitiesTimeline[item.articleId].push(magnitude);

      if (!operatorPatterns[item.articleId]) {
        operatorPatterns[item.articleId] = [];
      }
      operatorPatterns[item.articleId].push(operator);
    });
  });

  // Now perform comprehensive analysis for each Article
  articles.forEach((art) => {
    const times = articleAccessTimeline[art.id] || [];
    const magnitudes = articleQuantitiesTimeline[art.id] || [];
    const operators = operatorPatterns[art.id] || [];

    // Calculate consumption frequency (daily access rate)
    const accessCount = times.length;
    let frequencyScore = 0;
    if (accessCount > 1) {
      const timespanDays = Math.max(1, (times[times.length - 1] - times[0]) / (86400 * 1000));
      frequencyScore = parseFloat((accessCount / timespanDays).toFixed(2));
    }

    // Unusual Spike Detection (statistical outlier detection based on transaction standard derivation)
    let averageQuantityTraded = 0;
    let maxQuantityTraded = 0;
    let unusualSpikeDetected = false;
    const absMagnitudes = magnitudes.map(Math.abs);

    if (absMagnitudes.length > 0) {
      averageQuantityTraded = absMagnitudes.reduce((acc, v) => acc + v, 0) / absMagnitudes.length;
      maxQuantityTraded = Math.max(...absMagnitudes);
      // If biggest tx is more than 3x the average of this item's tx or exceeds item's baseline min stock
      if (maxQuantityTraded > averageQuantityTraded * 3.5 && maxQuantityTraded > 15) {
        unusualSpikeDetected = true;
      }
    }

    // Determine Consumption Trend
    let trend: SKUAnomalyScore['consumptionTrend'] = 'STABLE';
    if (magnitudes.length > 2) {
      const recentMags = magnitudes.slice(-3);
      const totalRecent = recentMags.reduce((a, b) => a + b, 0);
      if (totalRecent < -20) {
        trend = 'DOWN_TREND';
      } else if (unusualSpikeDetected && totalRecent > 40) {
        trend = 'UPWARD_SPIKE';
      } else if (Math.max(...absMagnitudes) - Math.min(...absMagnitudes) > 30) {
        trend = 'VOLATILE';
      }
    }

    // Calculate dynamic risk indices based on local buffers
    let stabilityIndex = 100;
    let anomalyHistoryCount = 0;
    const operatorAnomalies: string[] = [];

    // Factoring stability penalties
    if (art.quantity < 0) {
      stabilityIndex -= 50;
      anomalyHistoryCount++;
    }
    if (art.quantity <= art.minStock) {
      stabilityIndex -= 30; // Under safety thresholds
    }
    if (unusualSpikeDetected) {
      stabilityIndex -= 15;
    }
    if (trend === 'VOLATILE') {
      stabilityIndex -= 10;
    }

    // Detect Operator inconsistencies (e.g. same operator performing rapid additions and subtractions of the same component)
    if (operators.length > 2) {
      // Check for rapid alternating transactions
      let alternations = 0;
      for (let i = 1; i < magnitudes.length; i++) {
        if ((magnitudes[i] > 0 && magnitudes[i - 1] < 0) || (magnitudes[i] < 0 && magnitudes[i - 1] > 0)) {
          alternations++;
        }
      }
      if (alternations >= 3) {
        operatorAnomalies.push("Alternance suspecte d'ajustements physiques par l'opérateur (Dépistage d'erreurs/vol)");
        stabilityIndex -= 15;
        anomalyHistoryCount++;
      }
    }

    stabilityIndex = Math.max(10, stabilityIndex);

    // Calculate Stockout Probability
    let probabilityOfRupturePct = 0;
    if (art.quantity === 0) {
      probabilityOfRupturePct = 100;
    } else if (art.quantity < art.minStock) {
      // Closer it is to 0, higher the risk
      probabilityOfRupturePct = Math.round(90 - (art.quantity / art.minStock) * 40);
    } else if (trend === 'DOWN_TREND' && frequencyScore > 0.5) {
      probabilityOfRupturePct = 40;
    }

    probabilityOfRupturePct = Math.min(100, Math.max(0, probabilityOfRupturePct));

    // Determine final Industrial critical priority
    let criticalityLevel: SKUAnomalyScore['criticalityLevel'] = 'LOW';
    if (probabilityOfRupturePct > 80 || art.quantity < 0) {
      criticalityLevel = 'CRITICAL';
    } else if (probabilityOfRupturePct > 50 || stabilityIndex < 50) {
      criticalityLevel = 'HIGH';
    } else if (probabilityOfRupturePct > 20 || stabilityIndex < 85) {
      criticalityLevel = 'MEDIUM';
    }

    result[art.id] = {
      articleId: art.id,
      ref: art.ref,
      designation: art.designation,
      stabilityIndex,
      criticalityLevel,
      consumptionTrend: trend,
      probabilityOfRupturePct,
      anomalyHistoryCount,
      unusualSpikeDetected,
      frequencyScore,
      operatorAnomalies,
    };
  });

  return result;
}
