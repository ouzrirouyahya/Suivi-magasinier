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
  Shield,
  X
} from 'lucide-react';
import { Article, ArticleType, SiteCode, Mouvement } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { exportToCSV } from '../lib/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { matchArticleSearch } from '../lib/searchUtils';
import { CarnetsModal } from './CarnetsModal';
import { PriceHistoryModal } from './PriceHistoryModal';

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
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('GRID');
  const [isCarnetsOpen, setIsCarnetsOpen] = useState(false);
  const [selectedPriceHistoryArticle, setSelectedPriceHistoryArticle] = useState<{ id: string; designation: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUPTURE' | 'CRITIQUE' | 'OPTIMAL'>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [stockAvailabilityTab, setStockAvailabilityTab] = useState<'AVAILABLE' | 'OUT_OF_STOCK'>('AVAILABLE');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Pagination State
  const ITEMS_PER_PAGE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStockType, categoryFilter, statusFilter, locationFilter, stockAvailabilityTab, site]);
  
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setSelectedStockType(type);
  }, [type]);

  const isSiteEmpty = useMemo(() => {
    if (site === 'ALL') return false;
    return !articles.some(a => a.site === site);
  }, [articles, site]);

  const entriesLast24h = useMemo(() => {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return mouvements
      .filter(m => {
        if (site !== 'ALL' && m.site !== site) return false;
        
        const mDate = new Date(m.date as any);
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

  const isRealStock = (a: Article) => (a.quantity || 0) > 0 || (a.location && a.location !== 'Non assigné' && a.location !== 'Non assignée');

  const availableCount = useMemo(() => {
    return articles.filter(a => {
      const matchesSite = site === 'ALL' ? true : a.site === site;
      const matchesType = selectedStockType === 'ALL' || a.type === selectedStockType;
      const matchesSearch = matchArticleSearch(a, search);
      const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
      const matchesLocation = !locationFilter || (a.location || '').toLowerCase().includes(locationFilter.toLowerCase());
      const matchesActive = a.active !== false;

      return matchesActive && matchesSite && matchesType && matchesSearch && matchesCategory && matchesLocation && a.quantity > 0;
    }).length;
  }, [articles, site, selectedStockType, search, categoryFilter, locationFilter]);

  const outOfStockCount = useMemo(() => {
    return articles.filter(a => {
      const matchesSite = site === 'ALL' ? true : a.site === site;
      const matchesType = selectedStockType === 'ALL' || a.type === selectedStockType;
      const matchesSearch = matchArticleSearch(a, search);
      const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
      const matchesLocation = !locationFilter || (a.location || '').toLowerCase().includes(locationFilter.toLowerCase());
      const matchesActive = a.active !== false;

      return matchesActive && matchesSite && matchesType && matchesSearch && matchesCategory && matchesLocation && isRealStock(a) && a.quantity === 0;
    }).length;
  }, [articles, site, selectedStockType, search, categoryFilter, locationFilter]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSite = site === 'ALL' ? true : a.site === site;
      const matchesType = selectedStockType === 'ALL' || a.type === selectedStockType;
      
      const matchesSearch = matchArticleSearch(a, search);
      const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
      
      // Availability filter
      const isAvailable = a.quantity > 0;
      if (stockAvailabilityTab === 'AVAILABLE' && !isAvailable) return false;
      if (stockAvailabilityTab === 'OUT_OF_STOCK' && isAvailable) return false;

      const status = a.quantity === 0 ? 'RUPTURE' : (a.quantity <= a.minStock ? 'CRITIQUE' : 'OPTIMAL');
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesLocation = !locationFilter || (a.location || '').toLowerCase().includes(locationFilter.toLowerCase());

      const matchesActive = a.active !== false;

      return matchesActive && matchesSite && matchesType && matchesSearch && matchesCategory && matchesStatus && matchesLocation && isRealStock(a);
    });
  }, [articles, site, selectedStockType, search, categoryFilter, statusFilter, locationFilter, stockAvailabilityTab]);

  const sortedAndFilteredArticles = useMemo(() => {
    const list = [...filteredArticles];
    list.sort((a, b) => {
      const aMin = a.minStock || 0;
      const bMin = b.minStock || 0;
      const aRupture = (aMin > 0 && a.quantity === 0) ? 1 : 0;
      const bRupture = (bMin > 0 && b.quantity === 0) ? 1 : 0;
      if (aRupture !== bRupture) {
        return bRupture - aRupture; // Rupture first
      }
      
      const aCritique = (aMin > 0 && a.quantity <= aMin) ? 1 : 0;
      const bCritique = (bMin > 0 && b.quantity <= bMin) ? 1 : 0;
      if (aCritique !== bCritique) {
        return bCritique - aCritique; // Critique next
      }
      
      return a.designation.localeCompare(b.designation);
    });
    return list;
  }, [filteredArticles]);

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedAndFilteredArticles, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredArticles.length / ITEMS_PER_PAGE));

  const categories = useMemo(() => {
    return Array.from(new Set(articles.filter(a => isRealStock(a) && (selectedStockType === 'ALL' || a.type === selectedStockType) && (site === 'ALL' ? true : a.site === site)).map(a => a.category)));
  }, [articles, selectedStockType, site]);

  const locations = useMemo(() => {
    return Array.from(new Set(articles.filter(a => isRealStock(a) && (selectedStockType === 'ALL' || a.type === selectedStockType) && (site === 'ALL' ? true : a.site === site)).map(a => a.location))).filter(Boolean);
  }, [articles, selectedStockType, site]);

  const getStockStatus = (article: Article) => {
    const minS = article.minStock || 0;
    if (minS > 0) {
      if (article.quantity === 0) return { label: 'RUPTURE', class: 'bg-rose-500 text-white', icon: AlertTriangle };
      if (article.quantity <= minS) return { label: 'CRITIQUE', class: 'bg-amber-500 text-white', icon: AlertTriangle };
    }
    return { label: 'OPTIMAL', class: 'bg-emerald-500 text-white', icon: Package };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone de stock unifié */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white relative">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]">
              <div className="absolute inset-0 rounded-full animate-pulse opacity-13 bg-current scale-110" />
              <Package className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Section centrale : Titre et Description */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#b8860b]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Inventaire Permanent &amp; valorisation
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                {selectedStockType === 'ALL' ? 'État Général des Stocks' : 'Stock Pièces En Service'}
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Surveillance d'autorité de la valorisation et des volumes logistiques physiques
            </p>
          </div>

          {/* Section droite : Magasin & Actions */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">SMI MAGASIN</span>
            </div>
            <div className="px-3.5 py-1.5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg text-xs font-black text-[#ffd700] shadow-md uppercase tracking-widest select-none leading-none">
              {site === 'ALL' ? 'TOUS LES SITES' : site}
            </div>

            <div className="flex flex-wrap gap-2 justify-center lg:justify-end mt-2.5">
              <button 
                id="btn-open-carnets"
                onClick={() => setIsCarnetsOpen(true)}
                className="bg-slate-950 hover:bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase px-3 h-8 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                📋 CARNETS
              </button>
              <button 
                onClick={() => {
                  exportToCSV(sortedAndFilteredArticles, `STOCKS_${site}_${selectedStockType}`);
                  toast.success("Inventaire exporté en CSV");
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-800 text-[10px] font-black uppercase tracking-wider px-3 h-8 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-600" /> EXPORT
              </button>
              {onManageCatalog && (
                <button 
                  onClick={onManageCatalog}
                  className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-800 text-[10px] font-black uppercase tracking-wider px-3 h-8 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-sky-600" /> CATALOGUE
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Premium Selector Cards (replaces small segmented keys) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 no-print">
        {[
          { value: 'ALL', label: 'Tout le Stock', icon: Package, desc: 'Centralisation globale' },
          { value: 'ENGINS', label: 'Pièces Engins', icon: Wrench, desc: 'Maintenance engins miniers' },
          { value: 'PERFORATEURS', label: 'Pièces Perforateurs', icon: Drill, desc: 'Matériel forage & abrasion' },
          { value: 'CONSOMMABLES', label: 'Consommables & Taillants', icon: Droplets, desc: 'Fluides et taillants forage' },
          { value: 'EPI', label: 'Équipements EPI', icon: Shield, desc: 'Sécurité terrain & protection' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedStockType === tab.value;
          
          // Count active items dynamically for this specific stock category
          const quantityOfUniqueArticles = articles.filter(a => {
            const matchesSite = site === 'ALL' ? true : a.site === site;
            const matchesType = tab.value === 'ALL' ? true : a.type === tab.value;
            return a.active !== false && matchesSite && matchesType;
          }).length;

          return (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedStockType(tab.value as any);
                setCategoryFilter('ALL');
              }}
              className={cn(
                "group relative select-none flex flex-col items-start p-5 rounded-2xl transition-all duration-300 transform border text-left cursor-pointer w-full",
                isActive 
                  ? "bg-gradient-to-br from-[#121c26] via-[#091118] to-[#04080c] border-2 border-[#b8860b] shadow-[0_16px_36px_rgba(184,134,11,0.15)] scale-[1.02] ring-2 ring-amber-500/10 text-white" 
                  : "bg-white hover:bg-slate-50/50 border-slate-200/50 hover:border-slate-300 hover:scale-[1.01] shadow-[0_2px_8px_rgba(0,0,0,0.015)] text-slate-750"
              )}
            >
              {/* Luminous indicator corner glow & top brand line */}
              {isActive && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#b8860b] rounded-t-2xl" />
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-[#ffd700]/5 rounded-tr-2xl rounded-bl-[100px] blur-xs pointer-events-none" />
                </>
              )}
              
              <div className="flex items-center justify-between w-full mb-4">
                <div className={cn(
                  "p-3 rounded-xl transition-all border",
                  isActive 
                    ? "bg-[#b8860b]/20 text-[#ffd700] border-[#b8860b]/40 shadow-inner" 
                    : "bg-slate-50 text-slate-600 border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-800"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <span className={cn(
                  "text-[10px] font-black uppercase font-mono tracking-wider px-2 py-0.5 rounded-lg border",
                  isActive 
                    ? "bg-amber-950/70 text-[#ffd700] border-amber-600/40" 
                    : "bg-slate-50 text-slate-500 border-slate-150 font-bold"
                )}>
                  {quantityOfUniqueArticles} Réf
                </span>
              </div>
              
              <h4 className={cn(
                "text-xs font-black uppercase tracking-wider leading-none mb-1",
                isActive ? "text-white" : "text-slate-900"
              )}>
                {tab.label}
              </h4>
              <p className={cn(
                "text-[10px] font-semibold leading-snug uppercase tracking-tight line-clamp-1",
                isActive ? "text-[#ffd700]/80" : "text-slate-500"
              )}>
                {tab.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Dynamic KPIs for the current category - PERFECT REDESIGN MATCHING THE MAIN DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {[
          { 
            label: 'Total Références', 
            value: sortedAndFilteredArticles.length, 
            unit: 'Réf', 
            color: 'text-slate-900', 
            bg: 'bg-white',
            accentBg: 'bg-sky-500',
            dotColor: 'bg-sky-500',
            borderClass: 'border-slate-200/70 hover:border-sky-500 hover:shadow-[0_8px_20px_rgba(14,165,233,0.08)] ring-1 ring-sky-100/30',
            icon: Package,
            details: `${Array.from(new Set(sortedAndFilteredArticles.map(a => a.category))).length} Catégories`
          },
          { 
            label: 'Valeur Totale', 
            value: formatCurrency(sortedAndFilteredArticles.reduce((sum, a) => sum + ((Number(a.quantity) || 0) * (Number(a.price) || 0)), 0)).split(',')[0], 
            unit: 'MAD', 
            color: 'text-slate-900', 
            bg: 'bg-white',
            accentBg: 'bg-emerald-500',
            dotColor: 'bg-emerald-500',
            borderClass: 'border-slate-200/70 hover:border-emerald-500 hover:shadow-[0_8px_20px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100/30',
            icon: TrendingUp,
            details: 'Valeur HT Estimée'
          },
          { 
            label: 'Ruptures Stock', 
            value: sortedAndFilteredArticles.filter(a => a.quantity === 0).length, 
            unit: 'Réfs', 
            color: 'text-rose-600', 
            bg: 'bg-white',
            accentBg: 'bg-rose-500',
            dotColor: 'bg-rose-500',
            borderClass: 'border-rose-200/70 hover:border-rose-500 hover:shadow-[0_8px_20px_rgba(244,63,94,0.08)] ring-1 ring-rose-100/30',
            icon: AlertTriangle,
            details: 'Besoin Réappro.'
          },
          { 
            label: 'Articles Entrés', 
            value: `${entriesLast24h}`, 
            unit: 'Qté H/24', 
            color: 'text-slate-900', 
            bg: 'bg-white',
            accentBg: 'bg-amber-500',
            dotColor: 'bg-amber-500',
            borderClass: 'border-slate-200/70 hover:border-amber-500 hover:shadow-[0_8px_20px_rgba(245,158,11,0.08)] ring-1 ring-amber-100/30',
            icon: Zap,
            details: 'Nombre d\'entrées (24h)'
          }
        ].map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={cn(
                "rounded-[12px] p-4.5 flex flex-col justify-between gap-3.5 relative transition-all duration-300 shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md border bg-white",
                kpi.borderClass
              )}
            >
              {/* Accent banner */}
              <div className={cn("absolute top-0 left-0 right-0 h-[3px]", kpi.accentBg)} />

              {/* Icon + Label */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest leading-none text-slate-500">
                  {kpi.label}
                </p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50">
                  <KpiIcon className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </div>

              {/* Main value */}
              <div>
                <p className={cn("font-black leading-none tracking-tight", kpi.color, "text-2xl")}>
                  {kpi.value} <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase ml-1">{kpi.unit}</span>
                </p>
              </div>

              {/* Bottom detail row */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 leading-none">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {kpi.details}
                </p>
                <span className={cn("w-1.5 h-1.5 rounded-full", kpi.dotColor)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200/60 p-2.5 flex flex-col md:flex-row items-center gap-3 shadow-sm rounded-xl no-print">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher par désignation ou référence..."
            className="w-full pl-12 pr-11 h-11 text-sm font-bold bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#b8860b] focus:bg-white transition-all text-slate-800 placeholder-slate-400 uppercase"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative w-full md:w-auto">
            <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              className="w-full md:w-auto pl-9 pr-8 h-11 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest outline-none focus:border-[#b8860b] focus:ring-1 focus:ring-amber-500/20 appearance-none min-w-[140px] text-slate-750 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Tous les États</option>
              {stockAvailabilityTab === 'AVAILABLE' && (
                <>
                  <option value="OPTIMAL">Stock Optimal</option>
                  <option value="CRITIQUE">Seuil Critique</option>
                </>
              )}
              {stockAvailabilityTab === 'OUT_OF_STOCK' && (
                <option value="RUPTURE">Rupture</option>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Integrated Layout Switcher for outstanding premium controls */}
          <div className="flex items-center gap-1 bg-slate-100/85 p-1 rounded-lg border border-slate-200/50 select-none w-full md:w-auto">
            <button 
              onClick={() => setViewMode('GRID')}
              className={cn(
                "flex-1 md:flex-initial px-3 h-9 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none", 
                viewMode === 'GRID' 
                  ? "bg-white shadow-sm border border-slate-200/40 text-[#b8860b]" 
                  : "text-slate-400 hover:text-slate-700"
              )}
              title="Vue Grille de cartes"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Vue Cartes</span>
            </button>
            <button 
              onClick={() => setViewMode('TABLE')}
              className={cn(
                "flex-1 md:flex-initial px-3 h-9 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none", 
                viewMode === 'TABLE' 
                  ? "bg-white shadow-sm border border-slate-200/40 text-[#b8860b]" 
                  : "text-slate-400 hover:text-slate-700"
              )}
              title="Vue Tableau de terrain dense"
            >
              <List className="w-3.5 h-3.5" />
              <span>Vue Tableau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Availability Switcher and Sub-category Filter compact panel */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-1.5 rounded-2xl bg-white border border-slate-100/90 shadow-[0_3px_12px_rgba(0,0,0,0.01)] no-print">
        {/* Availability Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-50/70 rounded-xl border border-slate-150/40 w-fit">
          <button
            onClick={() => {
              setStockAvailabilityTab('AVAILABLE');
              setStatusFilter('ALL');
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border",
              stockAvailabilityTab === 'AVAILABLE'
                ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span>Stock Disponible</span>
            <span className="bg-emerald-50 text-emerald-700 font-mono text-[10px] px-1.5 py-0.5 rounded font-black ml-1">
              {availableCount}
            </span>
          </button>
          
          <button
            onClick={() => {
              setStockAvailabilityTab('OUT_OF_STOCK');
              setStatusFilter('ALL');
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border",
              stockAvailabilityTab === 'OUT_OF_STOCK'
                ? "bg-white text-rose-600 border-slate-200 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:text-rose-600"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
            <span>Ruptures de Stock</span>
            <span className="bg-rose-50 text-rose-700 font-mono text-[10px] px-1.5 py-0.5 rounded font-black ml-1">
              {outOfStockCount}
            </span>
          </button>
        </div>

        {/* Compact Dropdown Category Filter */}
        {categories.length > 0 && (
          <div className="relative inline-block text-left" id="subcategory-filter-dropdown">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-all cursor-pointer shadow-sm text-slate-700 h-10"
            >
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <span>Sous-catégorie : {categoryFilter === 'ALL' ? 'Toutes' : categoryFilter}</span>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showCategoryDropdown && "transform rotate-180")} />
            </button>
            
            {showCategoryDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowCategoryDropdown(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-80 overflow-y-auto overflow-x-hidden p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setCategoryFilter('ALL');
                      setShowCategoryDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-between transition-colors",
                      categoryFilter === 'ALL' ? "bg-sky-50 text-sky-600 font-extrabold" : "text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <span>Tous</span>
                    {categoryFilter === 'ALL' && <span className="w-1.5 h-1.5 bg-sky-600 rounded-full" />}
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setShowCategoryDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-between transition-colors mt-0.5",
                        categoryFilter === cat ? "bg-sky-50 text-sky-600 font-extrabold" : "text-slate-650 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate">{cat}</span>
                      {categoryFilter === cat && <span className="w-1.5 h-1.5 bg-sky-600 rounded-full" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'GRID' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {paginatedArticles.map((article, idx) => {
              const status = getStockStatus(article);
              const totalValue = (Number(article.quantity) || 0) * (Number(article.price) || 0);
              
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
                    className="relative bg-white pt-5 p-4 h-full flex flex-col border border-slate-200/60 hover:border-slate-400 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer rounded-[12px] group"
                  >
                    {/* Discret Top Accent Ribbon matching current stock status */}
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-[3px] transition-all duration-200",
                      article.quantity === 0 
                        ? "bg-rose-500" 
                        : article.quantity <= article.minStock 
                          ? "bg-amber-500" 
                          : "bg-emerald-550"
                    )} />

                    <div className="flex justify-between items-start mb-3">
                      <div className={cn(
                        "px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-widest flex items-center gap-1 uppercase select-none",
                        article.quantity === 0 
                          ? "bg-rose-50 text-[#9f1239] border border-rose-100"
                          : article.quantity <= article.minStock
                            ? "bg-amber-50 text-[#b8860b] border border-amber-100"
                            : "bg-emerald-50/80 text-[#065f46] border border-emerald-100"
                      )}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </div>
                      <div className="flex flex-col items-end">
                        {site === 'ALL' && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-black text-[9px] mb-1 uppercase tracking-wider">
                            {article.site}
                          </span>
                        )}
                        <span className="text-xs font-mono font-black text-slate-350 group-hover:text-[#b8860b] transition-colors uppercase tracking-tight">
                          #{article.ref}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug mb-2 min-h-[2.5rem] line-clamp-2 uppercase tracking-wide group-hover:text-[#b8860b] transition-colors">
                      {article.designation}
                    </h3>

                    {article.component && (
                      <p className="text-[9px] font-black text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-100 uppercase tracking-wide mb-4 w-fit select-none">
                        {article.component}
                      </p>
                    )}

                    <div className="space-y-2 mb-4 pt-3 border-t border-slate-50">
                       <div className="flex items-center gap-2 text-slate-400">
                         <MapPin className="w-3.5 h-3.5 text-slate-450" />
                         <p className="text-xs font-bold text-slate-600">{article.location || '—'}</p>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-400">
                           <TrendingUp className="w-3.5 h-3.5 text-slate-450" />
                           <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">{formatCurrency(totalValue)}</p>
                         </div>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             setSelectedPriceHistoryArticle({ id: article.id, designation: article.designation });
                           }}
                           className="text-[10px] font-bold text-slate-400 hover:text-[#b8860b] hover:underline cursor-pointer flex items-center gap-1 transition-all"
                           title="Historique des prix"
                         >
                           <HistoryIcon className="w-3 h-3 text-[#b8860b]/70" />
                           {formatCurrency(article.price)}
                         </button>
                       </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-100">
                      <div className="flex items-end justify-between">
                         <div>
                            <p className={cn("text-2xl font-black tracking-tight leading-none", article.quantity <= article.minStock ? "text-rose-600" : "text-slate-900")}>
                               {article.quantity} <span className="text-[10px] font-bold text-slate-450">{article.unit}</span>
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Min requis: {article.minStock} {article.unit}</p>
                         </div>
                         <div className="flex gap-1.5 focus-within:z-10 no-print">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onAction?.(article.id, 'IN');
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-[#b8860b] hover:text-white hover:border-[#b8860b] transition-all shadow-sm border border-slate-200 cursor-pointer"
                              title="Corriger : Ajouter"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onAction?.(article.id, 'OUT');
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm border border-slate-200 cursor-pointer"
                              title="Corriger : Retirer"
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
            className="border-2 border-amber-500/25 rounded-2xl shadow-sm bg-white overflow-hidden hover:border-amber-500/35 transition-colors duration-300"
          >
            <table className="min-w-full divide-y divide-amber-400/30 bg-white">
              <thead className="bg-amber-50/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400">Article / Désignation</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Sous-Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Emplacement</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">Seuil Min.</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">Stock Actuel</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-400">Valeur HT</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-400 no-print font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/50 bg-white">
                {paginatedArticles.map((article) => {
                  const status = getStockStatus(article);
                  const minS = article.minStock || 0;
                  const isZero = minS > 0 && article.quantity === 0;
                  const isCritical = minS > 0 && article.quantity <= minS;
                  
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
                          <span className="font-extrabold text-slate-900 text-sm uppercase leading-tight group-hover:text-[#b8860b] transition-colors">
                            {article.designation}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {site === 'ALL' && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-slate-900 text-white font-mono font-black text-[9px] uppercase tracking-wider">
                                {article.site}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                              Ref: #{article.ref}
                            </span>
                          </div>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPriceHistoryArticle({ id: article.id, designation: article.designation });
                          }}
                          className="hover:text-[#b8860b] hover:underline cursor-pointer inline-flex items-center gap-1 focus:outline-none font-bold"
                          title="Voir l'historique des prix"
                        >
                          <HistoryIcon className="w-3.5 h-3.5 text-[#b8860b]/70" />
                          {formatCurrency(article.price)}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap no-print">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-all focus-within:opacity-100">
                          <button 
                            onClick={() => onAction?.(article.id, 'IN')} 
                            className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-700 rounded-lg hover:bg-[#b8860b] hover:text-white hover:border-[#b8860b] transition-all shadow-sm border border-slate-200 cursor-pointer"
                            title="Ajouter du Stock (Bon d'Entrée)"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onAction?.(article.id, 'OUT')} 
                            className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-700 rounded-lg hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm border border-slate-200 cursor-pointer"
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

      {/* PAGINATION CONTROLS */}
      {sortedAndFilteredArticles.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 bg-white border border-slate-200 rounded-xl shadow-sm no-print">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500">
            Affichage <span className="text-slate-900 font-mono font-black">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-slate-900 font-mono font-black">{Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredArticles.length)}</span> sur <span className="text-slate-900 font-mono font-black">{sortedAndFilteredArticles.length}</span> articles
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                "px-4 py-2 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                currentPage === 1
                  ? "bg-slate-50 text-slate-350 border-slate-150 cursor-not-allowed"
                  : "bg-white hover:bg-slate-50 text-slate-750 border-slate-200 cursor-pointer"
              )}
            >
              Précédent
            </button>
            <span className="px-3 py-2 text-[10px] font-mono font-black uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-600 rounded-lg select-none">
              Page {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "px-4 py-2 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                currentPage === totalPages
                  ? "bg-slate-50 text-slate-350 border-slate-150 cursor-not-allowed"
                  : "bg-white hover:bg-slate-50 text-slate-750 border-slate-200 cursor-pointer"
              )}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {isSiteEmpty ? (
        <div className="card bg-white p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200/80 rounded-[2.5rem] max-w-2xl mx-auto shadow-sm my-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 border border-sky-100/30">
            <Package className="w-8 h-8 text-sky-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fiches Articles Vides pour ce Chantier</h3>
          <p className="text-slate-500 font-medium text-sm max-w-md leading-relaxed mt-2">
            Il n'y a actuellement aucun article instancié pour le chantier <span className="font-extrabold text-slate-800">{site}</span>. Le registre central de l'entreprise contient tout le catalogue technique prêt à être déployé sur votre site.
          </p>
          <div className="h-px bg-slate-100 w-full my-6" />
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={onManageCatalog}
              className="btn bg-sky-600 hover:bg-sky-700 text-white font-black uppercase text-xs tracking-wider px-6 h-12 rounded-xl shadow-lg shadow-sky-600/10 flex items-center gap-2 cursor-pointer border-none"
            >
              <Wrench className="w-4 h-4" /> Initialiser les fiches de stock
            </button>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ou</p>
            <span className="text-xs font-bold text-slate-500">
              Saisissez directement un <b>Bon d'Entrée</b> pour importer un article du catalogue à la volée.
            </span>
          </div>
        </div>
      ) : sortedAndFilteredArticles.length === 0 && (
        <div className="card glass p-8 text-center flex flex-col items-center justify-center border-dashed border border-slate-200 animate-in fade-in duration-200">
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

      <PriceHistoryModal
        open={selectedPriceHistoryArticle !== null}
        onClose={() => setSelectedPriceHistoryArticle(null)}
        itemId={selectedPriceHistoryArticle?.id}
        itemDesignation={selectedPriceHistoryArticle?.designation}
      />
    </div>
  );
});
