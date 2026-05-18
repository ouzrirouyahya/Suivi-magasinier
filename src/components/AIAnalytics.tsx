import React, { useMemo, useCallback, memo } from 'react';
import { Brain, Sparkles, AlertTriangle, TrendingUp, History, PlayCircle, Loader2, CheckCircle, ShieldAlert, Package, Users, Activity, ShieldCheck, Fingerprint, FileText, Download, Calendar, Drill, FileDown } from 'lucide-react';
import { SiteCode, Article, Mouvement, AnomalyReport, AgentMaster } from '../types';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

// Services
import { aiService } from '../services/aiService';
import { reportService } from '../services/reportService';

// Subcomponents
import { ReportCenter } from './analytics/ReportCenter';
import { AuditDashboard } from './analytics/AuditDashboard';
import { AnomaliesView } from './analytics/AnomaliesView';

interface AIAnalyticsProps {
  site: SiteCode;
  articles: Article[];
  mouvements: Mouvement[];
  agents: AgentMaster[];
  initialTab?: 'DASHBOARD' | 'ANOMALIES' | 'PREDICTIONS' | 'FINANCIAL' | 'COMPLIANCE' | 'PROCUREMENT' | 'MECHANIC' | 'FRAUD' | 'REPORT_CENTER';
}

export const AIAnalytics = memo(({ site, articles, mouvements, agents, initialTab }: AIAnalyticsProps) => {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'DASHBOARD' | 'ANOMALIES' | 'PREDICTIONS' | 'FINANCIAL' | 'COMPLIANCE' | 'PROCUREMENT' | 'MECHANIC' | 'FRAUD' | 'REPORT_CENTER'>(initialTab || 'DASHBOARD');
  const [selectedReport, setSelectedReport] = React.useState<any>(null);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loadingReports, setLoadingReports] = React.useState(true);

  // States for analysis data
  const [anomalies, setAnomalies] = React.useState<AnomalyReport[]>([]);
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [financialLeaks, setFinancialLeaks] = React.useState<any[]>([]);
  const [healthScore, setHealthScore] = React.useState<number | null>(null);
  const [complianceIssues, setComplianceIssues] = React.useState<any[]>([]);
  const [procurementPlan, setProcurementPlan] = React.useState<any[]>([]);
  const [agentInsights, setAgentInsights] = React.useState<any[]>([]);
  const [fraudAudit, setFraudAudit] = React.useState<{ fraudScore: number, threats: any[] } | null>(null);
  
  React.useEffect(() => {
    fetchLatestReports();
  }, [site]);

  const fetchLatestReports = async () => {
    setLoadingReports(true);
    try {
      const fetchedReports = await reportService.getLatestReports(site);
      setReports(fetchedReports);
      if (fetchedReports.length > 0 && !selectedReport) {
        loadReportData(fetchedReports[0]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadReportData = useCallback((report: any) => {
    setSelectedReport(report);
    const data = report.data;
    if (data.anomalies) setAnomalies(data.anomalies);
    if (data.fraudScore !== undefined) setFraudAudit({ fraudScore: data.fraudScore, threats: data.threats || [] });
    if (data.healthScore) setHealthScore(data.healthScore);
    if (data.financialLeaks) setFinancialLeaks(data.financialLeaks);
    if (data.agentInsights) setAgentInsights(data.agentInsights);
    if (data.procurementPlan) setProcurementPlan(data.procurementPlan);
    if (data.complianceIssues) setComplianceIssues(data.complianceIssues);
    if (data.predictions) setPredictions(data.predictions);
  }, []);

  const runAnalysis = async (type: any) => {
    setAnalyzing(true);
    try {
      const siteMouvements = mouvements.filter(m => m.site === site).slice(0, 150); 
      const siteArticles = articles.filter(a => a.site === site);

      const promptType = type === 'FINANCIAL' ? 'FINANCIAL_REPORT' : 
                         type === 'PERFORATEURS' ? 'PERFORATEURS_PERFORMANCE' :
                         type === 'FRAUD' ? 'FRAUD_DETECTION' : type;

      const data = {
        articles: siteArticles.map(a => ({ id: a.id, designation: a.designation, qty: a.quantity, min: a.minStock, category: a.category, price: a.price })),
        mouvements: siteMouvements.map(m => ({ date: m.date, type: m.type, items: m.items, engin: m.engin, perforateur: m.perforateur, beneficiaire: m.beneficiaire, service: m.service, author: m.vendeur || 'unknown' })),
        agents: agents.map(ag => ({ id: ag.id, name: `${ag.firstname} ${ag.lastname}`, service: ag.service, matricule: ag.matricule }))
      };

      const result = await aiService.analyze(promptType, data);
      
      if (['FRAUD', 'FINANCIAL', 'ANOMALIES'].includes(type)) {
        await reportService.saveReport(site, type, result);
        fetchLatestReports();
      }

      if (type === 'ANOMALIES') setAnomalies(result.anomalies || []);
      else if (type === 'FINANCIAL') { setFinancialLeaks(result.financialLeaks || []); setHealthScore(result.healthScore || null); }
      else if (type === 'COMPLIANCE') setComplianceIssues(result.complianceIssues || []);
      else if (type === 'PROCUREMENT') setProcurementPlan(result.procurementPlan || []);
      else if (type === 'PERFORATEURS') setAgentInsights(result.agentInsights || []);
      else if (type === 'FRAUD') setFraudAudit(result);
      else setPredictions(result.predictions || []);

      toast.success('Analyse terminée avec succès');
      if (type !== 'DASHBOARD' && type !== 'REPORT_CENTER') setActiveTab(type);
    } catch (error: any) {
      toast.error(`Échec de l'analyse : ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('master-audit-report');
    if (!element) return;
    const loadingToast = toast.loading("Génération du Rapport d'Audit...");
    try {
      element.style.display = 'block';
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false } as any);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HYDROMINES_AUDIT_${site}.pdf`);
      toast.dismiss(loadingToast);
      toast.success("Rapport téléchargé");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Échec de l'export PDF");
    } finally {
      element.style.display = 'none';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-950 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <Brain className="w-16 h-16 text-sky-500" /> Centre IA Audit
          </h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-4 opacity-70">
            Surveillance Neuronale & Dépistage de Fraude
          </p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          {[
            { id: 'DASHBOARD', label: 'Surveillance', icon: Activity },
            { id: 'ANOMALIES', label: 'Anomalies', icon: AlertTriangle },
            { id: 'FRAUD', label: 'FBI Mode', icon: ShieldAlert },
            { id: 'REPORT_CENTER', label: 'Archives', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                activeTab === tab.id ? "bg-white text-sky-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="pt-4">
        {activeTab === 'DASHBOARD' && (
          <AuditDashboard 
            analyzing={analyzing} 
            onRun={runAnalysis} 
            onDownload={handleDownloadPDF} 
            healthScore={healthScore} 
            fraudScore={fraudAudit?.fraudScore || null} 
            anomaliesCount={anomalies.length}
          />
        )}

        {activeTab === 'ANOMALIES' && (
          <AnomaliesView anomalies={anomalies} analyzing={analyzing} />
        )}

        {activeTab === 'REPORT_CENTER' && (
          <ReportCenter 
            reports={reports} 
            loading={loadingReports} 
            selectedReport={selectedReport} 
            onSelect={loadReportData} 
            onDownload={handleDownloadPDF} 
          />
        )}

        {activeTab === 'FRAUD' && (
          <div className="space-y-8 animate-in zoom-in duration-500">
             {!fraudAudit ? (
               <div className="card p-32 text-center bg-rose-50 border-rose-100 flex flex-col items-center">
                  <ShieldAlert className="w-20 h-20 text-rose-500 mb-6 animate-pulse" />
                  <h3 className="text-3xl font-black text-slate-950 uppercase">Audit de Fraude requis</h3>
                  <button 
                    disabled={analyzing}
                    onClick={() => runAnalysis('FRAUD')} 
                    className="mt-8 btn bg-rose-600 text-white px-12 h-14 rounded-xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                  >
                    {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Scanner les Menaces"}
                  </button>
               </div>
             ) : (
                <div className="grid grid-cols-1 gap-6">
                   {fraudAudit.threats.map((threat, idx) => (
                     <div key={idx} className="card p-8 bg-white border-l-8 border-rose-600 shadow-2xl flex items-center gap-8 group hover:border-rose-400 transition-all">
                        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                           <Fingerprint className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-2">
                             <span className="text-[10px] font-black bg-rose-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">{threat.type}</span>
                             <span className="text-xs font-black text-slate-400">Utilisateur: {threat.userConcerned}</span>
                           </div>
                           <h4 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">{threat.logic}</h4>
                           <p className="text-sm font-bold text-slate-500 italic">Preuve: {threat.evidence}</p>
                        </div>
                     </div>
                   ))}
                </div>
             )}
          </div>
        )}
      </div>

      {/* Hidden Export Template */}
      <div id="master-audit-report" style={{ display: 'none', padding: '40px', background: 'white', width: '800px' }}>
         <div style={{ borderBottom: '5px solid #0ea5e9', paddingBottom: '20px', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>Rapport d'Audit Hydromines</h1>
            <p style={{ fontWeight: 'bold', color: '#64748b' }}>Site: {site} | Date: {new Date().toLocaleDateString()}</p>
         </div>
         {selectedReport?.data && (
           <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '10px', color: '#334155' }}>
             {JSON.stringify(selectedReport.data, null, 2)}
           </div>
         )}
      </div>
    </div>
  );
});
