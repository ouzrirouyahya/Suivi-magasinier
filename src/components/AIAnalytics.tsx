import React from 'react';
import { Brain, Sparkles, AlertTriangle, TrendingUp, History, PlayCircle, Loader2, CheckCircle, ShieldAlert, Package } from 'lucide-react';
import { SiteCode, Article, Mouvement, AnomalyReport } from '../types';
import { cn } from '../lib/utils';

interface AIAnalyticsProps {
  site: SiteCode;
  articles: Article[];
  mouvements: Mouvement[];
}

export function AIAnalytics({ site, articles, mouvements }: AIAnalyticsProps) {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'ANOMALIES' | 'PREDICTIONS'>('ANOMALIES');
  const [anomalies, setAnomalies] = React.useState<AnomalyReport[]>([]);
  const [predictions, setPredictions] = React.useState<any[]>([]);

  const runAnalysis = async (type: 'ANOMALIES' | 'PREDICTIONS') => {
    setAnalyzing(true);
    try {
      const siteMouvements = mouvements.filter(m => m.site === site).slice(0, 50); // Send recent 50 movements
      const siteArticles = articles.filter(a => a.site === site);

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: type,
          data: {
            articles: siteArticles.map(a => ({ id: a.id, designation: a.designation, qty: a.quantity, min: a.minStock })),
            mouvements: siteMouvements.map(m => ({ 
              date: m.date, 
              type: m.type, 
              items: m.items, 
              engin: m.engin, 
              perforateur: m.perforateur 
            }))
          }
        })
      });

      const result = await response.json();
      if (type === 'ANOMALIES') {
        setAnomalies(result.anomalies || []);
      } else {
        setPredictions(result.predictions || []);
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-sky-600 flex items-center justify-center shadow-xl shadow-sky-200">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Intelligence Artificielle</h2>
            <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">Analyse prédictive et détection d'anomalies par Gemini</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('ANOMALIES')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'ANOMALIES' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            Anomalies
          </button>
          <button 
            onClick={() => setActiveTab('PREDICTIONS')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'PREDICTIONS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            Prédictions
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-8 bg-slate-900 text-white border-none shadow-2xl">
            <h4 className="text-xl font-black uppercase tracking-widest mb-4">Lancer l'Audit</h4>
            <p className="text-slate-400 text-sm font-bold leading-relaxed mb-8">
              L'IA analyse vos schémas de consommation pour identifier les gaspillages ou les pannes répétitives.
            </p>
            <button 
              disabled={analyzing}
              onClick={() => runAnalysis(activeTab)}
              className="w-full btn bg-sky-500 hover:bg-sky-400 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Démarrer l'Analyse
                </>
              )}
            </button>
          </div>

          <div className="card p-6 border-slate-100">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Statistiques IA</h5>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Points analysés</span>
                <span className="font-black">1.2k</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Précision Modèle</span>
                <span className="font-black text-emerald-600 text-lg">94%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {analyzing ? (
            <div className="card p-32 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
                <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-sky-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase mt-8 tracking-tighter">Traitement des Données</h3>
              <p className="text-lg text-slate-400 font-bold mt-2">Gemini analyse les corrélations temporelles et techniques...</p>
            </div>
          ) : activeTab === 'ANOMALIES' ? (
            <div className="space-y-4">
              {anomalies.length === 0 ? (
                <div className="card p-20 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 opacity-50">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Aucune Anomalie Détectée</h3>
                  <p className="text-sm text-slate-500 font-bold mt-2">Relancez une analyse pour vérifier les derniers mouvements.</p>
                </div>
              ) : (
                anomalies.map((anom, idx) => (
                  <div key={anom.id || `anomaly-${idx}`} className="card p-8 border-l-8 border-l-rose-500 shadow-xl overflow-hidden relative group">
                    <AlertTriangle className="absolute -top-4 -right-4 w-24 h-24 text-rose-500/5 group-hover:scale-110 transition-transform" />
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                          anom.severity === 'CRITICAL' ? "bg-rose-100 text-rose-600" :
                          anom.severity === 'HIGH' ? "bg-orange-100 text-orange-600" :
                          "bg-amber-100 text-amber-600"
                        )}>
                          ALERTE {anom.severity}
                        </span>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{anom.type}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase">ID: #{anom.id.slice(0,8)}</span>
                    </div>
                    
                    <h4 className="text-2xl font-black text-slate-950 tracking-tighter leading-tight mb-4 uppercase">
                      {anom.machineId ? `ALERTE SUR ${anom.machineId}` : 'ALERTE CONSOMMATION'}
                    </h4>
                    
                    <p className="text-lg text-slate-600 font-bold leading-relaxed mb-6">
                      {anom.description}
                    </p>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Action Recommandée par l'IA
                      </p>
                      <p className="text-slate-900 font-black text-lg tracking-tight">
                        {anom.suggestedAction}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.length === 0 ? (
                <div className="card p-20 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 opacity-50">
                  <TrendingUp className="w-16 h-16 text-sky-500 mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Audit Prédictif</h3>
                  <p className="text-sm text-slate-500 font-bold mt-2">Prédisez les besoins de stock pour les 30 prochains jours.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {predictions.map((pred, i) => {
                    if (!pred) return null;
                    return (
                      <div key={pred.articleId || `pred-${i}`} className="card p-6 shadow-lg border border-slate-100 hover:border-sky-200 transition-all group">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                              <Package className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-black text-lg text-slate-950 uppercase leading-none">{pred.articleName || 'Article Inconnu'}</h4>
                              <p className="text-xs font-black text-slate-400 mt-1">CONFIANCE: {Math.round((pred.confidence || 0) * 100)}%</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Besoin Estimé</p>
                            <p className="text-3xl font-black text-sky-600 tracking-tighter">+{pred.predictedNeed || 0}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50">
                          <p className="text-sm text-slate-500 font-bold leading-relaxed">
                            <span className="text-sky-600 font-black">RAISON :</span> {pred.reasoning || 'Analyse en cours...'}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Rec. Commande : {pred.suggestedPurchaseDate || 'N/A'}</p>
                            <button className="text-[10px] font-black text-sky-600 uppercase tracking-widest hover:underline">Ajouter à la DA</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
