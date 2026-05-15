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
  const lowStockArticles = articles.filter(a => a.active && a.quantity <= a.minStock);
  
  // Group by site
  const siteGroups = lowStockArticles.reduce((acc, a) => {
    acc[a.site] = (acc[a.site] || []).concat(a);
    return acc;
  }, {} as Record<string, Article[]>);

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
             <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Centre d'Alertes</h2>
             <p className="text-rose-600 font-extrabold uppercase text-[10px] tracking-widest mt-1">
               {lowStockArticles.length} Ruptures de stock détectées sur le réseau
             </p>
           </div>
        </div>
      </header>

      {Object.entries(siteGroups).length > 0 ? (
        <div className="grid grid-cols-1 gap-12">
          {Object.entries(siteGroups).sort(([siteA], [siteB]) => siteA === currentSite ? -1 : 1).map(([site, siteArticles]) => (
            <section key={site} className={cn(
              "space-y-6 p-8 rounded-[3rem] border-2",
              site === currentSite ? "bg-white border-sky-600 shadow-2xl shadow-sky-100" : "bg-slate-50 border-slate-200 opacity-80"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Site : {site}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                      {siteArticles.length} Articles en état critique
                    </p>
                  </div>
                </div>
                {site === currentSite && (
                   <span className="px-4 py-1.5 bg-sky-100 text-sky-700 text-[10px] font-black tracking-widest uppercase rounded-full border border-sky-200">
                     Votre Royaume Actuel
                   </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {siteArticles.map(article => {
                  const Icon = getTypeIcon(article.type);
                  const isZero = article.quantity === 0;
                  return (
                    <div key={article.id} className={cn(
                      "card glass p-6 border-b-4 transition-all hover:-translate-y-1",
                      isZero ? "border-rose-600 bg-rose-50/30" : "border-amber-500 bg-amber-50/30"
                    )}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-2 rounded-xl", isZero ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600")}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-mono font-black text-slate-400 uppercase">#{article.ref}</span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-900 leading-tight mb-4 line-clamp-1">{article.designation}</h4>
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock Actuel</p>
                          <p className={cn("text-3xl font-black mt-1", isZero ? "text-rose-600" : "text-amber-600")}>
                            {article.quantity} <span className="text-[10px] uppercase font-bold text-slate-400">{article.unit}</span>
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">Min. Requis: {article.minStock}</p>
                        </div>
                        {site === currentSite && (
                          <button 
                            onClick={() => onAction(article.id, 'IN')}
                            className="btn btn-primary h-12 w-12 p-0 flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-sky-500/10"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center card glass flex flex-col items-center justify-center border-dashed border-2">
           <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6">
             <Package className="w-12 h-12" />
           </div>
           <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tout est Optimal</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 max-w-sm mx-auto">
             Aucune rupture ou seuil critique n'a été détecté pour le moment. Votre chaîne d'approvisionnement est stable.
           </p>
        </div>
      )}
    </div>
  );
}
