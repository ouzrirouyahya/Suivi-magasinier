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
  HardDrive,
  Drill,
  Truck
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

  // Filter movements belonging to this site
  const siteMouvements = useMemo(() => {
    return mouvements.filter(m => site === 'ALL' ? true : m.site === site);
  }, [mouvements, site]);

  // Compute number of entries (including direct warehouse receipt and external transfer receipt)
  const totalEntrees = useMemo(() => {
    return siteMouvements.filter(m => m.type === 'ENTREE' || m.type === 'TRANSFERT_IN').length;
  }, [siteMouvements]);

  // Compute number of sorties (including checkout to worker, and transfer out)
  const totalSorties = useMemo(() => {
    return siteMouvements.filter(m => m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT').length;
  }, [siteMouvements]);

  // Compute total drilling machine sorties (outflow with a drill machine reference or with drill-type components)
  const sortiesPerfo = useMemo(() => {
    return siteMouvements.filter(m => {
      const isOutflow = m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT';
      if (!isOutflow) return false;
      if (m.perforateur) return true;
      return m.items.some(item => {
        const article = articles.find(a => a.id === item.articleId);
        return article?.type === 'PERFORATEURS';
      });
    }).length;
  }, [siteMouvements, articles]);

  // Compute total engineering vehicle sorties (outflow with an engine reference or with engine-type components)
  const sortiesEngins = useMemo(() => {
    return siteMouvements.filter(m => {
      const isOutflow = m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT';
      if (!isOutflow) return false;
      if (m.engin) return true;
      return m.items.some(item => {
        const article = articles.find(a => a.id === item.articleId);
        return article?.type === 'ENGINS';
      });
    }).length;
  }, [siteMouvements, articles]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.6rem] bg-slate-950 text-white flex items-center justify-center shadow-2xl shadow-slate-900/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
              <span className="luminous-gold-white-text">Grand Registre</span>
            </h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.05em] mt-2 opacity-70">
              Traçabilité et archivage des bons de mouvement — {site === 'ALL' ? 'Tous les sites (Global)' : site}
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-150 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setActiveTab('FLUX')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'FLUX' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Flux de Stock
          </button>
          <button 
            onClick={() => setActiveTab('AUDIT')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'AUDIT' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            Audit Système
          </button>
        </div>
      </header>

      {/* KPI Dashboard - High Polish Design requested by user */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI 1: NOMBRE DES ENTRÉES */}
        <div className="card-clean p-6 bg-emerald-50/20 hover:bg-emerald-50/40 border-emerald-100/60 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[35px] -mr-8 -mt-8" />
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-100/40 px-2.5 py-1 rounded-lg">
              Nombre des Entrées
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{totalEntrees}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Bons de Réception & Retours</p>
          </div>
        </div>

        {/* KPI 2: NOMBRE DES SORTIES */}
        <div className="card-clean p-6 bg-rose-50/20 hover:bg-rose-50/40 border-rose-100/60 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-[35px] -mr-8 -mt-8" />
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest bg-rose-100/40 px-2.5 py-1 rounded-lg">
              Nombre des Sorties
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100/50 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{totalSorties}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Bons de Sortie & Transferts Expédiés</p>
          </div>
        </div>

        {/* KPI 3: SORTIES PERFORATEURS */}
        <div className="card-clean p-6 bg-slate-50/50 hover:bg-slate-50/80 border-slate-200/60 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-[35px] -mr-8 -mt-8" />
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
              Sorties Perforateurs
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-100/40 text-sky-600 flex items-center justify-center">
              <Drill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{sortiesPerfo}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Matériels & Consommables Cop</p>
          </div>
        </div>

        {/* KPI 4: SORTIES ENGINS */}
        <div className="card-clean p-6 bg-slate-50/50 hover:bg-slate-50/80 border-slate-200/60 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[35px] -mr-8 -mt-8" />
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
              Sorties Engins
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100/40 text-amber-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{sortiesEngins}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Rechanges & Pièces de Châssis</p>
          </div>
        </div>
      </div>

      {/* Main Tab Screen Panel */}
      <div className="card-clean p-6 min-h-[550px]">
        {activeTab === 'FLUX' ? (
          <MouvementHistory site={site} mouvements={mouvements} articles={articles} />
        ) : (
          <AuditLogView logs={logs} />
        )}
      </div>
    </div>
  );
});
