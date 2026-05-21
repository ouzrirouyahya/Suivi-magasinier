import React from 'react';
import { Search, Menu, Activity } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Article, SiteCode } from '../../types';
import { useInventory } from '../../context/InventoryContext';

interface ToolbarProps {
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  articles: Article[];
  currentSite: SiteCode;
  onSearchFocus: () => void;
  onOpenMenu?: () => void;
  onNavigateToForensic?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  globalSearch, 
  setGlobalSearch, 
  articles, 
  currentSite,
  onSearchFocus,
  onOpenMenu,
  onNavigateToForensic
}) => {
  const { collectSystemMetrics, dlq, networkQuality } = useInventory();
  const siteArticles = articles.filter(a => a.site === currentSite);
  const totalValue = siteArticles.reduce((sum, a) => sum + (a.quantity * a.price), 0);

  const metrics = collectSystemMetrics();
  const unresolvedDLQCount = dlq.filter((e: any) => e.status === 'PENDING').length;

  return (
    <div className="max-w-[1600px] mx-auto mb-3 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white/40 backdrop-blur-3xl p-1.5 rounded-xl border border-white shadow-xl shadow-slate-200/30">
        <div className="flex items-center gap-2 flex-1">
          <button 
            onClick={onOpenMenu}
            className="lg:hidden w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-sky-600 transition-colors shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
            <div className="h-3 w-[1px] bg-slate-200" />
          </div>
          <input 
            type="text" 
            placeholder="Recherche Rapide..."
            className="w-full bg-white/80 h-10 pl-14 pr-8 rounded-xl text-sm font-bold outline-none border border-slate-100 focus:border-sky-200 transition-all focus:ring-4 focus:ring-sky-500/5 placeholder:text-slate-300"
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              if (e.target.value.length >= 2) {
                onSearchFocus();
              }
            }}
          />
        </div>
      </div>
        
        <div className="flex items-center gap-2 px-1">
          {/* DISCREET INDUSTRIAL SRE TELEMETRY BLOCK */}
          <div 
            onClick={onNavigateToForensic}
            className={`hidden md:flex items-center gap-2.5 mr-2 px-3 py-1.5 bg-slate-100/85 hover:bg-slate-200/80 active:scale-[0.98] border border-slate-200/50 rounded-lg text-[10px] font-mono select-none cursor-pointer transition-all`}
          >
            <div className="flex items-center gap-1 text-slate-500">
              <Activity className="w-3 h-3 text-slate-400" />
              <span className="font-extrabold uppercase">SOCI:</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 mr-1" title="Qualité Réseau de Surface">
              <span className="text-[10px] font-extrabold text-slate-400">NET:</span>
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${
                networkQuality === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                networkQuality === 'HIGH_LATENCY' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                networkQuality === 'INTERMITTENT' ? 'bg-yellow-50 text-yellow-600 border border-yellow-105' :
                networkQuality === 'RECOVERING' ? 'bg-sky-50 text-sky-600 border border-sky-100 animate-pulse' :
                'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'
              }`}>
                {networkQuality}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-300" />

            <div className="flex items-center gap-1" title="Statut de Synchronisation Master">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                metrics.reconnectStormStatus ? 'bg-red-500 animate-ping' :
                metrics.queueDepth > 0 ? 'bg-amber-400' : 'bg-emerald-500'
              }`} />
              <span className="text-slate-600 font-bold uppercase" title={`${metrics.queueDepth} opérations en attente`}>
                {metrics.reconnectStormStatus ? 'STORM' : metrics.queueDepth > 0 ? 'SYNCING' : 'OK'}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-300" />

            {/* Queue depth */}
            <div className="flex items-center gap-0.5" title="File de transmission FIFO">
              <span className="text-slate-400">Q:</span>
              <span className={`font-black ${metrics.queueDepth > 0 ? 'text-amber-500 font-extrabold' : 'text-slate-600'}`}>
                {metrics.queueDepth}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-300" />

            {/* Confidence metric */}
            <div className="flex items-center gap-0.5" title="Indicateur de cohérence globale">
              <span className="text-slate-400">CONF:</span>
              <span className={`font-extrabold ${
                metrics.confidenceMode === 'NORMAL' ? 'text-emerald-600' :
                metrics.confidenceMode === 'DEGRADED' ? 'text-yellow-600' : 'text-rose-600'
              }`}>
                {Math.round(metrics.confidenceScore * 100)}%
              </span>
            </div>

            {unresolvedDLQCount > 0 && (
              <>
                <div className="h-3 w-[1px] bg-slate-300" />
                <div className="flex items-center gap-0.5 bg-red-15 text-red-500 font-extrabold px-1 rounded animate-pulse" title="Alerte DLQ unresolvable">
                  <span>DLQ:{unresolvedDLQCount}</span>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none opacity-70">Valeur Stock</p>
            <p className="text-sm font-black text-slate-900 mt-0.5">
              {formatCurrency(totalValue).split(',')[0]}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs shadow-inner">
            {siteArticles.length}
          </div>
        </div>
      </div>
    </div>
  );
};
