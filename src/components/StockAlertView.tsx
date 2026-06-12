import React from 'react';
import { AlertCircle, ArrowRight, Package, MapPin, Truck, Droplets, Drill, Shield } from 'lucide-react';
import { Article, SiteCode } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface StockAlertViewProps {
  articles: Article[];
  currentSite: SiteCode;
  onAction: (id: string, action: 'IN' | 'OUT') => void;
}

export function StockAlertView({ articles, currentSite, onAction }: StockAlertViewProps) {
  const lowStockArticles = articles.filter(a => a.active && a.site === currentSite && a.quantity <= a.minStock);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ENGINS': return Truck;
      case 'PERFORATEURS': return Drill;
      case 'CONSOMMABLES': return Droplets;
      case 'EPI': return Shield;
      default: return Package;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
           <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-200">
             <AlertCircle className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Centre d'Alertes</h2>
             <p className="text-xl text-rose-600 font-bold uppercase tracking-[0.05em] mt-3 opacity-80">
               {currentSite} — {lowStockArticles.length} rupture{lowStockArticles.length > 1 ? 's' : ''} ou stock{lowStockArticles.length > 1 ? 's' : ''} critique{lowStockArticles.length > 1 ? 's' : ''} à réapprovisionner
             </p>
           </div>
        </div>
      </header>

      {lowStockArticles.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lowStockArticles.map(article => {
            const Icon = getTypeIcon(article.type);
            const isZero = article.quantity === 0;
            return (
              <div key={article.id} className={cn(
                "card glass p-6 border-b-4 transition-all hover:-translate-y-1 shadow-md",
                isZero ? "border-rose-600 bg-rose-50/20" : "border-amber-500 bg-amber-50/20"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2 rounded-xl", isZero ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600")}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">#{article.ref}</span>
                </div>
                
                <h4 className="font-extrabold text-slate-905 text-base leading-snug mb-2 min-h-[3rem] line-clamp-2 uppercase">{article.designation}</h4>
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-4 bg-sky-50 px-2 py-1 rounded inline-block">
                  {article.category}
                </p>
                
                <div className="flex items-end justify-between pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock Actuel</p>
                    <p className={cn("text-3xl font-black mt-2 leading-none", isZero ? "text-rose-600" : "text-amber-600")}>
                      {article.quantity} <span className="text-xs uppercase font-extrabold text-slate-400">{article.unit}</span>
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-2 italic">Minimum requis: {article.minStock}</p>
                  </div>
                  
                  <button 
                    onClick={() => onAction(article.id, 'IN')}
                    className="btn bg-sky-600 text-white hover:bg-sky-700 h-11 px-4 flex items-center justify-center gap-1.5 rounded-xl shadow-lg font-black text-xs uppercase tracking-wider cursor-pointer"
                    title="Enregistrer un Bon d'Entrée pour réapprovisionner"
                  >
                    Réappro <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-32 text-center card glass flex flex-col items-center justify-center border-dashed border-2">
           <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
             <Package className="w-12 h-12" />
           </div>
           <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tout est Optimal sur {currentSite}</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 max-w-sm mx-auto leading-relaxed">
             Aucune rupture ou seuil critique n'a été détecté pour le moment. Votre stock est suffisant.
           </p>
        </div>
      )}
    </div>
  );
}
