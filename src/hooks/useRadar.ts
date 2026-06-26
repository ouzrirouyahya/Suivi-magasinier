import { useState, useCallback, useMemo } from 'react';
import { useInventory } from './useInventory';
import { RadarAnalyzer, RadarReport, RadarAnomaly } from '../core/radarAnalyzer';
import { SiteCode } from '../types';
import { toast } from 'sonner';

export function useRadar() {
  const { mouvements, articles, maintenanceLogs } = useInventory();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentReport, setCurrentReport] = useState<RadarReport | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteCode | 'GLOBAL'>('GLOBAL');
  
  const [ignoredAnomalies, setIgnoredAnomalies] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('radar_ignored');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  const activeAnomalies = useMemo(() => {
    if (!currentReport) return [];
    return currentReport.anomalies.filter(a => !ignoredAnomalies.has(a.id));
  }, [currentReport, ignoredAnomalies]);
  
  const runAnalysis = useCallback((site: SiteCode | 'GLOBAL') => {
    setIsAnalyzing(true);
    setSelectedSite(site);
    
    // Simulation de traitement (pour l'UX)
    setTimeout(() => {
      const report = RadarAnalyzer.generateReport(
        site,
        mouvements || [],
        articles || [],
        maintenanceLogs || []
      );
      
      setCurrentReport(report);
      setIsAnalyzing(false);
      
      const criticalCount = report.summary.criticalCount;
      if (criticalCount > 0) {
        toast.warning(`🚨 ${criticalCount} anomalie(s) critique(s) détectée(s) !`);
      } else {
        toast.success('✅ Analyse terminée. Aucune anomalie critique.');
      }
    }, 1500); // 1.5s pour l'effet "analyse en cours"
  }, [mouvements, articles, maintenanceLogs]);
  
  const ignoreAnomaly = useCallback((id: string) => {
    setIgnoredAnomalies(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('radar_ignored', JSON.stringify([...next]));
      return next;
    });
    toast.info('Anomalie ignorée');
  }, []);
  
  const restoreAnomaly = useCallback((id: string) => {
    setIgnoredAnomalies(prev => {
      const next = new Set(prev);
      next.delete(id);
      localStorage.setItem('radar_ignored', JSON.stringify([...next]));
      return next;
    });
  }, []);
  
  const generatePDF = useCallback(async (report: RadarReport) => {
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
    doc.text(`Rapport RADAR - ${report.site}`, 20, 35);
    
    // Date
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date(report.generatedAt).toLocaleDateString('fr-FR')}`, 20, 50);
    
    // Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Résumé', 20, 65);
    
    const summaryData = [
      ['Total Anomalies', report.summary.totalAnomalies.toString()],
      ['Critiques', report.summary.criticalCount.toString()],
      ['Hautes', report.summary.highCount.toString()],
      ['Moyennes', report.summary.mediumCount.toString()],
      ['Faibles', report.summary.lowCount.toString()]
    ];
    
    autoTable(doc, {
      startY: 70,
      head: [['Métrique', 'Valeur']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55], textColor: 255 },
      styles: { fontSize: 11 }
    });
    
    // Anomalies table
    if (report.anomalies.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(16);
      doc.text('Détail des Anomalies', 20, finalY + 15);
      
      const anomalyData = report.anomalies.map(a => [
        a.type,
        a.severity,
        a.title,
        a.description,
        a.suggestedAction
      ]);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Type', 'Gravité', 'Titre', 'Description', 'Action']],
        body: anomalyData,
        theme: 'grid',
        headStyles: { fillColor: [212, 175, 55], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' }
        }
      });
    }
    
    // Recommendations
    const finalY2 = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(16);
    doc.text('Recommandations', 20, finalY2 + 15);
    
    report.recommendations.forEach((rec, i) => {
      doc.setFontSize(11);
      doc.text(`• ${rec}`, 20, finalY2 + 25 + (i * 8));
    });
    
    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('HYDROMINES - Système RADAR d\'Analyse Logistique', 20, 280);
    doc.text('Document confidentiel', pageWidth - 60, 280);
    
    doc.save(`RADAR_${report.site}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('📄 PDF généré avec succès !');
  }, []);
  
  return {
    isAnalyzing,
    currentReport,
    selectedSite,
    setSelectedSite,
    activeAnomalies,
    runAnalysis,
    ignoreAnomaly,
    restoreAnomaly,
    generatePDF,
    ignoredCount: ignoredAnomalies.size
  };
}
