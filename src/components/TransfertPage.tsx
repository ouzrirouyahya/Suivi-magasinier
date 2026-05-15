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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 mission-control-bg min-h-screen p-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tighter uppercase leading-none">Gestion des Transferts</h2>
          <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-500" /> Flux Logistiques Inter-Sites
          </p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="btn btn-primary h-14 px-8 rounded-2xl gap-2 shadow-sky-200"
          >
            <Plus className="w-5 h-5" /> Nouveau Transfert
          </button>
        )}
      </header>

      {isCreating ? (
        <div className="card glass p-8 space-y-8 animate-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tighter">Initialisation de l'Expédition</h3>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-900 font-black text-xs uppercase">Annuler</button>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination</label>
              <select 
                className="input-field"
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

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Référence BL / Transfert</label>
              <input 
                type="text"
                className="input-field"
                placeholder="Ex: TR-001 / SMI-KOU"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Expéditeur</label>
              <input 
                type="text"
                className="input-field"
                value={expediteur}
                onChange={(e) => setExpediteur(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-3 space-y-4">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Rechercher des articles à transférer..."
                    className="input-field pl-12 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && filteredArticles.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                      {filteredArticles.map(article => (
                        <button
                          key={article.id}
                          type="button"
                          onClick={() => addItem(article)}
                          className="w-full text-left px-6 py-4 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        >
                          <p className="font-bold text-slate-900">{article.designation}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Dispo: {article.quantity} {article.unit}</p>
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="table-container shadow-none ring-1 ring-slate-100">
                  <table className="data-table">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th>Article</th>
                        <th className="text-center">Qté à Expédier</th>
                        <th className="text-center w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map(item => {
                        const article = articles.find(a => a.id === item.articleId)!;
                        return (
                          <tr key={item.articleId}>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{article.designation}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{article.ref}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <input 
                                  type="number"
                                  min="1"
                                  max={article.quantity}
                                  className="w-24 bg-slate-100 rounded-xl px-3 py-2 text-center font-black"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.articleId, Number(e.target.value))}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button type="button" onClick={() => removeItem(item.articleId)} className="text-rose-500"><Trash2 className="w-5 h-5" /></button>
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && (
                        <tr><td colSpan={3} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Aucun item sélectionné</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button 
                type="submit" 
                disabled={items.length === 0}
                className="btn btn-primary h-14 px-12 rounded-2xl shadow-sky-200"
              >
                Lancer le Convoi
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {siteTransferts.length > 0 ? siteTransferts.map((t) => (
            <div key={t.id} className="card glass p-6 border-l-4 hover:border-sky-500 transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                    t.status === 'EN_TRANSIT' ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  )}>
                    {t.status === 'EN_TRANSIT' ? <Clock className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{t.reference}</h4>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        t.status === 'EN_TRANSIT' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400 uppercase">
                      <span className={cn(t.sourceSite === currentSite ? "text-sky-600 font-black" : "")}>{t.sourceSite}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className={cn(t.targetSite === currentSite ? "text-sky-600 font-black" : "")}>{t.targetSite}</span>
                      <span className="mx-2 opacity-30">•</span>
                      <span>{new Date(t.dateEnvoi).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Items</p>
                    <p className="text-lg font-black text-slate-900 leading-none">{t.items.length}</p>
                  </div>
                  {t.status === 'EN_TRANSIT' && t.targetSite === currentSite && (
                    <button 
                      onClick={() => {
                        const name = prompt('Nom du réceptionnaire :');
                        if (name) onCompleteTransfert(t.id, name);
                      }}
                      className="btn btn-primary h-12 rounded-xl text-[10px] tracking-widest shadow-sky-200"
                    >
                      Réceptionner le Convoi
                    </button>
                  )}
                  {t.status === 'RECU' && (
                    <div className="text-right flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                      <div>
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-0.5">Reçu par</p>
                        <p className="text-xs font-black text-slate-900 leading-none">{t.recepteur}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="card glass p-20 flex flex-col items-center justify-center text-center opacity-40">
              <Package className="w-16 h-16 mb-4 text-slate-300" />
              <h3 className="text-xl font-black uppercase tracking-tighter">Aucun transfert actif</h3>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Le réseau logistique est au repos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
