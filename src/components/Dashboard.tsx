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
import hydrominesLogo from '../assets/images/hydromines_logo.png';

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

    const isRealStock = (a: Article) => (a.quantity || 0) > 0 || (a.location && a.location !== 'Non assigné' && a.location !== 'Non assignée');
    const realStockArticles = siteArticles.filter(isRealStock);

    const totalArticles = realStockArticles.length;
    const stockValue = realStockArticles.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.price || 0)), 0);
    const lowStockCount = realStockArticles.filter(a => (a.minStock || 0) > 0 && (a.quantity || 0) <= (a.minStock || 0)).length;

    // Last movements (always based on actual real actions)
    const lastSortie = [...siteMouvements]
      .filter(m => m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT')
      .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())[0];

    const lastEntree = [...siteMouvements]
      .filter(m => m.type === 'ENTREE' || m.type === 'TRANSFERT_IN')
      .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())[0];

    const formatLastMouvementText = (m?: any) => {
      if (!m) return 'Aucun';
      const d = new Date(m.date as any);
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

  // KPIs reordered by business importance:
  // 1. Critical shortages (Ruptures critiques)
  // 2. Incoming logs (Entrées du jour / Dernières entrées)
  // 3. Outgoing logs (Sorties du jour / Dernières sorties)
  // 4. Stock valuation (Valeur du stock)
  const stats = [
    { 
      id: 'ruptures',
      label: 'Ruptures Critiques', 
      value: `${lowStockCount} Réf`, 
      sub: lowStockCount > 0 ? `${lowStockCount} alertes approvisionnement` : 'Aucun produit en alerte', 
      icon: AlertCircle, 
      color: 'text-sky-600', 
      bg: 'bg-sky-50',
      accentBg: 'bg-sky-500',
      dotColor: lowStockCount > 0 ? 'bg-sky-500 animate-pulse' : 'bg-sky-500',
      borderClass: 'border-sky-200/70 hover:border-sky-500 hover:shadow-[0_8px_20px_rgba(14,165,233,0.08)] ring-1 ring-sky-100/30',
      action: 'ALERTES_STOCK', 
      alert: false 
    },
    { 
      id: 'entrées',
      label: 'Entrées (Dernier Flux)', 
      value: lastEntreeText, 
      sub: lastEntreeSub, 
      icon: ArrowDownLeft, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      accentBg: 'bg-rose-500',
      dotColor: 'bg-rose-500',
      borderClass: 'border-rose-200/70 hover:border-rose-500 hover:shadow-[0_8px_20px_rgba(244,63,94,0.08)] ring-1 ring-rose-100/30',
      action: null,
      alert: false 
    },
    { 
      id: 'sorties',
      label: 'Sorties (Dernier Flux)', 
      value: lastSortieText, 
      sub: lastSortieSub, 
      icon: ArrowUpRight, 
      color: 'text-sky-600', 
      bg: 'bg-sky-50',
      accentBg: 'bg-sky-500',
      dotColor: 'bg-sky-500',
      borderClass: 'border-sky-200/70 hover:border-sky-500 hover:shadow-[0_8px_20px_rgba(14,165,233,0.08)] ring-1 ring-sky-100/30',
      action: null,
      alert: false 
    },
    { 
      id: 'valeur',
      label: 'Valeur Totale Stock', 
      value: formatCurrency(stockValue), 
      sub: `${totalArticles} références actives`, 
      icon: DollarSign, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      accentBg: 'bg-rose-500',
      dotColor: 'bg-rose-500',
      borderClass: 'border-rose-200/70 hover:border-rose-500 hover:shadow-[0_8px_20px_rgba(244,63,94,0.08)] ring-1 ring-rose-100/30',
      action: null,
      alert: false 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 select-none bg-white min-h-screen">
      {/* EXCLUSIF HERO BANNER : SPLIT MODERN ON WHITE CANVAS WITH LUMINOUS GOLD & WHITE GREETING */}
      <div className="bg-white border border-amber-400/45 ring-1 ring-amber-400/10 rounded-[16px] overflow-hidden">
        {/* Local embedded style for custom high-end metallic text glow and shimmer */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes goldWhiteGlow {
            0% { background-position: 200% 50%; }
            100% { background-position: -200% 50%; }
          }
          .luminous-gold-white-text {
            background: linear-gradient(to left, #b8860b 0%, #e5c158 25%, #475569 50%, #ffd700 75%, #b8860b 100%);
            background-size: 300% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: goldWhiteGlow 8s linear infinite;
            font-weight: 950;
            display: inline-block;
          }
        `}} />

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* Section logo gauche (3 cols) - clean and elegant */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center lg:justify-start bg-white lg:pl-10">
            <img 
              src={hydrominesLogo} 
              alt="Hydromines Logo" 
              referrerPolicy="no-referrer"
              className="h-32 lg:h-44 xl:h-48 w-auto object-contain select-none pointer-events-none"
            />
          </div>

          {/* Section info centrale (6 cols) - perfectly centered horizontally and vertically */}
          <div className="lg:col-span-6 p-6 lg:p-10 flex flex-col justify-center items-center text-center gap-6 bg-white">
            <div className="space-y-4 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50/60 border border-amber-200/50 rounded-full">
                <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#b8860b] font-mono">
                  HYDROMINES ERP
                </span>
              </div>
              
              <div className="space-y-3 flex flex-col items-center">
                <h1 className="text-6xl lg:text-8xl xl:text-[7.5rem] tracking-tight leading-[0.95] uppercase">
                  <span className="luminous-gold-white-text font-black text-center">
                     BIENVENUE À VOTRE MAGASIN
                  </span>
                </h1>
                <p className="text-sm lg:text-base xl:text-lg text-slate-550 font-medium max-w-2xl leading-relaxed text-center">
                  Bienvenue dans votre espace magasinier. Suivez vos entrées, contrôlez vos sorties de pièces détachées et pilotez l'approvisionnement des chantiers de <strong className="text-[#b8860b] uppercase font-black">{site === 'ALL' ? 'Tous les sites' : site}</strong> en temps réel.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5">
              <button 
                onClick={() => onAction('BON_SORTIE')}
                className="px-4 py-2.5 bg-slate-950 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-850 transition-all flex items-center gap-2 hover:-translate-y-0.5 transform duration-200 animate-fade-in"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Saisir un bon de sortie
              </button>
              <button 
                onClick={() => onAction('BON_ENTREE')}
                className="px-4 py-2.5 bg-white border-2 border-amber-200/30 text-slate-800 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-amber-50/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 transform duration-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Enregistrer une entrée
              </button>
            </div>
          </div>

          {/* Section HUD / Horloge droite (3 cols) - clean stack */}
          <div className="lg:col-span-3 bg-white flex flex-col justify-center items-center lg:items-end p-6 lg:pr-10 gap-3">
            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">HYDRO</span>
              <span className="text-[9px] font-black tracking-wider uppercase text-slate-900 -ml-0.5">MINES</span>
            </div>
            <div className="px-2.5 py-0.5 bg-slate-50 border border-slate-150 rounded-md text-[9px] font-mono font-bold text-slate-650 shadow-sm flex items-center gap-1.5">
              <span className="text-slate-400">Live:</span>
              {currentTime.toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              })}
            </div>
          </div>

        </div>
      </div>

      {/* COMPOSANT KPI : STYLE IBM MAXIMO + SAP FIORI (12px rounded, sobre, bandeau indicateur discret) */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.action === 'ALERTES_STOCK' ? onAction('RESTOCK_MGMT') : undefined}
            className={cn(
              "rounded-[12px] p-4.5 flex flex-col justify-between gap-3.5 relative transition-all duration-300 shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md border bg-white cursor-default",
              stat.action ? "cursor-pointer" : "cursor-default",
              stat.borderClass
            )}
          >
            {/* Petit bandeau supérieur discret d'accentuation couleur */}
            <div className={cn("absolute top-0 left-0 right-0 h-[3px]", stat.accentBg)} />
 
            {/* Ligne icône + label */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest leading-none text-slate-500">
                {stat.label}
              </p>
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
                stat.bg
              )}>
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              </div>
            </div>
 
            {/* Valeur principale */}
            <div>
              <p className={cn(
                "font-black leading-none tracking-tight text-slate-900",
                stat.value.length > 18 
                  ? "text-sm font-bold" 
                  : "text-2xl"
              )}>
                {stat.value}
              </p>
            </div>
 
            {/* Sous-texte et puce de statut */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 leading-none">
              <p className="text-[10px] font-medium leading-tight text-slate-400">
                {stat.sub}
              </p>
              <span className={cn("w-1.5 h-1.5 rounded-full", stat.dotColor)} />
            </div>
          </div>
        ))}
      </div>

      {/* ACTIONS DOMINANTES DE LA PAGE : RÉCEPTION & SORTIE (14px rounded, dominant) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. GRANDE CARTE ACTION : RÉCEPTION / SAISIR UNE ENTRÉE */}
        <button 
          onClick={() => onAction('BON_ENTREE')}
          className="group relative text-left bg-gradient-to-br from-[#121c26] via-[#091118] to-[#04080c] border-2 border-amber-500/30 rounded-[14px] p-6 shadow-md hover:border-[#b8860b] hover:shadow-[0_16px_36px_rgba(184,134,11,0.18)] hover:ring-2 hover:ring-amber-500/10 active:scale-[0.995] transition-all duration-200 flex flex-col justify-between h-44 cursor-pointer overflow-hidden"
        >
          {/* Ligne d'ancrage avec code couleur d'action (Or précieux) */}
          <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-[#b8860b]" />
          
          <div className="pl-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#ffd700] bg-amber-955/70 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-600/40">
                Flux logistique entrant
              </span>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mt-3.5 flex items-center gap-2">
              SAISIR UNE ENTRÉE <span className="text-[10px] text-[#ffd700]/70 font-normal">Fournisseurs & Retours</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed max-w-lg">
              Enregistrer les réceptions de nouvelles marchandises et inscrire instantanément les pièces détachées ou consommables arrivant au stock logistique.
            </p>
          </div>

          <div className="pl-3 border-t border-slate-800/40 pt-3 flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full shrink-0 animate-pulse" />
              Aujourd'hui : {(() => {
                const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && (m.type === 'ENTREE'));
                const count = mvs.filter(m => new Date(m.date as any).toDateString() === new Date().toDateString()).length;
                return `${count} réception${count > 1 ? 's' : ''}`;
              })()}
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#b8860b]/10 border border-[#b8860b]/40 flex items-center justify-center text-[#ffd700] shadow-sm group-hover:bg-[#b8860b] group-hover:text-amber-950 group-hover:border-transparent transition-all duration-300">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </button>

        {/* 2. GRANDE CARTE ACTION : SORTIE DE PIÈCES / SAISIR UNE SORTIE */}
        <button 
          onClick={() => onAction('BON_SORTIE')}
          className="group relative text-left bg-gradient-to-br from-[#201014] via-[#10070a] to-[#060204] border-2 border-rose-500/30 rounded-[14px] p-6 shadow-md hover:border-rose-500 hover:shadow-[0_16px_36px_rgba(244,63,94,0.18)] hover:ring-2 hover:ring-rose-500/10 active:scale-[0.995] transition-all duration-200 flex flex-col justify-between h-44 cursor-pointer overflow-hidden animate-fade-in"
        >
          {/* Ligne d'ancrage avec code couleur d'action (Crimson Hydromines) */}
          <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-rose-500" />
          
          <div className="pl-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-rose-300 bg-rose-955/70 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-rose-500/40">
                Flux logistique sortant
              </span>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mt-3.5 flex items-center gap-2">
              SAISIR UNE SORTIE <span className="text-[10px] text-rose-300/70 font-normal">Chantiers & Engins</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed max-w-lg">
              Déstocker du matériel critique d'extraction et des consommables pour affectation immédiate sur engins de mines ou distribution aux équipes de chantier.
            </p>
          </div>

          <div className="pl-3 border-t border-slate-800/40 pt-3 flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 animate-pulse" />
              Aujourd'hui : {(() => {
                const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && m.type === 'SORTIE');
                const count = mvs.filter(m => new Date(m.date as any).toDateString() === new Date().toDateString()).length;
                return `${count} bon${count > 1 ? 's' : ''} de sortie`;
              })()}
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-955/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-sm group-hover:bg-rose-500 group-hover:text-rose-950 group-hover:border-transparent transition-all duration-300">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </button>

      </div>

      {/* SECONDE LIGNE : TRANSFERTS SECONDAIRES & ACCÈS RAPIDE AUX STOCKS (Épuré Slate & Gold) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARTE : TRANSFERTS INTER-SITES & RETOURS (14px rounded) */}
        <button 
          onClick={() => onAction('TRANSFERS_RETURNS')}
          className="group relative text-left bg-white border border-slate-200 rounded-[14px] p-5 shadow-sm hover:border-amber-400/40 hover:shadow-md active:scale-[0.995] transition-all duration-300 flex flex-col justify-between h-[166px] cursor-pointer overflow-hidden animate-fade-in"
        >
          <div>
            <span className="text-[9px] font-bold text-[#b8860b] bg-amber-50/50 border border-amber-200/20 px-2 py-0.5 rounded uppercase tracking-wider">
              Transit Inter-sites / retours
            </span>
            <h4 className="text-base font-bold text-slate-900 uppercase tracking-tight mt-3 group-hover:text-[#b8860b] transition-colors">
              Transferts & Retours
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Expédier ou réceptionner du matériel en transit entre les chantiers de l'exploitation Hydromines ou gérer un retour fournisseur.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between w-full">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
              Flux ce jour : {(() => {
                const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && (m.type === 'TRANSFERT_OUT' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR'));
                const count = mvs.filter(m => new Date(m.date as any).toDateString() === new Date().toDateString()).length;
                return count;
              })()}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-[#b8860b] group-hover:text-white group-hover:border-transparent transition-all duration-350">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        {/* ACCÈS RAPIDE AUX STOCKS (2/3 de largeur, avec survol élastique et couleurs Hydromines Gold) */}
        <div className="lg:col-span-2 bg-white border border-amber-400/45 ring-1 ring-amber-400/10 rounded-[14px] p-5 shadow-sm flex flex-col justify-between h-[166px] hover:border-amber-500/40 transition-all duration-300">
          <div>
            <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-none">
              Accès rapide aux catégories de Stocks
            </h4>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3">
            {[
              { 
                label: 'Perforateurs', 
                desc: 'COP & Montabert', 
                icon: Activity, 
                page: 'STOCK_PERFORATEURS', 
                dotClass: 'bg-[#b8860b]', 
                hoverClass: 'hover:border-[#b8860b]/40 hover:shadow-[0_6px_16px_rgba(184,134,11,0.06)] hover:-translate-y-0.5 group-hover:bg-amber-50 group-hover:text-[#b8860b] group-hover:border-amber-200/50' 
              },
              { 
                label: 'Consommables', 
                desc: 'Fluides & Piles', 
                icon: Flame, 
                page: 'STOCK_CONSOMMABLES', 
                dotClass: 'bg-rose-500', 
                hoverClass: 'hover:border-rose-500/40 hover:shadow-[0_6px_16px_rgba(244,63,94,0.06)] hover:-translate-y-0.5 group-hover:bg-rose-50 group-hover:text-rose-600 group-hover:border-rose-155' 
              },
              { 
                label: 'Equipements EPI', 
                desc: 'Sûreté fond', 
                icon: ShieldIcon, 
                page: 'STOCK_EPI', 
                dotClass: 'bg-[#b8860b]', 
                hoverClass: 'hover:border-[#b8860b]/40 hover:shadow-[0_6px_16px_rgba(184,134,11,0.06)] hover:-translate-y-0.5 group-hover:bg-amber-50 group-hover:text-[#b8860b] group-hover:border-amber-200/50' 
              },
              { 
                label: 'Ravitaillement', 
                desc: 'Chantiers alerts', 
                icon: AlertCircle, 
                page: 'RESTOCK_MGMT', 
                dotClass: 'bg-rose-500', 
                hoverClass: 'hover:border-rose-500/40 hover:shadow-[0_6px_16px_rgba(244,63,94,0.06)] hover:-translate-y-0.5 group-hover:bg-rose-50 group-hover:text-rose-600 group-hover:border-rose-155' 
              },
            ].map(sec => (
              <button
                key={sec.label}
                onClick={() => onAction(sec.page)}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-lg border border-amber-400/35 bg-white cursor-pointer hover:border-amber-500/60 transition-all duration-205 text-center group hover:scale-[1.04] active:scale-[0.97]",
                  sec.hoverClass.split(' ')[0] // Custom target border color config onHover
                )}
              >
                <div className={cn(
                  "p-1.5 bg-amber-50/20 border border-amber-200/30 rounded-lg text-slate-650 transition-all flex items-center justify-center mb-1 group-hover:scale-105",
                  sec.hoverClass.split(' ').slice(2).join(' ')
                )}>
                  <sec.icon className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 tracking-tight transition-colors group-hover:text-slate-955 whitespace-nowrap overflow-hidden text-ellipsis w-full flex items-center justify-center gap-1">
                  <span className={cn("w-1 h-1 rounded-full shrink-0", sec.dotClass)} />
                  {sec.label}
                </span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block scale-[0.95] whitespace-nowrap overflow-hidden text-ellipsis w-full mt-0.5">
                  {sec.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
