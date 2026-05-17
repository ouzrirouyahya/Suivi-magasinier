import React, { useState } from 'react';
import { 
  Truck, 
  ArrowRight, 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  User,
  Package,
  FileText
} from 'lucide-react';
import { Article, SiteCode, Transfert, MouvementItem } from '../types';
import { SITES } from '../demoData';
import { cn, formatCurrency, generateId } from '../lib/utils';

interface TransfertPageProps {
  currentSite: SiteCode;
  articles: Article[];
  transferts: Transfert[];
  onAddTransfert: (t: Transfert) => void;
  onCompleteTransfert: (id: string, recepteur: string) => void;
}

export function TransfertPage({ currentSite, articles, transferts, onAddTransfert, onCompleteTransfert }: TransfertPageProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [targetSite, setTargetSite] = useState<SiteCode | ''>('');
  const [reference, setReference] = useState('');
  const [expediteur, setExpediteur] = useState('');
  const [items, setItems] = useState<MouvementItem[]>([]);
  const [search, setSearch] = useState('');

  const filteredArticles = articles.filter(a => 
    a.site === currentSite && a.active && 
    (a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 5);

  const addItem = (article: Article) => {
    if (items.some(i => i.articleId === article.id)) return;
    setItems([...items, { articleId: article.id, quantity: 1, price: article.price }]);
    setSearch('');
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.articleId !== id));

  const updateItem = (id: string, qty: number) => {
    setItems(items.map(i => i.articleId === id ? { ...i, quantity: qty } : i));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSite || items.length === 0) return;

    const transfert: Transfert = {
      id: generateId(),
      sourceSite: currentSite,
      targetSite: targetSite as SiteCode,
      dateEnvoi: new Date().toISOString(),
      reference,
      items,
      status: 'EN_TRANSIT',
      expediteur,
    };

    onAddTransfert(transfert);
    setIsCreating(false);
    setItems([]);
    setReference('');
    setTargetSite('');
  };

  const siteTransferts = transferts.filter(t => t.sourceSite === currentSite || t.targetSite === currentSite);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mission-control-bg p-4 flex-1">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Gestion des Transferts</h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">
            Flux Logistiques Inter-Sites et Transit
          </p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="btn btn-primary h-8 px-4 rounded-lg gap-1.5 shadow-sm text-xs"
          >
            <Plus className="w-4 h-4" /> Nouveau Transfert
          </button>
        )}
      </header>

      {isCreating ? (
        <div className="card glass p-4 space-y-4 animate-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest">Initialisation de l'Expédition</h3>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase">Annuler</button>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination</label>
              <select 
                className="w-full bg-white h-8 border border-slate-200 rounded px-3 text-xs outline-none focus:border-sky-500"
                value={targetSite}
                onChange={(e) => setTargetSite(e.target.value as SiteCode)}
                required
              >
                <option value="">Sélectionner le site...</option>
                {SITES.filter(s => s.code !== currentSite).map(s => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Référence BL / Transfert</label>
              <input 
                type="text"
                className="w-full bg-white h-8 border border-slate-200 rounded px-3 text-xs outline-none focus:border-sky-500"
                placeholder="Ex: TR-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Expéditeur</label>
              <input 
                type="text"
                className="w-full bg-white h-8 border border-slate-200 rounded px-3 text-xs outline-none focus:border-sky-500"
                value={expediteur}
                onChange={(e) => setExpediteur(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-3 space-y-3">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Rechercher des articles..."
                    className="w-full bg-white h-8 pl-10 pr-4 border border-slate-200 rounded text-xs outline-none focus:border-sky-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && filteredArticles.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 overflow-hidden">
                      {filteredArticles.map(article => (
                        <button
                          key={article.id}
                          type="button"
                          onClick={() => addItem(article)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        >
                          <p className="font-bold text-slate-800 text-xs">{article.designation}</p>
                          <p className="text-[9px] text-slate-400 font-mono">Dispo: {article.quantity} {article.unit}</p>
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="overflow-hidden border border-slate-100 rounded">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <th className="px-3 py-2">Article</th>
                        <th className="px-3 py-2 text-center">Qté</th>
                        <th className="px-3 py-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map(item => {
                        const article = articles.find(a => a.id === item.articleId)!;
                        return (
                          <tr key={item.articleId}>
                            <td className="px-3 py-2">
                              <p className="font-bold text-slate-900 text-xs">{article.designation}</p>
                              <p className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">{article.ref}</p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center">
                                <input 
                                  type="number"
                                  min="1"
                                  max={article.quantity}
                                  className="w-16 bg-slate-100 rounded px-2 py-1 text-center font-black text-xs"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.articleId, Number(e.target.value))}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button type="button" onClick={() => removeItem(item.articleId)} className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && (
                        <tr><td colSpan={3} className="py-6 text-center text-slate-400 font-bold uppercase text-[9px]">Aucun item sélectionné</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button 
                type="submit" 
                disabled={items.length === 0}
                className="btn btn-primary h-8 px-6 rounded-lg shadow-sm text-xs"
              >
                Lancer le Convoi
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {siteTransferts.length > 0 ? siteTransferts.map((t) => (
            <div key={t.id} className="card glass p-3 border-l-2 hover:border-sky-500 transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                    t.status === 'EN_TRANSIT' ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  )}>
                    {t.status === 'EN_TRANSIT' ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900 tracking-tighter uppercase">{t.reference}</h4>
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest",
                        t.status === 'EN_TRANSIT' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-slate-400 uppercase">
                      <span className={cn(t.sourceSite === currentSite ? "text-sky-600 font-black" : "")}>{t.sourceSite}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className={cn(t.targetSite === currentSite ? "text-sky-600 font-black" : "")}>{t.targetSite}</span>
                      <span className="mx-1 opacity-30">•</span>
                      <span>{new Date(t.dateEnvoi).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Items</p>
                    <p className="text-xs font-black text-slate-900 leading-none">{t.items.length}</p>
                  </div>
                  {t.status === 'EN_TRANSIT' && t.targetSite === currentSite && (
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[8px] font-black text-rose-500 uppercase animate-pulse">Signature Requise</p>
                      <button 
                        onClick={() => {
                          const name = prompt('Nom complet pour réception :');
                          if (name) onCompleteTransfert(t.id, name);
                        }}
                        className="btn btn-primary h-7 px-3 rounded text-[9px] tracking-widest shadow-sm group"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-300 group-hover:rotate-12 transition-transform" />
                        Signer
                      </button>
                    </div>
                  )}
                  {t.status === 'RECU' && (
                    <div className="text-right flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                      <div>
                        <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-0.5">Reçu par</p>
                        <p className="text-[10px] font-bold text-slate-900 leading-none">{t.recepteur}</p>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="card glass p-10 flex flex-col items-center justify-center text-center opacity-40">
              <Package className="w-10 h-10 mb-2 text-slate-300" />
              <h3 className="text-sm font-black uppercase tracking-widest">Aucun transfert actif</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Le réseau logistique est au repos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
