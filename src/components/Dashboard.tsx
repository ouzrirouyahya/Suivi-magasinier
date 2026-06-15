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
    const siteArticles = site === 'ALL' ? articles : articles.filter(a => a.site === site);
    const siteMouvements = site === 'ALL' ? mouvements : mouvements.filter(m => m.site === site);

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
      {/* PARTIE 2 — HEADER "MON MAGASIN" : ÉPURÉ ET ÉLÉGANT */}
      <header className="bg-white border border-slate-200 rounded-2xl px-8 py-6 shadow-sm mb-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Gauche : titre + site */}
          <div className="flex items-center gap-4">
            {/* Barre verticale double couleur Hydromines */}
            <div className="flex h-10 w-1.5 rounded-full overflow-hidden shrink-0">
              <div className="w-full h-1/2 bg-sky-500" />
              <div className="w-full h-1/2 bg-red-700" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                Mon Magasin
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Site : <span className="font-black text-slate-800">
                  {site === 'ALL' ? 'Tous les sites' : site}
                </span>
              </p>
            </div>
          </div>

          {/* Droite : badge HYDROMINES + horloge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black tracking-wider uppercase text-sky-600">HYDRO</span>
              <span className="text-[10px] font-black tracking-wider uppercase text-red-700 -ml-1">MINES</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono font-bold text-slate-600">
              {currentTime.toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              })}
            </div>
          </div>
        </div>
      </header>

      {/* PARTIE 3 — MINI-CARTES KPI : PROPRES ET LISIBLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.action === 'ALERTES_STOCK' ? onAction('RESTOCK_MGMT') : undefined}
            className={cn(
              "bg-white border rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden",
              "transition-all duration-200",
              stat.alert 
                ? "border-amber-300 shadow-[0_0_0_1px_#fcd34d,0_4px_12px_rgba(251,191,36,0.15)] cursor-pointer hover:shadow-[0_0_0_1px_#f59e0b,0_6px_16px_rgba(251,191,36,0.2)]"
                : stat.action 
                  ? "border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 hover:shadow-md"
                  : "border-slate-200 shadow-sm"
            )}
          >
            {/* Barre de criticité en haut si alerte */}
            {stat.alert && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400 rounded-t-2xl" />
            )}
            
            {/* Ligne icône + label */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {stat.label}
              </p>
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                stat.bg
              )}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </div>

            {/* Valeur principale */}
            <p className={cn(
              "font-black leading-none text-slate-900",
              stat.value.length > 18 
                ? "text-sm font-bold text-slate-700" 
                : "text-2xl"
            )}>
              {stat.value}
            </p>

            {/* Sous-texte */}
            <p className="text-[11px] text-slate-400 font-medium border-t border-slate-100 pt-2 leading-snug">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* PARTIE 4 — GRANDES CARTES D'ACTION : DESIGN PREMIUM BLANC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. RÉCEPTION (ENTRÉES) */}
        <button 
          onClick={() => onAction('BON_ENTREE')}
          className="group relative text-left bg-white border border-slate-200 rounded-2xl p-6 pl-10 shadow-sm transition-all duration-200 overflow-hidden hover:border-sky-300 hover:shadow-[0_8px_24px_rgba(14,165,233,0.12)] hover:-translate-y-0.5 active:scale-[0.99]"
        >
          {/* Double Ligne Verticale Hydromines: BLEU CIEL (première) & ROUGE FONCÉ (deuxième) */}
          <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[2px_0_8px_rgba(14,165,233,0.15)]">
            <div className="w-1.5 h-full bg-gradient-to-b from-sky-400 to-sky-500" />
            <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
          </div>

          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200 text-sky-600 transition-all duration-200 group-hover:bg-sky-500 group-hover:text-white group-hover:border-transparent">
              <ArrowDownLeft className="w-6 h-6 stroke-[1.5]" />
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider">
              ENREGISTRER ENTRÉE
            </span>
          </div>
          <div className="mt-5">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-sky-950 transition-colors">Réception (Entrées)</h4>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100/60">Enregistrer une nouvelle livraison de pièces ou d'équipements de forge.</p>
            
            {/* Embedded Live HUD */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Aujourd'hui
              </span>
              <span className="text-[11px] font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                {(() => {
                  const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && (m.type === 'ENTREE'));
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
          className="group relative text-left bg-white border border-slate-200 rounded-2xl p-6 pl-10 shadow-sm transition-all duration-200 overflow-hidden hover:border-rose-300 hover:shadow-[0_8px_24px_rgba(244,63,94,0.12)] hover:-translate-y-0.5 active:scale-[0.99]"
        >
          {/* Double Ligne Verticale Hydromines: ROUGE FONCÉ (première) & BLEU CIEL (deuxième) */}
          <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[2px_0_8px_rgba(244,63,94,0.12)]">
            <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
            <div className="w-1.5 h-full bg-gradient-to-b from-sky-400 to-sky-500" />
          </div>

          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200 text-rose-600 transition-all duration-200 group-hover:bg-rose-500 group-hover:text-white group-hover:border-transparent">
              <ArrowUpRight className="w-6 h-6 stroke-[1.5]" />
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider">
              IMPUTATION SORTIE
            </span>
          </div>
          <div className="mt-5">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-rose-950 transition-colors">Sortie de Pièces</h4>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100/60">Déstocker pour un engin minier, perforateur Montabert ou atelier local.</p>
            
            {/* Embedded Live HUD */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Aujourd'hui
              </span>
              <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                {(() => {
                  const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && m.type === 'SORTIE');
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
          className="group relative text-left bg-white border border-slate-200 rounded-2xl p-6 pl-10 shadow-sm transition-all duration-200 overflow-hidden hover:border-indigo-300 hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 active:scale-[0.99]"
        >
          {/* Double Ligne Verticale Hydromines: BLEU CIEL (première) & ROUGE FONCÉ (deuxième) */}
          <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[2px_0_8px_rgba(99,102,241,0.12)]">
            <div className="w-1.5 h-full bg-gradient-to-b from-sky-400 to-sky-500" />
            <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
          </div>

          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200 text-indigo-600 transition-all duration-200 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-transparent">
              <Truck className="w-5.5 h-5.5" />
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider">
              TRANSFERT INTER-SITES
            </span>
          </div>
          <div className="mt-5">
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-950 transition-colors">Transferts & Retours</h4>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100/60">Transférer entre magasins de surface et magasins de fond (-350m) et retours usine.</p>
            
            {/* Embedded Live HUD */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Aujourd'hui
              </span>
              <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                {(() => {
                  const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && (m.type === 'TRANSFERT_OUT' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR'));
                  const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                  return `${count} TRANSFERT${count > 1 ? 'S' : ''}`;
                })()}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* PARTIE 5 — BLOC "ACCÈS RAPIDE AUX STOCKS" : GRILLE PROPRE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 pl-10 shadow-sm relative overflow-hidden">
        {/* Double Ligne Verticale Hydromines: BLEU CIEL & ROUGE FONCÉ */}
        <div className="absolute left-0 top-0 bottom-0 flex w-3 shadow-[1px_0_10px_rgba(56,189,248,0.15)]">
          <div className="w-1.5 h-full bg-gradient-to-b from-[#38bdf8] to-sky-500" />
          <div className="w-1.5 h-full bg-gradient-to-b from-[#991b1b] to-red-800" />
        </div>

        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4.5">Accès rapide aux stocks</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Perforateurs', desc: 'Marteaux COP/MB', icon: Activity, page: 'STOCK_PERFORATEURS', color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100', hoverBorder: 'hover:border-rose-300 hover:shadow-rose-500/5' },
            { label: 'Consommables', desc: 'Fluides & Silice', icon: Flame, page: 'STOCK_CONSOMMABLES', color: 'text-orange-600', bg: 'bg-orange-50 border border-orange-100', hoverBorder: 'hover:border-orange-300 hover:shadow-orange-500/5' },
            { label: 'Equipements EPI', desc: 'Sûreté -350m', icon: ShieldIcon, page: 'STOCK_EPI', color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100', hoverBorder: 'hover:border-emerald-300 hover:shadow-emerald-500/5' },
            { label: 'Ravitaillement', desc: 'Stock & Plannings', icon: AlertCircle, page: 'RESTOCK_MGMT', color: 'text-indigo-600', bg: 'bg-indigo-50 border border-indigo-100', hoverBorder: 'hover:border-indigo-300 hover:shadow-indigo-500/5' },
          ].map(sec => (
            <button
              key={sec.label}
              onClick={() => {
                onAction(sec.page);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl",
                "border border-slate-200 bg-white transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
                "text-center group",
                sec.hoverBorder
              )}
            >
              <div className={cn(
                "p-2.5 rounded-xl mb-2.5 transition-all duration-200",
                "group-hover:scale-110",
                sec.bg, sec.color
              )}>
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
