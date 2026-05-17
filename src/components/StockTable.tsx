import React, { useState, useEffect } from 'react';
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
  List
} from 'lucide-react';
import { Article, ArticleType, SiteCode } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface StockTableProps {
  type: ArticleType | 'ALL';
  site: SiteCode;
  articles: Article[];
  initialSearch?: string;
  onAction?: (id: string, action: 'IN' | 'OUT') => void;
  onManageCatalog?: () => void;
}

export function StockTable({ type, site, articles, initialSearch = '', onAction, onManageCatalog }: StockTableProps) {
  const [search, setSearch] = useState(initialSearch);
  const [showGlobal, setShowGlobal] = useState(initialSearch.length > 0);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('GRID');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUPTURE' | 'CRITIQUE' | 'OPTIMAL'>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  
  // Sync search state with prop when it changes (global search)
  useEffect(() => {
    setSearch(initialSearch);
    if (initialSearch.length > 0) {
      setShowGlobal(true);
    }
  }, [initialSearch]);

  const filteredArticles = articles.filter(a => {
    const matchesSite = showGlobal || a.site === site;
    const matchesType = type === 'ALL' || a.type === type;
    
    // Normalize search and searchable text to handle accents and case
    const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const searchableText = [
      a.designation,
      a.ref,
      a.category,
      a.functionalCategory,
      a.component,
      a.subComponent || '',
      a.location || ''
    ].join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const matchesSearch = !search || searchableText.includes(normalizedSearch);
    const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
    
    // Multi-criteria
    const status = a.quantity === 0 ? 'RUPTURE' : (a.quantity <= a.minStock ? 'CRITIQUE' : 'OPTIMAL');
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    const matchesLocation = !locationFilter || (a.location || '').toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSite && matchesType && matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });

  const categories = Array.from(new Set(articles.filter(a => a.type === type && a.site === site).map(a => a.category)));
  const locations = Array.from(new Set(articles.filter(a => a.type === type && a.site === site).map(a => a.location))).filter(Boolean);

  const getStockStatus = (article: Article) => {
    if (article.quantity === 0) return { label: 'RUPTURE', class: 'bg-rose-500 text-white', icon: AlertTriangle };
    if (article.quantity <= article.minStock) return { label: 'CRITIQUE', class: 'bg-amber-500 text-white', icon: AlertTriangle };
    return { label: 'OPTIMAL', class: 'bg-emerald-500 text-white', icon: Package };
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase flex items-center gap-3">
              <span className="w-2 h-10 bg-sky-600 rounded-full"></span>
              {type === 'ALL' ? 'Résultats Recherche' : `Stock ${type.replace('_', ' ')}`}
            </h2>
            <button 
              onClick={onManageCatalog}
              className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors"
              title="Gérer le catalogue"
            >
              <PlusIcon className="w-8 h-8" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] opacity-70">SITE DE SURVEILLANCE : <span className="text-sky-600">{site}</span></p>
            <span className="text-slate-300">|</span>
            <p className="text-xl text-sky-600 font-black uppercase tracking-widest">{filteredArticles.length} RÉFÉRENCES ACTIVES</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onManageCatalog && (
             <button 
                onClick={onManageCatalog}
                className="btn bg-white border border-slate-200 shadow-sm text-slate-700 px-4 h-11 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
             >
                <Package className="w-5 h-5 text-sky-600" /> Catalogue
             </button>
          )}
          <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-xl p-0.5 rounded-lg border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5">
            <button 
              onClick={() => setViewMode('TABLE')}
              className={cn("p-1.5 rounded-md transition-all duration-300", viewMode === 'TABLE' ? "bg-white shadow-md text-sky-600 scale-105" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={cn("p-1.5 rounded-md transition-all duration-300", viewMode === 'GRID' ? "bg-white shadow-md text-sky-600 scale-105" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic KPIs for the current category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        {[
          { 
            label: 'Total Références', 
            value: filteredArticles.length, 
            unit: 'Réf', 
            color: 'text-sky-600', 
            bg: 'bg-white',
            details: `${Array.from(new Set(filteredArticles.map(a => a.category))).length} Catégories`
          },
          { 
            label: 'Valeur Totale', 
            value: formatCurrency(filteredArticles.reduce((sum, a) => sum + (a.quantity * a.price), 0)).split(',')[0], 
            unit: 'MAD', 
            color: 'text-emerald-600', 
            bg: 'bg-white',
            details: 'Valeur HT Estimée'
          },
          { 
            label: 'Ruptures Stock', 
            value: filteredArticles.filter(a => a.quantity === 0).length, 
            unit: 'Critique', 
            color: 'text-rose-600', 
            bg: 'bg-rose-50/50',
            details: 'Besoin Réappro.'
          },
          { 
            label: 'Articles Entrés', 
            value: site === 'SMI' ? '74+' : '12+', 
            unit: 'H/24', 
            color: 'text-amber-600', 
            bg: 'bg-white',
            details: 'Mouvements récents'
          }
        ].map((kpi) => (
          <div key={kpi.label} className={cn(
            "card p-8 relative overflow-hidden group shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 rounded-3xl border border-slate-100",
            kpi.bg
          )}>
            <p className="text-lg font-black text-slate-400 uppercase mb-3 tracking-tighter truncate">{kpi.label}</p>
            <h4 className={cn("text-5xl font-black tracking-tighter leading-none mb-4", kpi.color)}>
              {kpi.value} <span className="text-base text-slate-400 font-black tracking-widest ml-1">{kpi.unit}</span>
            </h4>
            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{kpi.details}</span>
              <TrendingUp className="w-4 h-4 text-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="card glass p-2 flex flex-col md:flex-row items-center gap-2 shadow-xl ring-1 ring-slate-900/5">
        <div className="relative flex-1 flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
            <input 
              type="text" 
              placeholder="Rechercher par désignation ou référence..."
              className="input-field pl-12 h-14 text-xl font-black bg-white/40 border-slate-200/50 rounded-2xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowGlobal(!showGlobal)}
            className={cn(
              "btn px-6 h-14 rounded-2xl gap-3 font-black uppercase text-base tracking-widest transition-all whitespace-nowrap",
              showGlobal ? "bg-sky-600 text-white" : "bg-white text-slate-400 border-slate-100"
            )}
          >
            <MapPin className={cn("w-5 h-5", showGlobal ? "text-white" : "text-slate-300")} /> 
            Global
          </button>
        </div>
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <select 
              className="pl-9 pr-7 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-sky-500 appearance-none min-w-[140px]"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Catégories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="relative">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <select 
              className="pl-9 pr-7 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-sky-500 appearance-none min-w-[140px]"
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

      <AnimatePresence mode="wait">
        {viewMode === 'GRID' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredArticles.map((article, idx) => {
              const status = getStockStatus(article);
              const totalValue = article.quantity * article.price;
              
              return (
                <motion.div 
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="group relative"
                >
                  <div className="relative card glass p-4 h-full flex flex-col bg-white border-slate-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-sm ring-1 ring-slate-900/5">
                    <div className="flex justify-between items-start mb-3">
                      <div className={cn("px-2.5 py-1 rounded text-xs font-black tracking-widest flex items-center gap-1.5 shadow-sm", status.class)}>
                        <status.icon className="w-3.5 h-3.5" />
                        {status.label}
                      </div>
                      <span className="text-sm font-mono font-black text-slate-300 group-hover:text-sky-500 transition-colors uppercase tracking-tight">
                        #{article.ref}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 leading-snug mb-2 min-h-[3.5rem] line-clamp-2">
                      {article.designation}
                    </h3>

                    {article.component && (
                      <p className="text-sm font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded border border-sky-100 uppercase tracking-tighter mb-4 w-fit">
                        {article.component}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                       <div className="flex items-center gap-2 text-slate-400">
                         <MapPin className="w-3 h-3" />
                         <p className="text-[11px] font-bold text-slate-600">{article.location}</p>
                       </div>
                       <div className="flex items-center gap-2 text-slate-400">
                         <TrendingUp className="w-3 h-3" />
                         <p className="text-[11px] font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                       </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-50">
                      <div className="flex items-end justify-between">
                         <div>
                            <p className={cn("text-xl font-black tracking-tighter leading-none", article.quantity <= article.minStock ? "text-rose-600" : "text-slate-900")}>
                               {article.quantity}
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{article.unit}</p>
                         </div>
                         <div className="flex gap-1.5 focus-within:z-10">
                            <button 
                              onClick={() => onAction?.(article.id, 'IN')}
                              className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all shadow-sm border border-sky-100/50"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onAction?.(article.id, 'OUT')}
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100/50"
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="table-container glass border-0 shadow-2xl ring-1 ring-slate-900/5 overflow-hidden"
          >
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="px-8 py-6 text-left text-lg font-black uppercase tracking-widest text-slate-400">Désignation & Détails</th>
                  <th className="px-8 py-6 text-lg font-black uppercase tracking-widest text-slate-400">Section</th>
                  <th className="px-8 py-6 text-center text-lg font-black uppercase tracking-widest text-slate-400">Quantité</th>
                  <th className="px-8 py-6 text-right text-lg font-black uppercase tracking-widest text-slate-400">Valeur Unit.</th>
                  <th className="px-8 py-6 text-right text-lg font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="group hover:bg-white/60 transition-all">
                <td className="px-8 py-8">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-3xl tracking-tighter leading-tight uppercase">{article.designation}</span>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <code className="text-lg font-black bg-slate-100 px-3 py-1 rounded-xl text-slate-500 uppercase tracking-widest border border-slate-200/50">#{article.ref}</code>
                      <span className="text-lg font-black text-slate-400 tracking-tighter uppercase">• {article.location}</span>
                    </div>
                  </div>
                </td>
                    <td className="px-8 py-8">
                      <span className="text-sm font-black text-sky-700 bg-sky-50 px-4 py-2 rounded-xl uppercase tracking-widest border border-sky-100">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-8 py-8 text-center border-x border-slate-50">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-5xl font-black tracking-tighter",
                          article.quantity <= article.minStock ? "text-rose-600" : "text-sky-600"
                        )}>
                          {article.quantity}
                        </span>
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1">{article.unit}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-right font-black text-slate-900 text-2xl tracking-tighter">
                      {formatCurrency(article.price)}
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex justify-end gap-3 opacity-50 group-hover:opacity-100 transition-all">
                         <button onClick={() => onAction?.(article.id, 'IN')} className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm">
                           <PlusIcon className="w-6 h-6" />
                         </button>
                         <button onClick={() => onAction?.(article.id, 'OUT')} className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm">
                           <ArrowUpRight className="w-6 h-6" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredArticles.length === 0 && (
        <div className="card glass p-8 text-center flex flex-col items-center justify-center border-dashed border border-slate-200">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-slate-200" />
          </div>
          <h3 className="text-base font-black text-slate-950 uppercase tracking-tighter">Inventaire Vide</h3>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1 max-w-sm leading-relaxed">
            Aucun article n'est enregistré.
          </p>
          <button 
             onClick={onManageCatalog}
             className="mt-4 btn bg-sky-600 text-white shadow-sm px-4 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 transition-all"
          >
            Créer Référence
          </button>
        </div>
      )}
    </div>
  );
}
