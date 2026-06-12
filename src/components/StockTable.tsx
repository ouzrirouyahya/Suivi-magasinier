import React, { useMemo, memo, useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  History as HistoryIcon,
  Plus as PlusIcon,
  ChevronDown,
  ArrowUpRight,
  Package,
  Zap,
  MapPin,
  TrendingUp,
  LayoutGrid,
  List,
  FileDown,
  Wrench,
  Drill,
  Droplets,
  Shield
} from 'lucide-react';
import { Article, ArticleType, SiteCode, Mouvement } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { exportToCSV } from '../lib/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { matchArticleSearch } from '../lib/searchUtils';
import { CarnetsModal } from './CarnetsModal';

interface StockTableProps {
  type: ArticleType | 'ALL';
  site: SiteCode;
  articles: Article[];
  mouvements?: Mouvement[];
  initialSearch?: string;
  onAction?: (id: string, action: 'IN' | 'OUT') => void;
  onViewDetail?: (article: Article) => void;
  onManageCatalog?: () => void;
}

export const StockTable = memo(({ type, site, articles, mouvements = [], initialSearch = '', onAction, onViewDetail, onManageCatalog }: StockTableProps) => {
  const [search, setSearch] = useState(initialSearch);
  const [selectedStockType, setSelectedStockType] = useState<ArticleType | 'ALL'>(type);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [isCarnetsOpen, setIsCarnetsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUPTURE' | 'CRITIQUE' | 'OPTIMAL'>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setSelectedStockType(type);
  }, [type]);

  const entriesLast24h = useMemo(() => {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return mouvements
      .filter(m => {
        if (m.site !== site) return false;
        
        const mDate = new Date(m.date);
        if (isNaN(mDate.getTime())) return false;
        
        const isRecent = (now - mDate.getTime()) <= dayInMs && (now - mDate.getTime()) >= 0;
        const isEntry = ['ENTREE', 'TRANSFERT_IN', 'RETOUR'].includes(m.type);
        
        return isRecent && isEntry;
      })
      .reduce((acc, m) => {
        const siteMType = selectedStockType === 'ALL' || m.items.some(it => {
          const art = articles.find(a => a.id === it.articleId);
          return art && art.type === selectedStockType;
        });
        if (!siteMType) return acc;
        
        const qtySum = m.items.reduce((sum, item) => {
          if (selectedStockType !== 'ALL') {
            const art = articles.find(a => a.id === item.articleId);
            if (!art || art.type !== selectedStockType) return sum;
          }
          return sum + (item.quantity || 0);
        }, 0);
        return acc + qtySum;
      }, 0);
  }, [mouvements, site, selectedStockType, articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSite = a.site === site;
      const matchesType = selectedStockType === 'ALL' || a.type === selectedStockType;
      
      const matchesSearch = matchArticleSearch(a, search);
      const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
      
      const status = a.quantity === 0 ? 'RUPTURE' : (a.quantity <= a.minStock ? 'CRITIQUE' : 'OPTIMAL');
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesLocation = !locationFilter || (a.location || '').toLowerCase().includes(locationFilter.toLowerCase());

      const matchesActive = a.active !== false;

      return matchesActive && matchesSite && matchesType && matchesSearch && matchesCategory && matchesStatus && matchesLocation;
    });
  }, [articles, site, selectedStockType, search, categoryFilter, statusFilter, locationFilter]);

  const sortedAndFilteredArticles = useMemo(() => {
    const list = [...filteredArticles];
    list.sort((a, b) => {
      const aRupture = a.quantity === 0 ? 1 : 0;
      const bRupture = b.quantity === 0 ? 1 : 0;
      if (aRupture !== bRupture) {
        return bRupture - aRupture; // Rupture first
      }
      
      const aCritique = a.quantity <= a.minStock ? 1 : 0;
      const bCritique = b.quantity <= b.minStock ? 1 : 0;
      if (aCritique !== bCritique) {
        return bCritique - aCritique; // Critique next
      }
      
      return a.designation.localeCompare(b.designation);
    });
    return list;
  }, [filteredArticles]);

  const categories = useMemo(() => {
    return Array.from(new Set(articles.filter(a => (selectedStockType === 'ALL' || a.type === selectedStockType) && (a.site === site)).map(a => a.category)));
  }, [articles, selectedStockType, site]);

  const locations = useMemo(() => {
    return Array.from(new Set(articles.filter(a => (selectedStockType === 'ALL' || a.type === selectedStockType) && (a.site === site)).map(a => a.location))).filter(Boolean);
  }, [articles, selectedStockType, site]);

  const getStockStatus = (article: Article) => {
    if (article.quantity === 0) return { label: 'RUPTURE', class: 'bg-rose-500 text-white', icon: AlertTriangle };
    if (article.quantity <= article.minStock) return { label: 'CRITIQUE', class: 'bg-amber-500 text-white', icon: AlertTriangle };
    return { label: 'OPTIMAL', class: 'bg-emerald-500 text-white', icon: Package };
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3 animate-in fade-in duration-300">
            <h2 className="text-[2.75rem] font-black text-slate-950 tracking-tighter uppercase flex items-center gap-3 leading-none">
              <span className="w-2.5 h-10 bg-sky-600 rounded-full"></span>
              {selectedStockType === 'ALL' ? 'État Général des Stocks' : `Stock Pièces ${selectedStockType.toLowerCase().replace('_', ' ')}`}
            </h2>
            {onManageCatalog && (
              <button 
                onClick={onManageCatalog}
                className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                title="Gérer le catalogue"
              >
                <PlusIcon className="w-8 h-8" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-3.5">
            <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.1em] opacity-80">
              Site de surveillance : <span className="text-sky-600 font-extrabold">{site}</span>
            </p>
            <span className="text-slate-300">|</span>
            <p className="text-sm text-sky-600 font-black uppercase tracking-wider">
              {sortedAndFilteredArticles.length} Références listées
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button 
            id="btn-open-carnets"
            onClick={() => setIsCarnetsOpen(true)}
            className="btn bg-slate-900 text-white font-black uppercase tracking-wider text-xs px-5 h-11 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-slate-900/10"
          >
            📋 CARNETS DE BORD
          </button>
          <button 
            onClick={() => {
              exportToCSV(sortedAndFilteredArticles, `STOCKS_${site}_${selectedStockType}`);
              toast.success("Inventaire exporté en CSV");
            }}
            className="btn bg-white border border-slate-200 shadow-sm text-slate-755 text-xs font-black uppercase tracking-wider px-4 h-11 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          {onManageCatalog && (
             <button 
                onClick={onManageCatalog}
                className="btn bg-white border border-slate-200 shadow-sm text-slate-755 text-xs font-black uppercase tracking-wider px-4 h-11 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
             >
                <Package className="w-4 h-4 text-sky-600" /> catalogue
             </button>
          )}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-inner">
            <button 
              onClick={() => setViewMode('TABLE')}
              className={cn("p-1.5 rounded-lg transition-all cursor-pointer", viewMode === 'TABLE' ? "bg-white shadow-md text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600")}
              title="Vue Tableau de terrain dense"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={cn("p-1.5 rounded-lg transition-all cursor-pointer", viewMode === 'GRID' ? "bg-white shadow-md text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600")}
              title="Vue Grille de cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Segmented Selectors for unified stock type switching (replaces 4 screen navigation) */}
      <div className="p-1.5 bg-slate-100 rounded-2xl border border-slate-200/40 flex flex-wrap gap-1.5 items-center w-full max-w-fit no-print">
        {[
          { value: 'ALL', label: 'Tous les Stocks', icon: Package },
          { value: 'ENGINS', label: 'Pièces Engins', icon: Wrench },
          { value: 'PERFORATEURS', label: 'Pièces Perforateurs', icon: Drill },
          { value: 'CONSOMMABLES', label: 'Consommables & Taillants', icon: Droplets },
          { value: 'EPI', label: 'EPI', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedStockType === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedStockType(tab.value as any);
                setCategoryFilter('ALL');
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border",
                isActive 
                  ? "bg-white text-slate-900 border-slate-200 shadow-sm font-black" 
                  : "bg-transparent text-slate-500 border-transparent hover:text-slate-700"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-sky-600" : "text-slate-400")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic KPIs for the current category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        {[
          { 
            label: 'Total Références', 
            value: sortedAndFilteredArticles.length, 
            unit: 'Réf', 
            color: 'text-sky-600', 
            bg: 'bg-white',
            details: `${Array.from(new Set(sortedAndFilteredArticles.map(a => a.category))).length} Catégories`
          },
          { 
            label: 'Valeur Totale', 
            value: formatCurrency(sortedAndFilteredArticles.reduce((sum, a) => sum + (a.quantity * a.price), 0)).split(',')[0], 
            unit: 'MAD', 
            color: 'text-emerald-600', 
            bg: 'bg-white',
            details: 'Valeur HT Estimée'
          },
          { 
            label: 'Ruptures Stock', 
            value: sortedAndFilteredArticles.filter(a => a.quantity === 0).length, 
            unit: 'Critique', 
            color: 'text-rose-600', 
            bg: 'bg-rose-50/50',
            details: 'Besoin Réappro.'
          },
          { 
            label: 'Articles Entrés', 
            value: `${entriesLast24h}`, 
            unit: 'qté H/24', 
            color: 'text-amber-600', 
            bg: 'bg-white',
            details: 'Nombre d\'entrées (24h)'
          }
        ].map((kpi) => (
          <div key={kpi.label} className={cn(
            "card p-6 relative overflow-hidden group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 rounded-2xl border border-slate-100",
            kpi.bg
          )}>
            <p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-wider truncate">{kpi.label}</p>
            <h4 className={cn("text-3xl font-black tracking-tight leading-none mb-3", kpi.color)}>
              {kpi.value} <span className="text-xs text-slate-400 font-extrabold tracking-widest ml-1">{kpi.unit}</span>
            </h4>
            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.details}</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="card glass p-2 flex flex-col md:flex-row items-center gap-2 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-350" />
          <input 
            type="text" 
            placeholder="Rechercher par désignation ou référence..."
            className="input-field pl-12 h-12 text-base font-bold bg-white/40 border-slate-200/50 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <select 
              className="pl-9 pr-7 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-sky-500 appearance-none min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">États</option>
              <option value="OPTIMAL">Stock Optimal</option>
              <option value="CRITIQUE">Seuil Critique</option>
              <option value="RUPTURE">Rupture</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category filter pills - handled separately (filter buttons only) */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50/85 border border-slate-100 rounded-xl px-4 py-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtrer par Sous-Catégorie :
          </span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border cursor-pointer",
              categoryFilter === 'ALL'
                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                : "bg-white text-slate-400 hover:text-slate-650 hover:bg-slate-50 border-slate-200"
            )}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border cursor-pointer",
                categoryFilter === cat
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-400 hover:text-slate-650 hover:bg-slate-50 border-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {viewMode === 'GRID' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {sortedAndFilteredArticles.map((article, idx) => {
              const status = getStockStatus(article);
              const totalValue = article.quantity * article.price;
              
              return (
                <motion.div 
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.015 }}
                  className="group relative"
                >
                  <div 
                    onClick={() => onViewDetail?.(article)}
                    className="relative card bg-white p-4 h-full flex flex-col border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={cn("px-2 py-0.5 rounded text-[10px] font-black tracking-widest flex items-center gap-1 shadow-sm uppercase", status.class)}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </div>
                      <span className="text-xs font-mono font-black text-slate-350 group-hover:text-sky-600 transition-colors uppercase tracking-tight">
                        #{article.ref}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-905 leading-snug mb-2 min-h-[2.5rem] line-clamp-2 uppercase">
                      {article.designation}
                    </h3>

                    {article.component && (
                      <p className="text-[10px] font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded border border-sky-100 uppercase tracking-tighter mb-4 w-fit">
                        {article.component}
                      </p>
                    )}

                    <div className="space-y-2 mb-4 pt-3 border-t border-slate-50">
                       <div className="flex items-center gap-2 text-slate-400">
                         <MapPin className="w-3.5 h-3.5" />
                         <p className="text-xs font-bold text-slate-600">{article.location || '—'}</p>
                       </div>
                       <div className="flex items-center gap-2 text-slate-400">
                         <TrendingUp className="w-3.5 h-3.5" />
                         <p className="text-xs font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                       </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-50">
                      <div className="flex items-end justify-between">
                         <div>
                            <p className={cn("text-2xl font-black tracking-tight leading-none", article.quantity <= article.minStock ? "text-rose-600" : "text-slate-900")}>
                               {article.quantity}
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Stk requis: {article.minStock} {article.unit}</p>
                         </div>
                         <div className="flex gap-1.5 focus-within:z-10">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onAction?.(article.id, 'IN');
                              }}
                              className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all shadow-sm border border-sky-100/50 cursor-pointer"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onAction?.(article.id, 'OUT');
                              }}
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100/50 cursor-pointer"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="table"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -10 }}
            className="border border-slate-150 rounded-2xl shadow-sm bg-white overflow-hidden"
          >
            <table className="min-w-full divide-y divide-slate-150 bg-white">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">Article / Désignation</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Sous-Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">Emplacement</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">Seuil Min.</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">Stock Actuel</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-400">Valeur HT</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-400 no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedAndFilteredArticles.map((article) => {
                  const status = getStockStatus(article);
                  const isZero = article.quantity === 0;
                  const isCritical = article.quantity <= article.minStock;
                  
                  return (
                    <tr 
                      key={article.id} 
                      className="group hover:bg-slate-50/60 transition-all cursor-pointer"
                      onClick={(e) => {
                         if (!(e.target as HTMLElement).closest('button')) {
                            onViewDetail?.(article);
                         }
                      }}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 text-sm uppercase leading-tight group-hover:text-sky-600 transition-colors">
                            {article.designation}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                            Ref: #{article.ref}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase border border-slate-200/50">
                          {article.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-650">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold">{article.location || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="text-xs font-extrabold text-slate-404">{article.minStock} {article.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={cn(
                          "text-base font-black tabular-nums",
                          isZero ? "text-rose-600" : isCritical ? "text-amber-500" : "text-slate-900"
                        )}>
                          {article.quantity} <span className="text-[10px] font-extrabold text-slate-400">{article.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase inline-block font-sans",
                          isZero ? "bg-rose-100 text-rose-700 border border-rose-200" :
                          isCritical ? "bg-amber-100 text-amber-700 border border-amber-205" :
                          "bg-emerald-100 text-emerald-700 border border-emerald-205"
                        )}>
                          {isZero ? 'Rupture' : isCritical ? 'Critique' : 'Optimal'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700 font-mono text-xs whitespace-nowrap">
                        {formatCurrency(article.price)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap no-print">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-all focus-within:opacity-100">
                          <button 
                            onClick={() => onAction?.(article.id, 'IN')} 
                            className="w-8 h-8 flex items-center justify-center bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-600 hover:text-white transition-all shadow-sm border border-sky-100/50 cursor-pointer"
                            title="Ajouter du Stock (Bon d'Entrée)"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onAction?.(article.id, 'OUT')} 
                            className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100/50 cursor-pointer"
                            title="Sortir du Stock (Bon de Sortie)"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {sortedAndFilteredArticles.length === 0 && (
        <div className="card glass p-8 text-center flex flex-col items-center justify-center border-dashed border border-slate-200">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-slate-250" />
          </div>
          <h3 className="text-base font-black text-slate-950 uppercase tracking-tighter">Aucun Article Sélectionné</h3>
          <p className="text-slate-405 font-bold uppercase text-[10px] tracking-widest mt-1 max-w-sm leading-relaxed">
            Aucun article ne correspond aux filtres de recherche. Tous les filtres sont locaux à votre chantier.
          </p>
        </div>
      )}

      <CarnetsModal 
        isOpen={isCarnetsOpen} 
        onClose={() => setIsCarnetsOpen(false)} 
        site={site} 
        articles={articles} 
      />
    </div>
  );
});
