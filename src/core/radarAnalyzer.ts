import { Mouvement, Article, MaintenanceLog, SiteCode } from '../types';

export interface RadarAnomaly {
  id: string;
  type: 'CONSOMMATION_ANORMALE' | 'COMPORTEMENT_MECANICIEN' | 'PATTERN_SORTIE' | 
        'STOCK_CRITIQUE' | 'OBSOLESCENCE' | 'SURSTOCKAGE' | 'PREDICTION_RUPTURE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  entityId: string;
  entityName: string;
  metric: string;
  threshold: string;
  suggestedAction: string;
  confidence: number; // 0-100
  site: SiteCode;
  detectedAt: string;
}

export interface RadarReport {
  site: SiteCode | 'GLOBAL';
  generatedAt: string;
  anomalies: RadarAnomaly[];
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    topIssues: string[];
  };
  recommendations: string[];
}

export class RadarAnalyzer {
  // 1. CONSOMMATION ANORMALE PAR ENGIN
  static detectAbnormalConsumption(
    movements: Mouvement[],
    articles: Article[],
    days: number = 30
  ): RadarAnomaly[] {
    const anomalies: RadarAnomaly[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Grouper par engin + pièce
    const enginPieceMap = new Map<string, Mouvement[]>();
    
    movements
      .filter(m => m.type === 'SORTIE' && m.engin && new Date(m.date as any) >= cutoffDate)
      .forEach(m => {
        m.items.forEach(item => {
          const key = `${m.engin}_${item.articleId}`;
          if (!enginPieceMap.has(key)) enginPieceMap.set(key, []);
          enginPieceMap.get(key)!.push(m);
        });
      });
    
    // Détecter les surconsommations
    enginPieceMap.forEach((mouvements, key) => {
      if (mouvements.length >= 2) {
        const [engin, articleId] = key.split('_');
        const article = articles.find(a => a.id === articleId);
        const dates = mouvements.map(m => new Date(m.date as any)).sort((a, b) => a.getTime() - b.getTime());
        
        // Vérifier si 2+ mouvements en moins de 15 jours
        for (let i = 1; i < dates.length; i++) {
          const diffDays = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 15) {
            anomalies.push({
              id: `anom_cons_${key}_${i}`,
              type: 'CONSOMMATION_ANORMALE',
              severity: 'CRITICAL',
              title: `Surconsommation: ${engin}`,
              description: `${engin} a consommé ${article?.designation || articleId} ${mouvements.length} fois en ${Math.round(diffDays)} jours`,
              entityId: engin,
              entityName: engin,
              metric: `${mouvements.length} pièces / ${Math.round(diffDays)} jours`,
              threshold: '1 pièce / 30 jours',
              suggestedAction: `Vérifier l'état de ${engin}. Possible fuite ou usure prématurée.`,
              confidence: 85 + Math.min(mouvements.length * 5, 15),
              site: mouvements[0].site,
              detectedAt: new Date().toISOString()
            });
            break; // Une seule alerte par engin/pièce
          }
        }
      }
    });
    
    return anomalies;
  }
  
  // 2. COMPORTEMENT MECANICIEN SUSPECT
  static detectMechanicBehavior(
    movements: Mouvement[],
    articles: Article[],
    days: number = 30
  ): RadarAnomaly[] {
    const anomalies: RadarAnomaly[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Grouper par mécanicien + pièce
    const mecanoPieceMap = new Map<string, Mouvement[]>();
    
    movements
      .filter(m => m.type === 'SORTIE' && m.mecanicien && new Date(m.date as any) >= cutoffDate)
      .forEach(m => {
        m.items.forEach(item => {
          const key = `${m.mecanicien}_${item.articleId}`;
          if (!mecanoPieceMap.has(key)) mecanoPieceMap.set(key, []);
          mecanoPieceMap.get(key)!.push(m);
        });
      });
    
    mecanoPieceMap.forEach((mouvements, key) => {
      if (mouvements.length >= 3) {
        const [mecanicien, articleId] = key.split('_');
        const article = articles.find(a => a.id === articleId);
        
        anomalies.push({
          id: `anom_mec_${key}`,
          type: 'COMPORTEMENT_MECANICIEN',
          severity: mouvements.length >= 5 ? 'CRITICAL' : 'HIGH',
          title: `Mécanicien: ${mecanicien}`,
          description: `${mecanicien} a pris ${article?.designation || articleId} ${mouvements.length} fois ce mois`,
          entityId: mecanicien,
          entityName: mecanicien,
          metric: `${mouvements.length} prises / 30 jours`,
          threshold: '2 prises / 30 jours',
          suggestedAction: mouvements.length >= 5 
            ? `Retours fréquents possibles. Vérifier la qualité des montages de ${mecanicien}.`
            : `Surveiller la consommation de ${mecanicien} sur cette pièce.`,
          confidence: 70 + Math.min(mouvements.length * 5, 25),
          site: mouvements[0].site,
          detectedAt: new Date().toISOString()
        });
      }
    });
    
    return anomalies;
  }
  
  // 3. PATTERN DE SORTIE (Vampirisme)
  static detectVampirisme(
    movements: Mouvement[],
    days: number = 30
  ): RadarAnomaly[] {
    const anomalies: RadarAnomaly[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Sorties de 1 unité répétées
    const smallMoves = movements.filter(
      m => m.type === 'SORTIE' && 
           new Date(m.date as any) >= cutoffDate &&
           m.items.some(i => i.quantity === 1)
    );
    
    const articleCount = new Map<string, number>();
    smallMoves.forEach(m => {
      m.items.forEach(item => {
        if (item.quantity === 1) {
          articleCount.set(item.articleId, (articleCount.get(item.articleId) || 0) + 1);
        }
      });
    });
    
    articleCount.forEach((count, articleId) => {
      if (count >= 5) {
        const anomalySite = smallMoves[0]?.site;
        if (!anomalySite) {
          console.warn('[RadarAnalyzer] Anomalie ignorée : site inconnu');
        } else {
          anomalies.push({
            id: `anom_vamp_${articleId}`,
            type: 'PATTERN_SORTIE',
            severity: 'HIGH',
            title: 'Pattern suspect de sorties',
            description: `${count} sorties de 1 unité détectées sur cette pièce`,
            entityId: articleId,
            entityName: articleId,
            metric: `${count} sorties unitaires`,
            threshold: '5 sorties unitaires / 30 jours',
            suggestedAction: 'Vérifier les bénéficiaires. Possible vampirisme de stock.',
            confidence: 75,
            site: anomalySite,
            detectedAt: new Date().toISOString()
          });
        }
      }
    });
    
    return anomalies;
  }
  
  // 4. STOCK CRITIQUE
  static detectCriticalStock(articles: Article[]): RadarAnomaly[] {
    return articles
      .filter(a => a.quantity <= a.minStock * 0.5 && a.quantity > 0)
      .map(a => ({
        id: `anom_stock_${a.id}`,
        type: 'STOCK_CRITIQUE',
        severity: 'HIGH',
        title: `Stock critique: ${a.designation}`,
        description: `${a.designation} est à ${a.quantity} ${a.unit} (seuil: ${a.minStock})`,
        entityId: a.id,
        entityName: a.designation,
        metric: `${a.quantity} ${a.unit}`,
        threshold: `${a.minStock} ${a.unit}`,
        suggestedAction: `Commander ${a.minStock * 2 - a.quantity} ${a.unit} d'urgence.`,
        confidence: 90,
        site: a.site,
        detectedAt: new Date().toISOString()
      }));
  }
  
  // 5. OBSOLESCENCE
  static detectObsolescence(
    articles: Article[],
    movements: Mouvement[],
    months: number = 6
  ): RadarAnomaly[] {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    return articles
      .filter(a => {
        const lastMove = movements
          .filter(m => m.items.some(i => i.articleId === a.id))
          .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())[0];
        return !lastMove || new Date(lastMove.date as any) < cutoffDate;
      })
      .map(a => ({
        id: `anom_obs_${a.id}`,
        type: 'OBSOLESCENCE',
        severity: 'MEDIUM',
        title: `Obsolescence: ${a.designation}`,
        description: `${a.designation} n'a pas bougé depuis ${months} mois`,
        entityId: a.id,
        entityName: a.designation,
        metric: '0 mouvement',
        threshold: '1 mouvement / 6 mois',
        suggestedAction: 'Vérifier si cette pièce est encore utilisée. Sinon, transférer ou vendre.',
        confidence: 80,
        site: a.site,
        detectedAt: new Date().toISOString()
      }));
  }
  
  // 6. GENERATE FULL REPORT
  static generateReport(
    site: SiteCode | 'GLOBAL',
    movements: Mouvement[],
    articles: Article[],
    maintenanceLogs: MaintenanceLog[]
  ): RadarReport {
    const allAnomalies = [
      ...this.detectAbnormalConsumption(movements, articles),
      ...this.detectMechanicBehavior(movements, articles),
      ...this.detectVampirisme(movements),
      ...this.detectCriticalStock(articles),
      ...this.detectObsolescence(articles, movements)
    ];
    
    // Filtrer par site si nécessaire
    const filteredAnomalies = site === 'GLOBAL' 
      ? allAnomalies 
      : allAnomalies.filter(a => a.site === site);
    
    const criticalCount = filteredAnomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount = filteredAnomalies.filter(a => a.severity === 'HIGH').length;
    const mediumCount = filteredAnomalies.filter(a => a.severity === 'MEDIUM').length;
    const lowCount = filteredAnomalies.filter(a => a.severity === 'LOW').length;
    
    return {
      site,
      generatedAt: new Date().toISOString(),
      anomalies: filteredAnomalies,
      summary: {
        totalAnomalies: filteredAnomalies.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        topIssues: filteredAnomalies
          .filter(a => a.severity === 'CRITICAL')
          .slice(0, 3)
          .map(a => a.title)
      },
      recommendations: this.generateRecommendations(filteredAnomalies)
    };
  }
  
  private static generateRecommendations(anomalies: RadarAnomaly[]): string[] {
    const recs: string[] = [];
    if (anomalies.some(a => a.type === 'CONSOMMATION_ANORMALE')) {
      recs.push('Vérifier l\'état des engins à surconsommation. Possible fuite hydraulique ou usure prématurée.');
    }
    if (anomalies.some(a => a.type === 'COMPORTEMENT_MECANICIEN')) {
      recs.push('Auditer les mécaniciens à comportement répétitif. Vérifier la qualité des montages.');
    }
    if (anomalies.some(a => a.type === 'STOCK_CRITIQUE')) {
      recs.push('Lancer une commande d\'urgence pour les articles sous seuil critique.');
    }
    if (anomalies.some(a => a.type === 'OBSOLESCENCE')) {
      recs.push('Réviser le catalogue des articles sans rotation. Envisager des transferts inter-sites.');
    }
    return recs;
  }
}
