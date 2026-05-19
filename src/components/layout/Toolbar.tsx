import React from 'react';
import { Search, Menu } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Article, SiteCode } from '../../types';

interface ToolbarProps {
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  articles: Article[];
  currentSite: SiteCode;
  onSearchFocus: () => void;
  onOpenMenu?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  globalSearch, 
  setGlobalSearch, 
  articles, 
  currentSite,
  onSearchFocus,
  onOpenMenu
}) => {
  const siteArticles = articles.filter(a => a.site === currentSite);
  const totalValue = siteArticles.reduce((sum, a) => sum + (a.quantity * a.price), 0);

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
