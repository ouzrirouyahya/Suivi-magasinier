
import React from 'react';
import { Brain, Sparkles, ShieldAlert, TrendingUp, History, PlayCircle, Loader2, FileText, Download, Calendar, Activity, Drill, Users, RefreshCcw, FileDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuditDashboardProps {
  analyzing: boolean;
  onRun: (type: any) => void;
  onDownload: (period: any) => void;
  healthScore: number | null;
  fraudScore: number | null;
  anomaliesCount: number;
}

export function AuditDashboard({ 
  analyzing, 
  onRun, 
  onDownload, 
  healthScore, 
  fraudScore, 
  anomaliesCount 
}: AuditDashboardProps) {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Statistiques Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6 bg-slate-950 text-white border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-sky-500/20 transition-all duration-700" />
          <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-2">Santé Magasin</h4>
          <p className="text-5xl font-black tracking-tighter mb-4">{healthScore || '--'}<span className="text-sm">/100</span></p>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className={cn("h-full bg-sky-500 rounded-full transition-all duration-1000", healthScore ? `w-[${healthScore}%]` : "w-0")} />
          </div>
        </div>

        <div className="card p-6 bg-emerald-950 text-white border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all duration-700" />
          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Indice de Fraude</h4>
          <p className="text-5xl font-black tracking-tighter mb-4">{fraudScore || '0.0'}<span className="text-sm">/10</span></p>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className={cn("h-full bg-emerald-500 rounded-full", fraudScore ? `w-[${fraudScore * 10}%]` : "w-0")} />
          </div>
        </div>

        <div className="card p-6 bg-rose-950 text-white border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-all duration-700" />
          <h4 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-2">Anomalies IA</h4>
          <p className="text-5xl font-black tracking-tighter mb-4">{anomaliesCount}</p>
          <p className="text-[10px] font-bold text-rose-300 opacity-60">Détectées sur les 150 derniers flux</p>
        </div>

        <div className="card p-6 bg-white border-slate-100 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Live Sync</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernier Audit Global</p>
            <p className="text-xs font-black text-slate-900 uppercase">Il y a moins d'une heure</p>
          </div>
        </div>
      </div>

      {/* Actions de Génération */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card p-10 bg-slate-50 border-slate-100 hover:shadow-2xl transition-all group border-b-4 border-sky-500">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-4">Lancer l'Audit FBI</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-10">Moteur neuronal avancé pour détecter la fraude, les vols et les saisies fictives.</p>
          <button 
            disabled={analyzing}
            onClick={() => onRun('FRAUD')}
            className="w-full btn bg-slate-950 text-white h-14 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-sky-600 transition-all shadow-xl shadow-slate-200"
          >
            {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />} Lancer le Scan
          </button>
        </div>

        <div className="card p-10 bg-slate-50 border-slate-100 hover:shadow-2xl transition-all group border-b-4 border-emerald-500">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-4">Analyse Financière</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-10">Extraction des pertes financières dues au surstockage ou aux manques à gagner.</p>
          <button 
            disabled={analyzing}
            onClick={() => onRun('FINANCIAL')}
            className="w-full btn bg-emerald-600 text-white h-14 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
          >
            {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />} Audit de Pertes
          </button>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10">
                <Calendar className="w-7 h-7 text-sky-400" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Audit Hebdomadaire</h3>
              <p className="text-xs text-slate-400 font-bold italic">Audit consolidé des 7 derniers jours.</p>
            </div>
            <button 
              onClick={() => onDownload('HEBDOMADAIRE')}
              className="w-full btn bg-white text-slate-950 h-14 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-sky-400 transition-all shadow-2xl"
            >
              <FileDown className="w-5 h-5" /> Générer PDF (7j)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
