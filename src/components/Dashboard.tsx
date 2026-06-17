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
      color: lowStockCount > 0 ? 'text-[#b91c1c]' : 'text-slate-400', 
      bg: lowStockCount > 0 ? 'bg-red-50' : 'bg-slate-50',
      accentBg: lowStockCount > 0 ? 'bg-[#b91c1c]' : 'bg-slate-300',
      dotColor: lowStockCount > 0 ? 'bg-[#b91c1c] animate-pulse' : 'bg-emerald-500',
      action: 'ALERTES_STOCK', 
      alert: lowStockCount > 0 
    },
    { 
      id: 'entrées',
      label: 'Entrées (Dernier Flux)', 
      value: lastEntreeText, 
      sub: lastEntreeSub, 
      icon: ArrowDownLeft, 
      color: 'text-[#0284c7]', 
      bg: 'bg-sky-50',
      accentBg: 'bg-[#0284c7]',
      dotColor: 'bg-[#0284c7]',
      action: null,
      alert: false 
    },
    { 
      id: 'sorties',
      label: 'Sorties (Dernier Flux)', 
      value: lastSortieText, 
      sub: lastSortieSub, 
      icon: ArrowUpRight, 
      color: 'text-slate-600', 
      bg: 'bg-slate-50/85',
      accentBg: 'bg-slate-500',
      dotColor: 'bg-slate-400',
      action: null,
      alert: false 
    },
    { 
      id: 'valeur',
      label: 'Valeur Totale Stock', 
      value: formatCurrency(stockValue), 
      sub: `${totalArticles} références actives`, 
      icon: DollarSign, 
      color: 'text-slate-700', 
      bg: 'bg-slate-50/50',
      accentBg: 'bg-slate-700',
      dotColor: 'bg-slate-600',
      action: null,
      alert: false 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 select-none bg-white min-h-screen">
      {/* HEADER "MON MAGASIN" : ÉPOURE, SOBRE ET PROFESSIONNEL */}
      <header className="bg-white border border-slate-200 rounded-[14px] px-6 py-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Gauche : titre + site */}
          <div className="flex items-center gap-3">
            {/* Barre verticale double couleur Hydromines (Bleu log / Rouge sécurité) */}
            <div className="flex h-10 w-1.5 rounded-full overflow-hidden shrink-0">
              <div className="w-full h-1/2 bg-[#0284c7]" />
              <div className="w-full h-1/2 bg-[#b91c1c]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                Mon Magasin
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1.5">
                Chantier actif : <span className="font-bold text-slate-800">
                  {site === 'ALL' ? 'Tous les sites' : site}
                </span>
              </p>
            </div>
          </div>

          {/* Droite : badge HYDROMINES + horloge */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="w-1.5 h-1.5 bg-[#0284c7] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#0284c7]">HYDRO</span>
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b91c1c] -ml-1">MINES</span>
            </div>
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono font-semibold text-slate-600">
              {currentTime.toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              })}
            </div>
          </div>
        </div>
      </header>

      {/* COMPOSANT KPI : STYLE IBM MAXIMO + SAP FIORI (12px rounded, sobre, bandeau indicateur discret) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.action === 'ALERTES_STOCK' ? onAction('RESTOCK_MGMT') : undefined}
            className={cn(
              "bg-white border rounded-[12px] p-4.5 flex flex-col justify-between gap-3.5 relative transition-all duration-200 shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md",
              stat.alert 
                ? "border-[#b91c1c] ring-1 ring-[#b91c1c]/10 cursor-pointer hover:bg-red-50/10"
                : stat.action 
                  ? "border-slate-200 cursor-pointer hover:border-[#0284c7]/40"
                  : "border-slate-200"
            )}
          >
            {/* Petit bandeau supérieur discret d'accentuation couleur */}
            <div className={cn("absolute top-0 left-0 right-0 h-[3px]", stat.accentBg)} />

            {/* Ligne icône + label */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                {stat.label}
              </p>
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
                stat.bg
              )}>
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              </div>
            </div>

            {/* Valeur principale */}
            <div>
              <p className={cn(
                "font-black leading-none text-slate-905 tracking-tight",
                stat.value.length > 18 
                  ? "text-sm font-bold text-slate-700" 
                  : "text-2xl"
              )}>
                {stat.value}
              </p>
            </div>

            {/* Sous-texte et puce de statut */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 leading-none">
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
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
          className="group relative text-left bg-gradient-to-br from-sky-500/[0.04] via-transparent to-slate-100/[0.02] border border-slate-200 rounded-[14px] p-6 shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#0284c7]/30 hover:shadow-[0_12px_28px_rgba(2,132,199,0.05),inset_0_0_12px_rgba(255,255,255,1)] hover:bg-[#0284c7]/[0.02] active:scale-[0.995] transition-all duration-200 flex flex-col justify-between h-44 cursor-pointer overflow-hidden"
        >
          {/* Ligne d'ancrage avec code couleur d'action */}
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#0284c7]" />
          
          <div className="pl-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#0284c7] bg-sky-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Flux logistique entrant
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-3.5">
              SAISIR UNE ENTRÉE
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">
              Enregistrer les réceptions de nouvelles marchandises et inscrire instantanément les pièces détachées ou consommables arrivant au stock logistique.
            </p>
          </div>

          <div className="pl-2 border-t border-slate-100/60 pt-3 flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#0284c7] rounded-full shrink-0" />
              Aujourd'hui : {(() => {
                const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && (m.type === 'ENTREE'));
                const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                return `${count} réception${count > 1 ? 's' : ''}`;
              })()}
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-205 flex items-center justify-center text-[#0284c7] shadow-sm group-hover:bg-[#0284c7] group-hover:text-white group-hover:border-transparent transition-colors">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </button>

        {/* 2. GRANDE CARTE ACTION : SORTIE DE PIÈCES / SAISIR UNE SORTIE */}
        <button 
          onClick={() => onAction('BON_SORTIE')}
          className="group relative text-left bg-gradient-to-br from-red-500/[0.03] via-transparent to-slate-100/[0.02] border border-slate-200 rounded-[14px] p-6 shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#b91c1c]/30 hover:shadow-[0_12px_28px_rgba(185,28,28,0.05),inset_0_0_12px_rgba(255,255,255,1)] hover:bg-[#b91c1c]/[0.02] active:scale-[0.995] transition-all duration-200 flex flex-col justify-between h-44 cursor-pointer overflow-hidden"
        >
          {/* Ligne d'ancrage avec code couleur d'action */}
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#b91c1c]" />
          
          <div className="pl-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#b91c1c] bg-red-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Flux logistique sortant
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-3.5">
              SAISIR UNE SORTIE
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">
              Déstocker du matériel critique d'extraction et des consommables pour affectation immédiate sur engins de mines ou distribution aux équipes de chantier.
            </p>
          </div>

          <div className="pl-2 border-t border-slate-100/60 pt-3 flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full shrink-0" />
              Aujourd'hui : {(() => {
                const mvs = mouvements.filter(m => (site === 'ALL' ? true : m.site === site) && m.type === 'SORTIE');
                const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                return `${count} bon${count > 1 ? 's' : ''} de sortie`;
              })()}
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-205 flex items-center justify-center text-[#b91c1c] shadow-sm group-hover:bg-[#b91c1c] group-hover:text-white group-hover:border-transparent transition-colors">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </button>

      </div>

      {/* SECONDE LIGNE : TRANSFERTS SECONDAIRES & ACCÈS RAPIDE AUX STOCKS (Épuré Slate) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARTE : TRANSFERTS INTER-SITES & RETOURS (14px rounded) */}
        <button 
          onClick={() => onAction('TRANSFERS_RETURNS')}
          className="group relative text-left bg-white border border-slate-200 rounded-[14px] p-5 shadow-sm hover:border-slate-350 hover:shadow-md active:scale-[0.995] transition-all duration-200 flex flex-col justify-between h-[166px] cursor-pointer overflow-hidden animate-fade-in"
        >
          <div>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded uppercase tracking-wider">
              Transit Inter-sites / retours
            </span>
            <h4 className="text-base font-bold text-slate-900 uppercase tracking-tight mt-3 group-hover:text-slate-955">
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
                const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                return count;
              })()}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        {/* ACCÈS RAPIDE AUX STOCKS (2/3 de largeur, avec survol élastique et couleurs Hydromines) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[14px] p-5 shadow-sm flex flex-col justify-between h-[166px]">
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
                dotClass: 'bg-[#0284c7]', 
                hoverClass: 'hover:border-[#0284c7]/40 hover:shadow-[0_6px_16px_rgba(2,132,199,0.08)] hover:-translate-y-0.5 group-hover:bg-sky-50 group-hover:text-[#0284c7] group-hover:border-sky-100' 
              },
              { 
                label: 'Consommables', 
                desc: 'Fluides & Piles', 
                icon: Flame, 
                page: 'STOCK_CONSOMMABLES', 
                dotClass: 'bg-[#b91c1c]', 
                hoverClass: 'hover:border-[#b91c1c]/45 hover:shadow-[0_6px_16px_rgba(185,28,28,0.08)] hover:-translate-y-0.5 group-hover:bg-red-50 group-hover:text-[#b91c1c] group-hover:border-red-100' 
              },
              { 
                label: 'Equipements EPI', 
                desc: 'Sûreté fond', 
                icon: ShieldIcon, 
                page: 'STOCK_EPI', 
                dotClass: 'bg-[#0284c7]', 
                hoverClass: 'hover:border-[#0284c7]/40 hover:shadow-[0_6px_16px_rgba(2,132,199,0.08)] hover:-translate-y-0.5 group-hover:bg-sky-50 group-hover:text-[#0284c7] group-hover:border-sky-100' 
              },
              { 
                label: 'Ravitaillement', 
                desc: 'Chantiers alerts', 
                icon: AlertCircle, 
                page: 'RESTOCK_MGMT', 
                dotClass: 'bg-[#b91c1c]', 
                hoverClass: 'hover:border-[#b91c1c]/45 hover:shadow-[0_6px_16px_rgba(185,28,28,0.08)] hover:-translate-y-0.5 group-hover:bg-red-50 group-hover:text-[#b91c1c] group-hover:border-red-100' 
              },
            ].map(sec => (
              <button
                key={sec.label}
                onClick={() => onAction(sec.page)}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-150 bg-white cursor-pointer hover:border-slate-350 transition-all duration-200 text-center group hover:scale-[1.04] active:scale-[0.97]",
                  sec.hoverClass.split(' ')[0] // Custom target border color config onHover
                )}
              >
                <div className={cn(
                  "p-1.5 bg-slate-50 border border-slate-150 rounded-lg text-slate-650 transition-all flex items-center justify-center mb-1 group-hover:scale-105",
                  sec.hoverClass.split(' ').slice(2).join(' ')
                )}>
                  <sec.icon className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 tracking-tight transition-colors group-hover:text-slate-950 whitespace-nowrap overflow-hidden text-ellipsis w-full flex items-center justify-center gap-1">
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
