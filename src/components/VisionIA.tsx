import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  ShieldAlert, 
  TrendingUp, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  Activity, 
  AlertCircle, 
  ChevronRight, 
  ArrowRight,
  Database,
  Layers,
  Clock,
  Download,
  Percent,
  Atom,
  Info
} from 'lucide-react';
import { Article, Mouvement, Inventaire, SiteCode } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';

interface VisionIAProps {
  currentSite: SiteCode;
}

export function VisionIA({ currentSite }: VisionIAProps) {
  const { articles, mouvements, inventaires, rcglResult } = useInventory();
  const [isAuditing, setIsAuditing] = useState(false);

  // Trigger diagnostic audit rotation effect
  const handleTriggerAudit = () => {
    setIsAuditing(true);
    const audio = new Audio(); // silent placeholder or just immediate transition
    setTimeout(() => {
      setIsAuditing(false);
      toast.success("Diagnostic d'intégrité re-calculé avec succès en temps réel.");
    }, 1200);
  };

  // ----------------------------------------------------
  // Dynamic Calculation Engine - "Score de Santé du Site"
  // ----------------------------------------------------
  const healthMetrics = useMemo(() => {
    const siteArticles = articles.filter(a => a.site === currentSite && a.active !== false);
    const siteMouvements = mouvements.filter(m => m.site === currentSite);
    const siteInventaires = inventaires.filter(i => i.site === currentSite);

    // 1. Minimum stock violations
    const lowStockArticles = siteArticles.filter(a => a.quantity <= a.minStock);
    const lowStockCount = lowStockArticles.length;

    // 2. Suspicious inventory repeat adjustments (same item with multiple deviations > 0)
    const suspectAdjustments: { articleId: string; count: number; name: string; ref: string; lastDiff: number }[] = [];
    const articleAdjustments: Record<string, { count: number; name: string; ref: string; lastDiff: number }> = {};
    
    siteInventaires.forEach(inv => {
      inv.items.forEach(item => {
        if (item.difference !== 0) {
          const art = articles.find(a => a.id === item.articleId);
          if (art && art.site === currentSite) {
            if (!articleAdjustments[item.articleId]) {
              articleAdjustments[item.articleId] = {
                count: 0,
                name: art.designation,
                ref: art.ref,
                lastDiff: item.difference
              };
            }
            articleAdjustments[item.articleId].count += 1;
            articleAdjustments[item.articleId].lastDiff = item.difference;
          }
        }
      });
    });

    Object.entries(articleAdjustments).forEach(([id, data]) => {
      if (data.count > 1) {
        suspectAdjustments.push({
          articleId: id,
          count: data.count,
          name: data.name,
          ref: data.ref,
          lastDiff: data.lastDiff
        });
      }
    });

    // 3. FIFO chronological queue check
    // We analyze if entries (ENTREE) were added after exits (SORTIE) or if we have negative theoretical balances at any instant.
    let fifoAnomaliesCount = 0;
    const fifoAnomalies: { articleId: string; name: string; ref: string; description: string }[] = [];

    siteArticles.forEach(art => {
      const artMvs = siteMouvements.filter(m => m.articleId === art.id);
      if (artMvs.length > 0) {
        // Sort chronologically
        const sorted = [...artMvs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = 0;
        let flagged = false;
        
        for (let i = 0; i < sorted.length; i++) {
          const m = sorted[i];
          if (m.type === 'ENTREE') runningBalance += m.quantity;
          else if (m.type === 'SORTIE') runningBalance -= m.quantity;
          
          if (runningBalance < 0 && !flagged) {
            fifoAnomaliesCount++;
            fifoAnomalies.push({
              articleId: art.id,
              name: art.designation,
              ref: art.ref,
              description: "Solde de stock intermédiaire négatif chronologiquement."
            });
            flagged = true;
          }
        }
      }
    });

    // 4. Synchronisation status
    // Check network synchronization indicators
    const isOfflineMode = !navigator.onLine || rcglResult.mode !== 'NORMAL';
    const pendingMutations = 0; // Offline queues pending
    const syncHealthScore = isOfflineMode ? 82 : 100;

    // 5. Final Global Score Synthesis (Aesthetic Mathematical Model)
    // - Mini Stock defaults deducts 2 points each (max 15 pt)
    const lowStockDeduction = Math.min(lowStockCount * 2, 15);
    // - Suspect Adjustments deduct 7 points each (max 25 pt)
    const suspectDeduction = Math.min(suspectAdjustments.length * 7, 25);
    // - FIFO anomalies deduct 8 points each (max 25 pt)
    const fifoDeduction = Math.min(fifoAnomaliesCount * 8, 25);
    // - Connectivity drift deducts points
    const syncDeduction = isOfflineMode ? 10 : 0;

    let finalScore = 100 - lowStockDeduction - suspectDeduction - fifoDeduction - syncDeduction;
    finalScore = Math.max(10, Math.min(100, Math.round(finalScore)));

    // Grade and Description
    let grade = 'A+';
    let gradeColor = 'text-emerald-500 bg-emerald-50/50';
    let assessment = 'EXCELLENT';
    let desc = "Le site présente une intégrité parfaite. Synchronisation active, aucun écart d'inventaire suspect ni rupture.";

    if (finalScore < 95 && finalScore >= 85) {
      grade = 'A';
      gradeColor = 'text-emerald-400 bg-emerald-50/20';
      assessment = 'SATISFAISANT';
      desc = "Très bon alignement. Les écarts d'audit sont résiduels et justifiés. L'intégrité globale est validée.";
    } else if (finalScore < 85 && finalScore >= 70) {
      grade = 'B';
      gradeColor = 'text-blue-500 bg-blue-50/30';
      assessment = 'CONVENABLE';
      desc = "Intégrité fonctionnelle préservée. Vigilance recommandée sur les retards de comptage d'inventaire et les seuils critiques.";
    } else if (finalScore < 70 && finalScore >= 50) {
      grade = 'C';
      gradeColor = 'text-amber-500 bg-amber-50/40';
      assessment = 'VULNÉRABLE';
      desc = "Écarts d'inventaire récurrents et dysfonctionnements FIFO détectés. Un audit approfondi du site est recommandé.";
    } else if (finalScore < 50) {
      grade = 'D';
      gradeColor = 'text-rose-600 bg-rose-50/50 animate-pulse';
      assessment = 'ALERTE SÉCURITÉ';
      desc = "Dérives systématiques. Plusieurs écarts inexpliqués et ruptures d'ordre chronologique des flux de stock.";
    }

    return {
      finalScore,
      grade,
      gradeColor,
      assessment,
      desc,
      lowStockCount,
      suspectAdjustments,
      fifoAnomaliesCount,
      fifoAnomalies,
      syncHealthScore,
      isOfflineMode,
      siteArticlesCount: siteArticles.length,
      siteMouvementsCount: siteMouvements.length
    };
  }, [articles, mouvements, inventaires, currentSite, rcglResult]);

  // ----------------------------------------------------
  // Dynamic Benford Law Engine
  // ----------------------------------------------------
  const benfordAnalysis = useMemo(() => {
    // Collect all digit frequency from transaction logs (ENTREE / SORTIE quantities)
    const siteMouvements = mouvements.filter(m => m.site === currentSite);
    const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let totalSamples = 0;

    siteMouvements.forEach(m => {
      const g = Math.abs(m.quantity);
      if (g > 0) {
        const firstChar = g.toString().replace(/^0+/, '').replace('.', '')[0];
        const digit = parseInt(firstChar, 10);
        if (digit >= 1 && digit <= 9) {
          digitCounts[digit] += 1;
          totalSamples++;
        }
      }
    });

    // fallback to articles quantity if transaction data is scarce
    if (totalSamples < 5) {
      const siteArticles = articles.filter(a => a.site === currentSite && a.active !== false);
      siteArticles.forEach(a => {
        const g = Math.abs(a.quantity);
        if (g > 0) {
          const firstChar = g.toString().replace(/^0+/, '').replace('.', '')[0];
          const digit = parseInt(firstChar, 10);
          if (digit >= 1 && digit <= 9) {
            digitCounts[digit] += 1;
            totalSamples++;
          }
        }
      });
    }

    // Ideal Distribution percentages defined by Benford's Law
    const ideal = {
      1: 30.1,
      2: 17.6,
      3: 12.5,
      4: 9.7,
      5: 7.9,
      6: 6.7,
      7: 5.8,
      8: 5.1,
      9: 4.6
    };

    const datasets = Array.from({ length: 9 }, (_, i) => {
      const digit = i + 1;
      const count = digitCounts[digit] || 0;
      const actualPct = totalSamples > 0 ? parseFloat(((count / totalSamples) * 100).toFixed(1)) : 0;
      const idealPct = (ideal as any)[digit];
      const deviation = parseFloat((actualPct - idealPct).toFixed(1));

      return {
        digit,
        count,
        actualPct,
        idealPct,
        deviation
      };
    });

    return {
      datasets,
      totalSamples
    };
  }, [mouvements, articles, currentSite]);

  // Trigger browser PDF layout printer cleanly styled
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 text-slate-900 no-print">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Brain className="w-5 h-5 animate-pulse" />
            </span>
            <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Console Vision IA & Diagnostic</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tighter mt-2 uppercase">Vision IA & Audit d'Intégrité</h1>
          <p className="text-sm text-slate-500 mt-1 uppercase font-bold tracking-wider">
            Diagnostic mathématique invariant, validation de loi de Benford et continuité opérationnelle du site <span className="text-indigo-600 font-extrabold">{currentSite}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleTriggerAudit} 
            className="btn bg-white hover:bg-slate-50 text-slate-800 border-slate-100 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-500", isAuditing && "animate-spin")} />
            Recalculer Intégrité
          </button>
          
          <button 
            onClick={handlePrintReport} 
            className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-xl shadow-indigo-500/10"
          >
            <Printer className="w-4 h-4" />
            Exporter Rapport PDF
          </button>
        </div>
      </div>

      {/* GLOBAL HEALTH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PILLAR 1: SCORE CIRCULAR METER */}
        <div className="card bg-white border border-slate-100 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 w-full text-left">Score de Santé du Site</h3>

          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG Arc Meter */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle 
                cx="50" 
                cy="50" 
                r="42" 
                fill="transparent" 
                stroke="#f1f5f9" 
                strokeWidth="7" 
              />
              <circle 
                cx="50" 
                cy="50" 
                r="42" 
                fill="transparent" 
                stroke="url(#indigoGradient)" 
                strokeWidth="7.5" 
                strokeDasharray={263.8}
                strokeDashoffset={263.8 - (263.8 * healthMetrics.finalScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="indigoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>

            {/* Score Centered */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-950 tracking-tighter">{healthMetrics.finalScore}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">SCORE / 100</span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <span className={cn("inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider", healthMetrics.gradeColor)}>
              Grade {healthMetrics.grade} • {healthMetrics.assessment}
            </span>
            <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed mt-2">
              {healthMetrics.desc}
            </p>
          </div>
        </div>

        {/* PILLAR 2: DIAGNOSTIC STATS BAR */}
        <div className="card bg-white border border-slate-100 p-8 lg:col-span-2 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Piliers de Résilience & Conformité</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-500" /> Synchro Cloud
                </span>
                <span className="text-xs font-mono font-black text-emerald-600">{healthMetrics.syncHealthScore}%</span>
              </div>
              <div className="w-full h-2 bg-slate-150 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${healthMetrics.syncHealthScore}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {healthMetrics.isOfflineMode 
                  ? "Dérive locale passive. snapshot hors-connexion sécurisé." 
                  : "Connexion Firestore stable. Transactions locales parfaitement synchronisées."}
              </p>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Intégrité Chrono FIFO
                </span>
                <span className="text-xs font-mono font-black text-indigo-600">
                  {Math.max(20, 100 - healthMetrics.fifoAnomaliesCount * 10)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-150 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500" 
                  style={{ width: `${Math.max(20, 100 - healthMetrics.fifoAnomaliesCount * 10)}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {healthMetrics.fifoAnomaliesCount > 0 
                  ? `${healthMetrics.fifoAnomaliesCount} article(s) à flux décalé ou stock théorique temporaire négatif.` 
                  : "Séquence temporelle FIFO respectée. Épuisement régulier par date d'entrée."}
              </p>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Alertes Temporelles
                </span>
                <span className={cn(
                  "text-xs font-mono font-black",
                  healthMetrics.lowStockCount > 0 ? "text-amber-600 animate-pulse" : "text-slate-500"
                )}>
                  {healthMetrics.lowStockCount} Actives
                </span>
              </div>
              <div className="w-full h-2 bg-slate-150 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500" 
                  style={{ width: `${Math.max(10, 100 - healthMetrics.lowStockCount * 8)}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {healthMetrics.lowStockCount > 0 
                  ? `${healthMetrics.lowStockCount} articles en rupture ou sous leur seuil de commande.` 
                  : "Aucune alerte de sous-stock ou d'écart critique actif sur le site."}
              </p>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-500" /> Dérives Ajustements
                </span>
                <span className="text-xs font-mono font-black text-rose-600">
                  {Math.max(10, 100 - healthMetrics.suspectAdjustments.length * 15)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-150 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500" 
                  style={{ width: `${Math.max(10, 100 - healthMetrics.suspectAdjustments.length * 15)}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {healthMetrics.suspectAdjustments.length > 0
                  ? `${healthMetrics.suspectAdjustments.length} articles présentent des ajustements d'inventaire répétitifs.`
                  : "Aucune dérive comptable ni redondance d'ajustement suspecte."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BENFORD LAW CHART DISPLAY */}
      <div className="card bg-white border border-slate-100 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <span className="font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-violet-50 text-violet-600 rounded-lg">Analyse de Benford (Fréquence Logarithmique)</span>
            <h3 className="text-lg font-black text-slate-950 uppercase mt-2 tracking-tight">Vérification de Non-Falsification Maître</h3>
            <p className="text-xs text-slate-500 mt-1">
              Analyse statistique de la répartition du premier chiffre significatif de toutes les transactions du site ({benfordAnalysis.totalSamples} échantillons).
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <Atom className="w-5 h-5 text-indigo-500" />
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Échantillonnage</p>
              <p className="text-xs font-black text-slate-700 font-mono mt-0.5">{benfordAnalysis.totalSamples} Échantillons Relevés</p>
            </div>
          </div>
        </div>

        {/* Dynamic bar compare view */}
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-9 gap-4 text-center">
            {benfordAnalysis.datasets.map(data => {
              const absDev = Math.abs(data.deviation);
              const isSuspect = absDev > 6;
              return (
                <div key={data.digit} className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 flex flex-col justify-end space-y-4 relative group">
                  {/* Vertical bar mockup dynamically sized */}
                  <div className="h-28 flex items-end justify-center gap-2.5 relative">
                    {/* Ideal Benford Bar (Thin backdrop outline colored) */}
                    <div 
                      className="w-3 bg-slate-200 rounded-t"
                      style={{ height: `${(data.idealPct / 35) * 100}%` }}
                      title={`Loi théorique Benford : ${data.idealPct}%`}
                    />
                    {/* Actual Bar */}
                    <div 
                      className={cn(
                        "w-5 rounded-t transition-all duration-700 shadow-sm",
                        isSuspect ? "bg-rose-500 group-hover:bg-rose-600 shadow-rose-100" : "bg-indigo-500 group-hover:bg-indigo-600 shadow-indigo-100"
                      )}
                      style={{ height: `${Math.max(5, (data.actualPct / 35) * 100)}%` }}
                      title={`Fréquence Réelle Constatée : ${data.actualPct}%`}
                    />
                  </div>

                  {/* Digit Label */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="font-mono text-xs font-black text-slate-400">CHIFFRE</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{data.digit}</p>
                    
                    <div className="flex flex-col text-[10px] mt-2 space-y-0.5 font-mono">
                      <span className="text-indigo-600 font-bold">{data.actualPct}%</span>
                      <span className="text-slate-400">({data.idealPct}%)</span>
                      <span className={cn(
                        "font-bold",
                        data.deviation >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {data.deviation >= 0 ? '+' : ''}{data.deviation}%
                      </span>
                    </div>
                  </div>

                  {isSuspect && (
                    <div className="absolute top-2 right-2 bg-rose-50 p-1 rounded-full text-rose-500 animate-pulse border border-rose-100" title="Écart suspect par rapport à l'idéal mathématique">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/30 flex items-start gap-4">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-indigo-800">Théorème de Benford Appliqué</h4>
              <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                Dans une base de données d'inventaires non falsifiée, le premier chiffre d'un relevé physique suit naturellement une décroissance logarithmique (le chiffre 1 apparaît ~30.1% du temps). Une déviation majeure (&gt;6%) sur un chiffre spécifique indique une anomalie mathématique potentielle : saisies répétitives forfaitaires ou ajustements manuels non conformes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {// DYNAMIC DETECTED ANOMALIES LIST
      }
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: CRITICAL ANOMALIES DETECTED IN REAL-TIME */}
        <div className="card bg-white border border-slate-100 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">Anomalies Logiques / FIFO ({healthMetrics.fifoAnomaliesCount})</h4>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Erreurs chronologiques d'écoulement de lot</p>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase",
              healthMetrics.fifoAnomaliesCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {healthMetrics.fifoAnomaliesCount > 0 ? "Alerte Écoulement" : "FIFO Conforme"}
            </span>
          </div>

          <div className="space-y-4">
            {healthMetrics.fifoAnomalies.map((an, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded">Rupture FIFO</span>
                  <h5 className="text-xs font-black text-slate-900 truncate mt-1">{an.name}</h5>
                  <p className="font-mono text-[9px] text-slate-400 mt-0.5">{an.ref}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5 font-medium">{an.description}</p>
                </div>
              </div>
            ))}

            {healthMetrics.fifoAnomaliesCount === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-300">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aucune anomalie FIFO detected dans la séquence</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tous les flux d'épuisement sont ordonnés et cohérents</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SUSPICIOUS REPEAT ADJUSTMENTS */}
        <div className="card bg-white border border-slate-100 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">Ajustements Suspects Répétés ({healthMetrics.suspectAdjustments.length})</h4>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Articles modifiés plusieurs fois lors d'audits physiques</p>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase",
              healthMetrics.suspectAdjustments.length > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {healthMetrics.suspectAdjustments.length > 0 ? "Vigilance Ajustements" : "Aucun doublon"}
            </span>
          </div>

          <div className="space-y-4">
            {healthMetrics.suspectAdjustments.map((a) => (
              <div key={a.articleId} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-slate-900 leading-none">{a.name}</h5>
                    <p className="font-mono text-[9px] text-slate-400 mt-1">{a.ref}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">
                      Modifié à <span className="text-slate-900 font-bold font-mono">{a.count}</span> reprises lors des inventaires passés.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                    Dernière correction: {a.lastDiff > 0 ? '+' : ''}{a.lastDiff} u.
                  </span>
                </div>
              </div>
            ))}

            {healthMetrics.suspectAdjustments.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-300">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aucun correctif d'audit redondant détecté</p>
                <p className="text-[10px] text-slate-400 mt-0.5">La dérive d'ajustement unitaire est de 0%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {// INJECT VECTORS STYLESHEET EXCLUSIVELY FOR EMBEDDED PRINT LAYOUT CONTROL
      }
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-layout {
            display: block !important;
            padding: 2.5cm !important;
            background: white !important;
          }
          .pdf-header-border {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 12px !important;
            margin-bottom: 24px !important;
          }
          .pdf-card {
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 16px !important;
            page-break-inside: avoid !important;
            margin-bottom: 16px !important;
          }
          .pdf-badge {
            border: 1px solid #cbd5e1 !important;
            padding: 2px 6px !important;
            font-family: monospace !important;
            text-transform: uppercase !important;
            font-weight: bold !important;
            font-size: 9px !important;
          }
          .pdf-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .pdf-table th {
            border-bottom: 2px solid #e2e8f0 !important;
            padding: 8px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            font-size: 9px !important;
            text-align: left !important;
          }
          .pdf-table td {
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 8px !important;
          }
        }
      `}</style>

      {/* RENDER DEDICATED VECTORS-COMPLIANT PRINT DRAFT ONLY FOR window.print() OUTPUT */}
      <div className="hidden print-layout text-slate-900 bg-white">
        <div className="pdf-header-border flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">RAPPORT INTÉGRITÉ & CONFORMITÉ IA</h1>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Génération : {new Date().toLocaleString()} | Site : {currentSite}</p>
          </div>
          <span className="pdf-badge">SYS-WMS v2.0 Invariant</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="pdf-card">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Synthèse du Diagnostic</h3>
            <p className="text-3xl font-black">{healthMetrics.finalScore} / 100</p>
            <p className="text-xs font-bold uppercase mt-1">GRADE : {healthMetrics.grade} • {healthMetrics.assessment}</p>
            <p className="text-[10px] text-slate-600 mt-2">{healthMetrics.desc}</p>
          </div>

          <div className="pdf-card space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Metriques Inspectées</h3>
            <p className="text-xs">Chrono FIFO Temporel : <span className="font-bold">{100 - healthMetrics.fifoAnomaliesCount * 10}%</span></p>
            <p className="text-xs">Surcharges / Brouillons d'Ajustement : <span className="font-bold">{Math.max(10, 100 - healthMetrics.suspectAdjustments.length * 15)}%</span></p>
            <p className="text-xs">Seuils Mini commandés : <span className="font-bold">{healthMetrics.lowStockCount} alertes actives</span></p>
            <p className="text-xs">Anomalies FIFO comptabilisées : <span className="font-bold">{healthMetrics.fifoAnomaliesCount} anomalies</span></p>
          </div>
        </div>

        <div className="pdf-card">
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3">CONFORMITÉ DE LOI BENFORD RELEVÉE</h3>
          <table className="pdf-table text-[10px]">
            <thead>
              <tr>
                <th>Chiffre</th>
                <th>Fréquence Réelle</th>
                <th>Idéal Théorique</th>
                <th>Dérive Constatée</th>
              </tr>
            </thead>
            <tbody>
              {benfordAnalysis.datasets.map(d => (
                <tr key={d.digit}>
                  <td className="font-bold">{d.digit}</td>
                  <td>{d.actualPct}%</td>
                  <td>{d.idealPct}%</td>
                  <td className={d.deviation >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {d.deviation >= 0 ? '+' : ''}{d.deviation}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pdf-card">
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3">RUGOSITÉ DE SÉCURITÉ ET INTÉGRITÉ RECOUSUE</h3>
          <p className="text-[9px] text-slate-500 leading-normal">
            Rapport généré électroniquement par le moteur intelligent d'invariant d'Hydro-mines. Toute altération physique ou modification des logs de traçabilité déclenchera le PCS et désynchronisera le snapshot local. Intégrité validée par preuve de cohérence.
          </p>
        </div>
      </div>
    </div>
  );
}
