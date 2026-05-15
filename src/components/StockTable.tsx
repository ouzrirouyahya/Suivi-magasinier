import React, { useState } from 'react';
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
  type: ArticleType;
  site: SiteCode;
  articles: Article[];
  onAction?: (id: string, action: 'IN' | 'OUT') => void;
  onManageCatalog?: () => void;
}

export function StockTable({ type, site, articles, onAction, onManageCatalog }: StockTableProps) {
  const [search, setSearch] = useState('');
  const [showGlobal, setShowGlobal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('GRID');

  const filteredArticles = articles.filter(a => {
    const matchesSite = showGlobal || a.site === site;
    const matchesType = a.type === type;
    const matchesSearch = !search || 
                        a.designation.toLowerCase().includes(search.toLowerCase()) || 
                        a.ref.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
    return matchesSite && matchesType && matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(articles.filter(a => a.type === type && a.site === site).map(a => a.category)));

  const getStockStatus = (article: Article) => {
    if (article.quantity === 0) return { label: 'RUPTURE', class: 'bg-rose-500 text-white', icon: AlertTriangle };
    if (article.quantity <= article.minStock) return { label: 'CRITIQUE', class: 'bg-amber-500 text-white', icon: AlertTriangle };
    return { label: 'OPTIMAL', class: 'bg-emerald-500 text-white', icon: Package };
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase flex items-center gap-3">
              <span className="w-2 h-10 bg-sky-600 rounded-full"></span>
              Stock {type.replace('_', ' ')}
            </h2>
            <button 
              onClick={onManageCatalog}
              className="mt-1 p-2 text-slate-400 hover:text-sky-600 transition-colors"
              title="Gérer le catalogue"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/50 shadow-sm">SITE: {site}</p>
            <p className="text-sky-600 font-black uppercase text-[10px] tracking-widest">{filteredArticles.length} Références actives</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {onManageCatalog && (
             <button 
               onClick={onManageCatalog}
               className="btn bg-white border border-slate-200 shadow-sm text-slate-700 px-6 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3"
             >
               <Package className="w-4 h-4 text-sky-600" /> Gérer le Catalogue
             </button>
          )}
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5">
            <button 
              onClick={() => setViewMode('TABLE')}
              className={cn("p-2.5 rounded-xl transition-all duration-300", viewMode === 'TABLE' ? "bg-white shadow-md text-sky-600 scale-105" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={cn("p-2.5 rounded-xl transition-all duration-300", viewMode === 'GRID' ? "bg-white shadow-md text-sky-600 scale-105" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="card glass p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl ring-1 ring-slate-900/5">
        <div className="relative flex-1 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              type="text" 
              placeholder="Rechercher par désignation ou référence OEM..."
              className="input-field pl-14 h-14 text-base bg-white/40 border-slate-200/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowGlobal(!showGlobal)}
            className={cn(
              "btn px-6 h-14 rounded-2xl gap-3 font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap",
              showGlobal ? "bg-sky-600 text-white shadow-sky-200" : "bg-white text-slate-400 border-slate-100"
            )}
            title="Voir le stock de tous les sites"
          >
            <MapPin className={cn("w-5 h-5", showGlobal ? "text-white" : "text-slate-300")} /> 
            {showGlobal ? "Vision Globale : ON" : "Vérifier Autres Sites"}
          </button>
        </div>
        <div className="w-full md:w-72 relative">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <select 
            className="input-field pl-14 h-14 appearance-none cursor-pointer bg-white/40 border-slate-200/50 font-bold text-slate-700"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Tout le Catalogue</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'GRID' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {filteredArticles.map((article, idx) => {
              const status = getStockStatus(article);
              const totalValue = article.quantity * article.price;
              
              return (
                <motion.div 
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition duration-500 blur-xl"></div>
                  <div className="relative card glass p-8 h-full flex flex-col bg-white/90 backdrop-blur-3xl border-slate-200/40 hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-xl ring-1 ring-slate-900/5">
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("px-3 py-1 rounded-full text-[9px] font-black tracking-widest flex items-center gap-1.5 shadow-sm", status.class)}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </div>
                      <span className="text-[10px] font-mono font-black text-slate-300 group-hover:text-sky-500 transition-colors uppercase tracking-tight">
                        #{article.ref}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 min-h-[3.5rem] line-clamp-2">
                      {article.designation}
                    </h3>

                    {article.component ? (
                      <p className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 uppercase tracking-tighter mb-4 w-fit">
                        {article.functionalCategory} / {article.component}
                      </p>
                    ) : (
                      <div className="h-9 mb-4"></div>
                    )}

                    <div className="space-y-4 mb-8">
                       <div className="flex items-center gap-3 text-slate-400">
                         <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/50">
                           <MapPin className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Emplacement</p>
                            <p className="text-sm font-bold text-slate-600">{article.location}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3 text-slate-400">
                         <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/50">
                           <TrendingUp className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Valeur Active</p>
                            <p className="text-sm font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                         </div>
                       </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-100/50">
                      <div className="flex items-end justify-between">
                         <div className="text-center">
                            <p className={cn("text-4xl font-black tracking-tighter leading-none", article.quantity <= article.minStock ? "text-rose-600" : "text-slate-900")}>
                               {article.quantity}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{article.unit}</p>
                         </div>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => onAction?.(article.id, 'IN')}
                              className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all duration-300 shadow-sm border border-sky-100/50"
                            >
                              <PlusIcon className="w-6 h-6" />
                            </button>
                            <button 
                              onClick={() => onAction?.(article.id, 'OUT')}
                              className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all duration-300 shadow-sm border border-rose-100/50"
                            >
                              <ArrowUpRight className="w-6 h-6" />
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
                  <th className="px-8 py-6">Code & Nomenclature</th>
                  <th className="px-8 py-6">Section</th>
                  <th className="px-8 py-6 text-center">Quantité</th>
                  <th className="px-8 py-6 text-right">Valeur Unitaire</th>
                  <th className="px-8 py-6 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="group hover:bg-white/60 transition-all">
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-base leading-tight">{article.designation}</span>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <code className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-widest border border-slate-200/50">#{article.ref}</code>
                      <span className="text-[10px] font-bold text-slate-400">• {article.location}</span>
                      {article.component && (
                        <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 uppercase tracking-tight">
                          {article.functionalCategory} / {article.component}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-sky-100">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-xl font-black",
                          article.quantity <= article.minStock ? "text-rose-600" : "text-slate-900"
                        )}>
                          {article.quantity}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{article.unit}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-black text-slate-900">{formatCurrency(article.price)}</p>
                      <p className="text-[9px] font-bold text-slate-400">Total: {formatCurrency(article.price * article.quantity)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                         <button onClick={() => onAction?.(article.id, 'IN')} className="p-2.5 bg-white shadow-xl border border-slate-100 text-emerald-600 rounded-xl hover:scale-110 active:scale-95 transition-all">
                           <PlusIcon className="w-5 h-5" />
                         </button>
                         <button onClick={() => onAction?.(article.id, 'OUT')} className="p-2.5 bg-white shadow-xl border border-slate-100 text-rose-600 rounded-xl hover:scale-110 active:scale-95 transition-all">
                           <ArrowUpRight className="w-5 h-5" />
                         </button>
                         <button className="p-2.5 bg-white shadow-xl border border-slate-100 text-slate-400 rounded-xl hover:scale-110 active:scale-95 transition-all">
                           <HistoryIcon className="w-5 h-5" />
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
        <div className="card glass p-20 text-center flex flex-col items-center justify-center border-dashed border-2 border-slate-200">
          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Inventaire Vide</h3>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 max-w-sm leading-relaxed">
            Aucun article n'est enregistré dans cette catégorie. Commencez par enrichir votre catalogue maître.
          </p>
          <button 
             onClick={onManageCatalog}
             className="mt-8 btn bg-sky-600 text-white shadow-xl shadow-sky-100 px-8 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 transition-all"
          >
            Créer la Première Référence
          </button>
        </div>
      )}
    </div>
  );
}
