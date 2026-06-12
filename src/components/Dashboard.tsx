import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  AlertCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Flame,
  ShieldCheck as ShieldIcon,
  Activity,
  Truck
} from 'lucide-react';
import { Article, Mouvement, SiteCode } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface DashboardProps {
  site: SiteCode;
  articles: Article[];
  mouvements: Mouvement[];
  isAdmin: boolean;
  onAction: (page: any) => void;
  onArticleClick?: (article: Article) => void;
}

export function Dashboard({ site, articles, mouvements, isAdmin, onAction, onArticleClick }: DashboardProps) {
  // Live clock state updating every second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { 
    totalArticles, 
    stockValue, 
    lowStockCount, 
    lastSortieText,
    lastSortieSub,
    lastEntreeText,
    lastEntreeSub
  } = useMemo(() => {
    const siteArticles = articles.filter(a => a.site === site);
    const siteMouvements = mouvements.filter(m => m.site === site);

    const totalArticles = siteArticles.length;
    const stockValue = siteArticles.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.price || 0)), 0);
    const lowStockCount = siteArticles.filter(a => (a.quantity || 0) <= (a.minStock || 0)).length;

    // Last movements (always based on actual real actions)
    const lastSortie = [...siteMouvements]
      .filter(m => m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const lastEntree = [...siteMouvements]
      .filter(m => m.type === 'ENTREE' || m.type === 'TRANSFERT_IN')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const formatLastMouvementText = (m?: any) => {
      if (!m) return 'Aucun';
      const d = new Date(m.date);
      const dateStr = d.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit' });
      const priceSum = m.items.reduce((sum: number, it: any) => sum + (it.quantity * (it.price || 0)), 0);
      return `${dateStr} (${formatCurrency(priceSum)})`;
    };

    const formatLastMouvementSub = (m?: any) => {
      if (!m || m.items.length === 0) return 'Aucun flux enregistré';
      const count = m.items.length;
      const originLabel = m.type === 'SORTIE' ? `Dmd: ${m.demandeur || 'Atelier'}` : `Fourn: ${m.vendeur || 'Epiroc'}`;
      return `${count} réf • ${originLabel}`;
    };

    const lastSortieText = formatLastMouvementText(lastSortie);
    const lastSortieSub = formatLastMouvementSub(lastSortie);
    const lastEntreeText = formatLastMouvementText(lastEntree);
    const lastEntreeSub = formatLastMouvementSub(lastEntree);

    return { 
      totalArticles, 
      stockValue, 
      lowStockCount, 
      lastSortieText,
      lastSortieSub,
      lastEntreeText,
      lastEntreeSub
    };
  }, [articles, mouvements, site]);

  const stats = [
    { 
      label: 'Valeur Immobilisée', 
      value: formatCurrency(stockValue), 
      sub: `${totalArticles} références actives`, 
      icon: DollarSign, 
      color: 'text-sky-600', 
      bg: 'bg-sky-50',
      alert: false 
    },
    { 
      label: 'Dernière Entrée', 
      value: lastEntreeText, 
      sub: lastEntreeSub, 
      icon: ArrowDownLeft, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      alert: false 
    },
    { 
      label: 'Dernière Sortie', 
      value: lastSortieText, 
      sub: lastSortieSub, 
      icon: ArrowUpRight, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      alert: false 
    },
    { 
      label: 'Ruptures Stock Critique', 
      value: `${lowStockCount} Réf`, 
      sub: `En alerte approvisionnement`, 
      icon: AlertCircle, 
      color: lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500', 
      bg: lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50',
      action: 'ALERTES_STOCK', 
      alert: lowStockCount > 0 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12 select-none">
      {/* 🌟 PREMIUM GRAPHICAL OVERHAUL BANNER HEADER (SOLID WHITE BACKGROUND WITH GENTLE ACCENTS) */}
      <header className="relative overflow-hidden bg-white text-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] no-print">
        {/* Decorative Grid & Glow Elements representing premium transparent tech design */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-80" />
        {/* Soft, beautiful semi-transparent Hydromines brand colors */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/8 shadow-[0_0_80px_rgba(56,189,248,0.08)] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-[#991b1b]/5 shadow-[0_0_80px_rgba(153,27,27,0.05)] rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 bg-slate-50 text-[10px] font-black rounded-lg border border-slate-200/80 shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-sky-600 font-black tracking-wider uppercase">HYDRO</span>
                <span className="text-[#b91c1c] font-black tracking-wider uppercase -ml-0.5">MINES</span>
              </span>
              <span className="text-slate-300 font-bold">•</span>
              <span className="text-[10px] text-slate-600 font-bold tracking-wider font-mono bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-lg shadow-2xs">
                {(() => {
                  const d = currentTime;
                  const day = d.getDate();
                  const monthsFr = [
                    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                  ];
                  const month = monthsFr[d.getMonth()];
                  const year = d.getFullYear();
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  const seconds = String(d.getSeconds()).padStart(2, '0');
                  return `${day} ${month} ${year} • ${hours}:${minutes}:${seconds}`;
                })()}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Vertical Elegant Gradient Stripe representing water and mineral soil */}
              <div className="flex h-12 w-2 rounded-full overflow-hidden shrink-0 shadow-[0_2px_10px_rgba(56,189,248,0.2)]">
                <div className="w-1 bg-gradient-to-b from-sky-455 to-sky-555" />
                <div className="w-1 bg-gradient-to-b from-red-700 to-red-900" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter sm:text-5xl lg:text-5xl leading-none">
                  MON MAGASIN
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-semibold tracking-tight mt-2">
                  Stock du site <span className="font-black text-slate-900 underline decoration-sky-450 decoration-4 underline-offset-4">{site}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 🚀 STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => {
              if (stat.action === 'ALERTES_STOCK') onAction('RESTOCK_MGMT');
            }}
            className={cn(
              "bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm p-4.5 rounded-2xl transition-all duration-300 h-full flex flex-col justify-between select-none relative overflow-hidden",
              stat.action || stat.alert ? "cursor-pointer hover:border-slate-350" : ""
            )}
          >
            {stat.alert && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            )}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider leading-none">{stat.label}</p>
                <div className={cn("p-1.5 rounded-xl border border-slate-100", stat.bg, stat.color)}>
                  <stat.icon className="w-4 h-4 stroke-[1.5]" />
                </div>
              </div>
              <p className={cn(
                "font-semibold tracking-tight leading-none mb-1 text-slate-900 truncate",
                stat.value.length > 20 ? "text-xs font-mono text-slate-500" : "text-2xl"
              )}>
                {stat.value}
              </p>
            </div>
            <p className="text-[10px] text-slate-600 font-medium mt-2 leading-normal border-t border-slate-100/60 pt-2 font-mono">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* 🎯 3 GRANDES CARTES D'ACTION RAPIDE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. RÉCEPTION (ENTRÉES) */}
        <button 
          onClick={() => onAction('BON_ENTREE')}
          className="group relative text-left bg-white/45 backdrop-blur-md border border-white/60 p-6 pl-10 rounded-2.5xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-sky-300 hover:bg-white/60 hover:shadow-[0_12px_28px_-4px_rgba(56,189,248,0.12)] focus:outline-none overflow-hidden hover:-translate-y-1 active:scale-98"
        >
          {/* Double Ligne Verticale Hydromines: BLEU CIEL (première) & ROUGE FONCÉ (deuxième) */}
          <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[2px_0_12px_rgba(56,189,248,0.2)]">
            <div className="w-1.5 h-full bg-gradient-to-b from-sky-400 to-sky-500" />
            <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
          </div>

          {/* Graphical Background Grid Accent */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-[radial-gradient(ellipse_at_top_right,var(--color-sky-100)_0%,transparent_70%)] opacity-35 pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sky-500/10 text-sky-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white shadow-md">
              <ArrowDownLeft className="w-6 h-6 stroke-[1.5]" />
            </div>
            <span className="text-[9px] text-sky-600 bg-sky-50/70 border border-sky-100 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest font-mono">ENREGISTRER ENTRÉE</span>
          </div>
          <div className="mt-5">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-sky-950 transition-colors">Réception (Entrées)</h4>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100/60">Enregistrer une nouvelle livraison de pièces ou d'équipements de forage.</p>
            
            {/* Embedded Live HUD */}
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold uppercase font-sans">Mouvements ce jour</span>
              <span className="px-3 py-1 rounded-lg bg-sky-50 border border-sky-100 text-sky-800 font-black font-mono shadow-xs">
                {(() => {
                  const mvs = mouvements.filter(m => m.site === site && (m.type === 'ENTREE'));
                  const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                  return `${count} ENTRÉE${count > 1 ? 'S' : ''}`;
                })()}
              </span>
            </div>
          </div>
        </button>

        {/* 2. SORTIE DE PIÈCES */}
        <button 
          onClick={() => onAction('BON_SORTIE')}
          className="group relative text-left bg-white/45 backdrop-blur-md border border-white/60 p-6 pl-10 rounded-2.5xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-rose-300 hover:bg-white/60 hover:shadow-[0_12px_28px_-4px_rgba(244,63,94,0.12)] focus:outline-none overflow-hidden hover:-translate-y-1 active:scale-98"
        >
          {/* Double Ligne Verticale Hydromines: ROUGE FONCÉ (première) & BLEU CIEL (deuxième) */}
          <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[2px_0_12px_rgba(244,63,94,0.15)]">
            <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
            <div className="w-1.5 h-full bg-gradient-to-b from-sky-400 to-sky-500" />
          </div>

          {/* Graphical Background Grid Accent */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-[radial-gradient(ellipse_at_top_right,var(--color-rose-100)_0%,transparent_70%)] opacity-35 pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white shadow-md">
              <ArrowUpRight className="w-6 h-6 stroke-[1.5]" />
            </div>
            <span className="text-[9px] text-rose-600 bg-rose-50/70 border border-rose-100 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest font-mono">IMPUTATION SORTIE</span>
          </div>
          <div className="mt-5">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-rose-950 transition-colors">Sortie de Pièces</h4>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100/60">Déstocker pour un engin minier, perforateur Montabert ou atelier local.</p>
            
            {/* Embedded Live HUD */}
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold uppercase font-sans">Mouvements ce jour</span>
              <span className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 font-black font-mono shadow-xs">
                {(() => {
                  const mvs = mouvements.filter(m => m.site === site && m.type === 'SORTIE');
                  const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                  return `${count} SORTIE${count > 1 ? 'S' : ''}`;
                })()}
              </span>
            </div>
          </div>
        </button>

        {/* 3. TRANSFERTS & RETOURS */}
        <button 
          onClick={() => onAction('TRANSFERS_RETURNS')}
          className="group relative text-left bg-white/45 backdrop-blur-md border border-white/60 p-6 pl-10 rounded-2.5xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-indigo-300 hover:bg-white/60 hover:shadow-[0_12px_28px_-4px_rgba(99,102,241,0.12)] focus:outline-none overflow-hidden hover:-translate-y-1 active:scale-98"
        >
          {/* Double Ligne Verticale Hydromines: BLEU CIEL (première) & ROUGE FONCÉ (deuxième) */}
          <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[2px_0_12px_rgba(99,102,241,0.15)]">
            <div className="w-1.5 h-full bg-gradient-to-b from-sky-400 to-sky-500" />
            <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
          </div>

          {/* Graphical Background Grid Accent */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-[radial-gradient(ellipse_at_top_right,var(--color-indigo-100)_0%,transparent_70%)] opacity-35 pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500/10 text-indigo-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white shadow-md">
              <Truck className="w-5.5 h-5.5" />
            </div>
            <span className="text-[9px] text-indigo-600 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest font-mono">TRANSFERT INTER-SITES</span>
          </div>
          <div className="mt-5">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-950 transition-colors">Transferts & Retours</h4>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100/60">Transférer entre magasins de surface et fonds (-350m) et retours usine.</p>
            
            {/* Embedded Live HUD */}
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold uppercase font-sans">Mouvements ce jour</span>
              <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-800 font-black font-mono shadow-xs">
                {(() => {
                  const mvs = mouvements.filter(m => m.site === site && (m.type === 'TRANSFERT_OUT' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR'));
                  const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                  return `${count} TRANSFERT${count > 1 ? 'S' : ''}`;
                })()}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 🗂️ ACCÈS RAPIDE AUX STOCKS */}
      <div className="relative bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 pl-10 rounded-3xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.02)] hover:border-slate-350 hover:shadow-[0_8px_32px_-6px_rgba(0,0,0,0.04)] transition-all duration-300 no-print overflow-hidden">
        {/* Double Ligne Verticale Hydromines: BLEU CIEL & ROUGE FONCÉ */}
        <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[1px_0_10px_rgba(56,189,248,0.15)]">
          <div className="w-1.5 h-full bg-gradient-to-b from-[#38bdf8] to-sky-500" />
          <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
        </div>

        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4.5">Accès rapide aux stocks</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Perforateurs', desc: 'Marteaux COP/MB', icon: Activity, page: 'STOCK_PERFORATEURS', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-100 border', hoverBorder: 'hover:border-rose-300 hover:shadow-rose-500/5' },
            { label: 'Consommables', desc: 'Fluides & Silice', icon: Flame, page: 'STOCK_CONSOMMABLES', color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-100 border', hoverBorder: 'hover:border-orange-300 hover:shadow-orange-500/5' },
            { label: 'Equipements EPI', desc: 'Sûreté -350m', icon: ShieldIcon, page: 'STOCK_EPI', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-100 border', hoverBorder: 'hover:border-emerald-300 hover:shadow-emerald-500/5' },
            { label: 'Ravitaillement', desc: 'Stock & Plannings', icon: AlertCircle, page: 'RESTOCK_MGMT', color: 'text-indigo-600', bg: 'bg-indigo-500/10 border-indigo-100 border', hoverBorder: 'hover:border-indigo-300 hover:shadow-indigo-500/5' },
          ].map(sec => (
            <button
              key={sec.label}
              onClick={() => {
                onAction(sec.page);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-150 transition-all text-center group bg-white shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
                sec.hoverBorder
              )}
            >
              <div className={cn("p-3 rounded-xl mb-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-inner", sec.bg, sec.color)}>
                <sec.icon className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <span className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-950 transition-colors">{sec.label}</span>
              <span className="text-[9px] text-slate-400 mt-1 font-extrabold uppercase tracking-widest leading-none block scale-[0.95]">{sec.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
