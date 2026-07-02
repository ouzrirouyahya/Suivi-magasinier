import { SiteCode } from '../types';
import { RadarReport } from './radarAnalyzer';
import { toast } from 'sonner';

export interface SiteMetrics {
  site: SiteCode;
  enginCount: number;
  perforateurCount: number;
  totalStockValue: number;
  totalArticles: number;
  criticalAlerts: number;
  totalMovements30d: number;
  totalSorties30d: number;
  totalEntrees30d: number;
  maintenanceCost30d: number;
  consumptionPerEngin: number;
  maintenanceCostPerEngin: number;
  stockValuePerEngin: number;
  anomalyScore: number; // 0-100
  efficiencyRank: number; // 1-5
}

export class SiteComparator {
  static compareSites(
    reports: RadarReport[],
    articles: any[] = [],
    movements: any[] = [],
    engins: any[] = [],
    perfos: any[] = []
  ): SiteMetrics[] {
    const validSites: SiteCode[] = ['SMI', 'OUMEJRANE', 'BOU-AZZER', 'OUANSIMI', 'KOUDIA'];
    
    const metrics = validSites.map(site => {
      const report = reports.find(r => r.site === site);
      
      const enginCount = engins.filter(e =>
        e.site === site && e.status !== 'REFORME' && e.status !== 'VENDU'
      ).length || 1;
      
      const perforateurCount = perfos.filter(p =>
        p.site === site && p.status !== 'REFORME' && p.status !== 'VENDU'
      ).length || 1;
      
      // Calculate from live articles if available, otherwise fallback to reports anomalies
      const siteArticles = articles.filter(a => a.site === site);
      const totalArticles = siteArticles.length;
      
      let totalStockValue = siteArticles.reduce((sum, a) => sum + ((a.quantity || 0) * (a.price || 0)), 0);
      if (totalStockValue === 0 && report) {
        // fallback
        totalStockValue = report.anomalies
          .filter(a => a.type === 'STOCK_CRITIQUE')
          .reduce((sum, a) => sum + (parseFloat(a.metric) || 0), 0);
      }
      
      // Calculate live movements if available
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const siteMovements30d = movements.filter(m => m.site === site && new Date(m.date) >= thirtyDaysAgo);
      const totalMovements30d = siteMovements30d.length;
      
      const totalSorties30d = siteMovements30d.filter(m => m.type === 'SORTIE').length;
      const totalEntrees30d = siteMovements30d.filter(m => m.type === 'ENTREE').length;
      
      let maintenanceCost30d = siteMovements30d
        .filter(m => m.type === 'SORTIE')
        .reduce((sum, m) => {
          const mVal = m.items?.reduce((iSum: number, item: any) => {
            const artPrice = item.price || articles.find(a => a.id === item.articleId)?.price || 0;
            return iSum + ((item.quantity || 0) * artPrice);
          }, 0) || 0;
          return sum + mVal;
        }, 0);
        
      if (maintenanceCost30d === 0 && report) {
        // fallback
        maintenanceCost30d = report.anomalies
          .filter(a => a.type === 'CONSOMMATION_ANORMALE')
          .reduce((sum, a) => sum + (parseFloat(a.metric) || 0), 0);
      }
      
      const criticalAlerts = report ? report.summary.criticalCount : 0;
      
      // Normaliser par nombre d'engins
      const consumptionPerEngin = totalSorties30d / (enginCount || 1);
      const maintenanceCostPerEngin = maintenanceCost30d / (enginCount || 1);
      const stockValuePerEngin = totalStockValue / (enginCount || 1);
      
      // Score d'anomalie (0-100)
      const anomalyScore = Math.min(
        (criticalAlerts * 20) + 
        ((report ? report.summary.highCount : 0) * 10) + 
        ((report ? report.summary.mediumCount : 0) * 5),
        100
      );
      
      return {
        site,
        enginCount,
        perforateurCount,
        totalStockValue,
        totalArticles: totalArticles || (report ? report.summary.totalAnomalies : 0),
        criticalAlerts,
        totalMovements30d,
        totalSorties30d,
        totalEntrees30d,
        maintenanceCost30d,
        consumptionPerEngin,
        maintenanceCostPerEngin,
        stockValuePerEngin,
        anomalyScore,
        efficiencyRank: 0
      };
    });
    
    // Sort anomaly score: lowest score is rank 1 (most efficient/least anomalies), highest is rank 5
    const sorted = [...metrics].sort((a, b) => a.anomalyScore - b.anomalyScore);
    sorted.forEach((m, i) => {
      const original = metrics.find(x => x.site === m.site);
      if (original) original.efficiencyRank = i + 1;
    });
    
    return metrics;
  }
  
  static getEnginCount(site: SiteCode): number {
    const config: Record<SiteCode, number> = {
      'SMI': 6,
      'OUMEJRANE': 2,
      'BOU-AZZER': 4,
      'OUANSIMI': 3,
      'KOUDIA': 2,
      'ALL': 17
    } as any;
    return config[site] || 1;
  }
  
  static getPerforateurCount(site: SiteCode): number {
    const config: Record<SiteCode, number> = {
      'SMI': 4,
      'OUMEJRANE': 1,
      'BOU-AZZER': 2,
      'OUANSIMI': 2,
      'KOUDIA': 1,
      'ALL': 10
    } as any;
    return config[site] || 1;
  }
  
  static async generateComparisonPDF(metrics: SiteMetrics[]): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(212, 175, 55); // Gold
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('HYDROMINES', 20, 25);
    doc.setFontSize(14);
    doc.text('Rapport Comparatif Inter-Chantiers', 20, 35);
    
    // Date
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 50);
    
    // Summary table data
    const tableData = metrics.map(m => [
      m.site,
      `#${m.efficiencyRank}`,
      `${m.enginCount} Engins / ${m.perforateurCount} Perfos`,
      `${m.totalArticles} Articles`,
      `${m.totalStockValue.toLocaleString('fr-FR')} MAD`,
      `${m.totalMovements30d} Movs`,
      `${m.consumptionPerEngin.toFixed(1)}`,
      `${m.maintenanceCostPerEngin.toLocaleString('fr-FR')} MAD`,
      `${m.anomalyScore}/100`
    ]);
    
    autoTable(doc, {
      startY: 60,
      head: [[
        'Site', 
        'Rang', 
        'Équipements', 
        'Articles', 
        'Valeur Stock', 
        'Mouvements (30j)', 
        'Conso/Engin', 
        'Coût Maint/Engin', 
        'Score Anomalie'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'bold' }
      }
    });
    
    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    
    doc.text('HYDROMINES - Système d\'Analyse Multi-Sites Normalisée', 20, 280);
    doc.text('Document confidentiel', pageWidth - 60, 280);
    
    doc.save(`COMPARATIF_SITES_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('📄 PDF Comparatif généré avec succès !');
  }
}
