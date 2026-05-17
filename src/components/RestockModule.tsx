import React from 'react';
import { ShoppingCart, Plus, ClipboardList, Send, CheckCircle2, Package, Search, Filter, Trash2, Printer, History } from 'lucide-react';
import { SiteCode, Article, PurchaseRequest } from '../types';
import { cn } from '../lib/utils';

interface RestockModuleProps {
  site: SiteCode;
  articles: Article[];
  purchaseRequests: PurchaseRequest[];
  onCreatePR: (items: any[]) => void;
  onUpdatePRStatus: (prId: string, status: PurchaseRequest['status']) => void;
}

export function RestockModule({ site, articles, purchaseRequests, onCreatePR, onUpdatePRStatus }: RestockModuleProps) {
  const [view, setView] = React.useState<'ALERTS' | 'HISTORY' | 'CREATE'>('ALERTS');
  const [search, setSearch] = React.useState('');
  const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});

  const lowStockArticles = articles.filter(a => 
    a.site === site && 
    a.quantity <= a.minStock && 
    (a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase()))
  );

  const siteRequests = purchaseRequests
    .filter(pr => pr.site === site)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleSelection = (article: Article) => {
    if (selectedItems[article.id]) {
      const { [article.id]: _, ...rest } = selectedItems;
      setSelectedItems(rest);
    } else {
      setSelectedItems({ ...selectedItems, [article.id]: (article.minStock * 2) - article.quantity });
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    setSelectedItems({ ...selectedItems, [id]: qty });
  };

  const handleCreate = () => {
    const items = Object.entries(selectedItems).map(([id, quantity]) => ({
      articleId: id,
      quantity,
      lastPrice: articles.find(a => a.id === id)?.price || 0
    }));
    onCreatePR(items);
    setSelectedItems({});
    setView('HISTORY');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Réapprovisionnement</h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">Gestion des demandes d'achat et ruptures stock</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setView('ALERTS')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              view === 'ALERTS' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Alertes Stock
          </button>
          <button 
            onClick={() => setView('HISTORY')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              view === 'HISTORY' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Historique DA
          </button>
        </div>
      </header>

      {view === 'ALERTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-8 bg-rose-50 border-rose-100">
              <p className="text-sm font-black text-rose-400 uppercase tracking-widest mb-2">Ruptures Critiques</p>
              <h4 className="text-5xl font-black text-rose-600 tracking-tighter">
                {lowStockArticles.filter(a => a.quantity === 0).length}
              </h4>
              <p className="text-xs font-bold text-rose-500 uppercase mt-4">Articles à quantité zéro</p>
            </div>
            <div className="card p-8 bg-amber-50 border-amber-100">
              <p className="text-sm font-black text-amber-500 uppercase tracking-widest mb-2">Stock Alerte</p>
              <h4 className="text-5xl font-black text-amber-600 tracking-tighter">
                {lowStockArticles.filter(a => a.quantity > 0).length}
              </h4>
              <p className="text-xs font-bold text-amber-500 uppercase mt-4">Sous le seuil minimum</p>
            </div>
            <div className="card p-8 bg-sky-50 border-sky-100">
              <p className="text-sm font-black text-sky-500 uppercase tracking-widest mb-2">Sélection DA</p>
              <h4 className="text-5xl font-black text-sky-600 tracking-tighter">
                {Object.keys(selectedItems).length}
              </h4>
              <p className="text-xs font-bold text-sky-500 uppercase mt-4">Articles dans le panier</p>
            </div>
          </div>

          <div className="card glass p-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Filtrer les alertes..." 
                className="input-field pl-12 h-12 text-lg font-black bg-white/50 border-transparent rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {Object.keys(selectedItems).length > 0 && (
              <button 
                onClick={handleCreate}
                className="btn bg-sky-600 text-white h-12 px-8 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-200"
              >
                Générer Demande d'Achat
              </button>
            )}
          </div>

          <div className="card overflow-hidden rounded-3xl border border-slate-100 shadow-2xl">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Article</th>
                  <th className="px-8 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Stock Actuel</th>
                  <th className="px-8 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Seuil Min</th>
                  <th className="px-8 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Quantité à Commander</th>
                  <th className="px-8 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockArticles.map(article => {
                  const isSelected = !!selectedItems[article.id];
                  return (
                    <tr key={article.id} className={cn("group hover:bg-slate-50/50 transition-all", isSelected && "bg-sky-50/30")}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-lg uppercase">{article.designation}</span>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">REF: #{article.ref}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn(
                          "text-2xl font-black",
                          article.quantity === 0 ? "text-rose-600" : "text-amber-600"
                        )}>
                          {article.quantity} <span className="text-xs uppercase">{article.unit}</span>
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-lg font-black text-slate-400">{article.minStock}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {isSelected ? (
                          <input 
                            type="number" 
                            className="w-24 h-10 border-2 border-sky-200 rounded-xl text-center font-black text-lg focus:border-sky-500 outline-none"
                            value={selectedItems[article.id]}
                            onChange={(e) => updateQuantity(article.id, Number(e.target.value))}
                          />
                        ) : (
                          <span className="text-slate-300 font-black italic">Non sélectionné</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          onClick={() => toggleSelection(article)}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-sky-600 text-white shadow-lg shadow-sky-200" 
                              : "bg-white border-2 border-slate-100 text-slate-400 hover:border-sky-200 hover:text-sky-600"
                          )}
                        >
                          {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'HISTORY' && (
        <div className="space-y-6">
          {siteRequests.length === 0 ? (
            <div className="card p-20 flex flex-col items-center justify-center text-center opacity-50">
              <History className="w-16 h-16 text-slate-200 mb-6" />
              <h3 className="text-3xl font-black text-slate-900 uppercase">Aucune demande</h3>
              <p className="text-lg text-slate-400 font-bold mt-2">Votre historique de réapprovisionnement est vide.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {siteRequests.map(pr => (
                <div key={pr.id} className="card p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
                  <div className={cn(
                    "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 group-hover:opacity-10 transition-opacity",
                    pr.status === 'RECU' ? "bg-emerald-500" : "bg-sky-500"
                  )} />
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">REFERENCE DA</p>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{pr.reference || `DA-${pr.id.slice(0, 8)}`}</h3>
                      <p className="text-sm text-slate-400 font-bold mt-1">{new Date(pr.date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      pr.status === 'RECU' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                      pr.status === 'COMMANDE' ? "bg-sky-50 text-sky-600 border-sky-100" :
                      "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {pr.status}
                    </div>
                  </div>

                  <div className="space-y-4 mb-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Contenu de la demande</p>
                    {pr.items.map(item => {
                      const art = articles.find(a => a.id === item.articleId);
                      return (
                        <div key={item.articleId} className="flex justify-between items-center group/item p-2 hover:bg-slate-50 rounded-xl transition-colors">
                          <div>
                            <p className="text-sm font-black text-slate-700 uppercase group-hover/item:text-sky-900">{art?.designation || 'Article supprimé'}</p>
                            <p className="text-[10px] font-mono font-black text-slate-400">REF: #{art?.ref}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-slate-950">x{item.quantity}</p>
                            <p className="text-[10px] font-black text-slate-300 uppercase">{art?.unit}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-sky-50 hover:text-sky-600 transition-all active:scale-95 shadow-sm">
                        <Printer className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 shadow-sm">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      {pr.status === 'ENVOYE' && (
                        <button 
                          onClick={() => onUpdatePRStatus(pr.id, 'COMMANDE')}
                          className="px-6 h-10 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-sky-600 transition-all active:scale-95"
                        >
                          Marquer Commandé
                        </button>
                      )}
                      {pr.status === 'COMMANDE' && (
                        <button 
                          onClick={() => onUpdatePRStatus(pr.id, 'RECU')}
                          className="px-6 h-10 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          Réception Totale
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
