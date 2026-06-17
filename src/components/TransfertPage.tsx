import React, { useState, useMemo, useEffect } from 'react';
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
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react';
import { Article, SiteCode, Transfert, MouvementItem, UserAccount } from '../types';
import { SITES } from '../demoData';
import { cn, formatCurrency, generateId } from '../lib/utils';

interface TransfertPageProps {
  currentSite: SiteCode;
  articles: Article[];
  transferts: Transfert[];
  onAddTransfert: (t: Transfert) => void;
  onCompleteTransfert: (id: string, recepteur: string) => void;
  currentUser?: UserAccount | null;
}

export function TransfertPage({ currentSite, articles, transferts, onAddTransfert, onCompleteTransfert, currentUser }: TransfertPageProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [targetSite, setTargetSite] = useState<SiteCode | ''>('');
  const [reference, setReference] = useState('');
  const [expediteur, setExpediteur] = useState('');
  const [items, setItems] = useState<MouvementItem[]>([]);
  const [search, setSearch] = useState('');

  // UI state for collapsible shipment detail blocks (folded by default)
  const [expandedTransferts, setExpandedTransferts] = useState<Record<string, boolean>>({});

  // Clean, modal-free receiver signing session states
  const [signingId, setSigningId] = useState<string | null>(null);
  const [recName, setRecName] = useState('');

  // Quick filters & search query inside the Logistical flow board
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_TRANSIT' | 'RECU' | 'A_SIGNER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto pre-fill sender agent when creating a new transfer to minimize repetitive clicks
  useEffect(() => {
    if (isCreating && currentUser?.name && !expediteur) {
      setExpediteur(currentUser.name);
    }
  }, [isCreating, currentUser, expediteur]);

  const filteredArticles = articles.filter(a => 
    (currentSite === 'ALL' ? true : a.site === currentSite) && a.active && 
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

  const siteTransferts = useMemo(() => {
    return transferts.filter(t => currentSite === 'ALL' ? true : (t.sourceSite === currentSite || t.targetSite === currentSite));
  }, [transferts, currentSite]);

  const filteredTransferts = useMemo(() => {
    return siteTransferts.filter(t => {
      // 1. Status and workflow categories match
      if (statusFilter === 'EN_TRANSIT' && t.status !== 'EN_TRANSIT') return false;
      if (statusFilter === 'RECU' && t.status !== 'RECU') return false;
      if (statusFilter === 'A_SIGNER' && (t.status !== 'EN_TRANSIT' || t.targetSite !== currentSite)) return false;

      // 2. Direct keyword checks on reference, sender, receiver and items list
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRef = t.reference.toLowerCase().includes(query);
        const matchesExp = t.expediteur?.toLowerCase().includes(query) || false;
        const matchesRec = t.recepteur?.toLowerCase().includes(query) || false;
        const matchesItems = t.items.some(item => {
          const art = articles.find(a => a.id === item.articleId);
          return art?.designation.toLowerCase().includes(query) || art?.ref.toLowerCase().includes(query);
        });
        return matchesRef || matchesExp || matchesRec || matchesItems;
      }

      return true;
    });
  }, [siteTransferts, statusFilter, searchQuery, articles, currentSite]);

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
        <div className="space-y-4">
          {/* Dashboard Summary and Filter Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
            {/* Status Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                  statusFilter === 'ALL'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                )}
              >
                Tous ({siteTransferts.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('EN_TRANSIT')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                  statusFilter === 'EN_TRANSIT'
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white text-amber-600 border border-amber-200/50 hover:bg-amber-50"
                )}
              >
                <Clock className="w-3 h-3" /> En Transit ({siteTransferts.filter(t => t.status === 'EN_TRANSIT').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('A_SIGNER')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                  statusFilter === 'A_SIGNER'
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-white text-rose-600 border border-rose-200/50 hover:bg-rose-50"
                )}
              >
                <AlertTriangle className="w-3 h-3" /> À Réceptionner ({siteTransferts.filter(t => t.status === 'EN_TRANSIT' && t.targetSite === currentSite).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RECU')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                  statusFilter === 'RECU'
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white text-emerald-600 border border-emerald-200/50 hover:bg-emerald-50"
                )}
              >
                <CheckCircle2 className="w-3 h-3" /> Reçus ({siteTransferts.filter(t => t.status === 'RECU').length})
              </button>
            </div>

            {/* Quick Search Bar */}
            <div className="relative flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher BL, expéditeur, etc..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-black outline-none transition-all placeholder:font-bold focus:border-sky-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-[10px]"
                >
                  ✖
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredTransferts.length > 0 ? filteredTransferts.map((t) => (
              <div key={t.id} className="card glass p-4 border-l-2 hover:border-sky-500 transition-all group space-y-3">
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
                        {t.status === 'EN_TRANSIT' && t.targetSite === currentSite && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest bg-rose-100 text-rose-700 animate-pulse">
                            Action requise
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-slate-400 uppercase">
                        <span className={cn(t.sourceSite === currentSite ? "text-sky-600 font-black" : "")}>{t.sourceSite}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                        <span className={cn(t.targetSite === currentSite ? "text-sky-600 font-black" : "")}>{t.targetSite}</span>
                        <span className="mx-1 opacity-30">•</span>
                        <span>{new Date(t.dateEnvoi).toLocaleDateString()}</span>
                      </div>
                      {/* Operational trace: Who dispatched this convoi? */}
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">
                        <User className="w-3 h-3 text-slate-450" />
                        <span>Expéditeur: <strong className="text-slate-800 font-black">{t.expediteur || 'Inconnu'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Lignes</p>
                      <p className="text-xs font-black text-slate-900 leading-none">{t.items.length}</p>
                      
                      {/* Toggle button for loader detail list */}
                      <button
                        type="button"
                        onClick={() => setExpandedTransferts(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                        className="text-[9px] font-black text-sky-600 hover:text-sky-850 flex items-center justify-end gap-0.5 mt-1.5 transition-colors uppercase ml-auto"
                      >
                        <span>{expandedTransferts[t.id] ? "Replier" : "Détails"}</span>
                        {expandedTransferts[t.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {t.status === 'EN_TRANSIT' && t.targetSite === currentSite && (
                      <div className="flex flex-col items-end gap-1">
                        {signingId === t.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="relative">
                              <input 
                                type="text"
                                placeholder="Signature (Nom)..."
                                className="bg-white border-2 border-sky-450 h-8 rounded-lg px-2.5 text-xs font-black outline-none uppercase placeholder:lowercase focus:ring-4 focus:ring-sky-500/15 min-w-[150px]"
                                value={recName}
                                onChange={(e) => setRecName(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && recName.trim()) {
                                    onCompleteTransfert(t.id, recName.trim());
                                    setSigningId(null);
                                    setRecName('');
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (recName.trim()) {
                                  onCompleteTransfert(t.id, recName.trim());
                                  setSigningId(null);
                                  setRecName('');
                                }
                              }}
                              disabled={!recName.trim()}
                              className="bg-sky-600 hover:bg-sky-700 text-white font-black h-8 px-3 rounded-lg text-[10px] uppercase shadow-sm flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSigningId(null);
                                setRecName('');
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-650 font-black p-1 bg-slate-100 hover:bg-slate-200 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <p className="text-[8px] font-black text-rose-500 uppercase animate-pulse">Signature Requise</p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSigningId(t.id);
                                setRecName(currentUser?.name || '');
                              }}
                              className="btn btn-primary h-7 px-3 rounded text-[9px] tracking-widest shadow-sm group"
                            >
                              <FileText className="w-3.5 h-3.5 text-sky-350 group-hover:rotate-12 transition-transform" />
                              Signer
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {t.status === 'RECU' && (
                      <div className="text-right flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-100">
                        <div>
                          <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-0.5 font-mono">Réceptionné</p>
                          <p className="text-[10px] font-black text-slate-900 leading-none uppercase">{t.recepteur}</p>
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible loaded content details (folded by default) */}
                {expandedTransferts[t.id] && (
                  <div className="pt-3 border-t border-slate-100/90 animate-in slide-in-from-top-1 duration-200">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-slate-405" />
                      Bordereau Logistique ({t.items.length} références)
                    </h5>
                    <div className="bg-slate-50 border border-slate-100/80 rounded-xl overflow-hidden shadow-inner">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="px-3 py-1.5">Désignation</th>
                            <th className="px-3 py-1.5 text-center w-24">Référence</th>
                            <th className="px-3 py-1.5 text-right w-24">Quantité</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {t.items.map(item => {
                            const article = articles.find(a => a.id === item.articleId) || articles.find(a => a.ref === item.articleId);
                            return (
                              <tr key={item.articleId} className="hover:bg-slate-100/30">
                                <td className="px-3 py-1.5">
                                  <span className="font-bold text-slate-800 text-xs">{article?.designation || 'Pièce de Rechange'}</span>
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className="text-[10px] font-black font-mono tracking-tighter text-slate-500 uppercase">{article?.ref || item.articleId}</span>
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <span className="text-xs font-black text-slate-900 font-mono">{item.quantity}</span>
                                  <span className="text-[9px] text-slate-400 font-bold ml-1 uppercase">{article?.unit || 'U'}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="card glass p-10 flex flex-col items-center justify-center text-center opacity-40">
                <Package className="w-10 h-10 mb-2 text-slate-300" />
                <h3 className="text-sm font-black uppercase tracking-widest">Aucun transfert actif</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Le réseau logistique est au repos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
