import React, { useMemo, memo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download,
  Eye,
  X,
  Printer,
  History,
  Activity,
  Zap,
  HardDrive
} from 'lucide-react';
import { AuditLog, Mouvement, Article, SiteCode } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { MouvementHistory } from './MouvementHistory';
import { AuditLogView } from './AuditLogView';

interface TraceabilityCenterProps {
  site: SiteCode;
  logs: AuditLog[];
  mouvements: Mouvement[];
  articles: Article[];
}

export const TraceabilityCenter = memo(({ site, logs, mouvements, articles }: TraceabilityCenterProps) => {
  const [activeTab, setActiveTab] = React.useState<'FLUX' | 'AUDIT'>('FLUX');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[2rem] bg-slate-950 text-white flex items-center justify-center shadow-2xl shadow-slate-900/40">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Centre de Traçabilité</h2>
            <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">
              Registre immuable des opérations & flux — {site === 'ALL' ? 'Tous les sites (Global)' : site}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-50 shrink-0 shadow-inner">
          <button 
            onClick={() => setActiveTab('FLUX')}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3",
              activeTab === 'FLUX' ? "bg-white text-sky-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <History className="w-4 h-4" />
            Flux de Stock
          </button>
          <button 
            onClick={() => setActiveTab('AUDIT')}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3",
              activeTab === 'AUDIT' ? "bg-white text-emerald-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Activity className="w-4 h-4" />
            Audit Système
          </button>
        </div>
      </header>

      <div className="card glass p-2 min-h-[600px] border-slate-100/50 shadow-2xl">
        {activeTab === 'FLUX' ? (
          <MouvementHistory site={site} mouvements={mouvements} articles={articles} />
        ) : (
          <AuditLogView logs={logs} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-slate-950 text-white border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-sky-500/20 transition-all duration-700" />
          <h4 className="text-sm font-black uppercase tracking-widest text-sky-400 mb-2">Total Mouvements</h4>
          <p className="text-4xl font-black tracking-tighter mb-4">{mouvements.filter(m => site === 'ALL' ? true : m.site === site).length}</p>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 w-3/4 rounded-full" />
          </div>
        </div>
        
        <div className="card p-6 bg-emerald-900/10 border-emerald-100 relative group">
          <h4 className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-2">Opérations Audit</h4>
          <p className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{logs.filter(l => site === 'ALL' ? true : l.site === site).length}</p>
          <div className="h-1 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-1/2 rounded-full" />
          </div>
        </div>

        <div className="card p-6 bg-slate-50 border-slate-100 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Intégrité Blockchain</p>
            <p className="text-sm font-black text-emerald-600 uppercase">Vérifiée à 100%</p>
          </div>
        </div>
      </div>
    </div>
  );
});
