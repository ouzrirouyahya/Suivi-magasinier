import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  User, 
  Truck, 
  Drill, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  LayoutGrid
} from 'lucide-react';
import { Article, Mouvement, MouvementItem, SiteCode, EnginMaster, PerfoMaster, AgentMaster, CatalogItem } from '../types';
import { cn, formatCurrency, generateId } from '../lib/utils';

interface MouvementFormProps {
  type: 'ENTREE' | 'SORTIE';
  site: SiteCode;
  articles: Article[];
  catalog: CatalogItem[];
  engins: EnginMaster[];
  perfos: PerfoMaster[];
  agents: AgentMaster[];
  onSubmit: (mouvement: Mouvement) => void;
  onArticleCreate?: (article: Article) => void;
  initialArticleId?: string;
}

export function MouvementForm({ type, site, articles, catalog, engins, perfos, agents, onSubmit, onArticleCreate, initialArticleId }: MouvementFormProps) {
  const [date] = useState(new Date().toISOString());
  const [reference, setReference] = useState('');
  const [entityName, setEntityName] = useState(''); 
  const [mecanicien, setMecanicien] = useState(''); 
  const [targetEngin, setTargetEngin] = useState(''); 
  const [targetPerfo, setTargetPerfo] = useState('');
  const [motif, setMotif] = useState('');
  const [interventionType, setInterventionType] = useState<'CORRECTIF' | 'PREVENTIF' | 'ROUTINE' | 'PROPRIO'>('ROUTINE');
  const [service, setService] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(type === 'SORTIE' ? '' : 'ALL');
  const [status, setStatus] = useState<'BROUILLON' | 'VALIDE'>('VALIDE');
  const [items, setItems] = useState<MouvementItem[]>(() => {
    if (initialArticleId) {
      const art = articles.find(a => a.id === initialArticleId);
      if (art) {
        return [{ articleId: art.id, quantity: 1, price: art.price ?? 0 }];
      }
    }
    return [];
  });
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const prefix = type === 'ENTREE' ? 'BE' : 'BS';
  const autoId = `${prefix}/${site}/${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const siteEngins = engins.filter(e => e.site === site);
  const sitePerfos = perfos.filter(p => p.site === site);

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !search || a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase());
    const matchesSite = a.site === site;
    const matchesCategory = !categoryFilter || categoryFilter === 'ALL' || a.type === categoryFilter;
    return matchesSearch && matchesSite && matchesCategory && a.active;
  }).slice(0, 50);

  const isEpiOrOutils = categoryFilter === 'EPI' || categoryFilter === 'OUTILS_TRAVAUX';
  const isMachineRelated = categoryFilter === 'ENGINS' || categoryFilter === 'PERFORATEURS';

  const addItem = (article: Article) => {
    if (items.some(i => i.articleId === article.id)) return;
    if (type === 'SORTIE' && article.quantity === 0) {
      setValidationError(`ERREUR : Stock épuisé pour "${article.designation}".`);
      return;
    }
    setItems([...items, { articleId: article.id, quantity: 1, price: article.price ?? 0 }]);
    setValidationError(null);
    setSearch('');
    setShowResults(false);
  };

  const removeItem = (articleId: string) => setItems(items.filter(i => i.articleId !== articleId));

  const updateItem = (articleId: string, updates: Partial<MouvementItem>) => {
    setItems(items.map(i => {
      if (i.articleId === articleId) {
        const article = articles.find(a => a.id === articleId);
        const validQty = updates.quantity !== undefined ? (isNaN(updates.quantity) ? i.quantity : updates.quantity) : i.quantity;
        const validPrice = updates.price !== undefined ? (isNaN(updates.price) ? i.price : updates.price) : i.price;
        if (type === 'SORTIE' && article && updates.quantity !== undefined && validQty > article.quantity) {
          setValidationError(`Stock insuffisant (${article.quantity})`);
          return { ...i, ...updates, quantity: article.quantity, price: validPrice };
        }
        return { ...i, ...updates, quantity: validQty, price: validPrice };
      }
      return i;
    }));
  };

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { setValidationError('Ajoutez des articles.'); return; }
    if (type === 'SORTIE' && !categoryFilter) { setValidationError('Sélectionnez une catégorie.'); return; }

    const resolvedMecanicien = agents.find(a => a.id === mecanicien);
    const resolvedEngin = engins.find(e => e.id === targetEngin);
    const resolvedPerfo = perfos.find(p => p.id === targetPerfo);

    const mouvement: Mouvement = {
      id: generateId(),
      site,
      date,
      type,
      reference,
      vendeur: type === 'ENTREE' ? entityName : undefined,
      demandeur: (type === 'SORTIE' && isEpiOrOutils) ? entityName : undefined,
      mecanicien: resolvedMecanicien ? `${resolvedMecanicien.firstname} ${resolvedMecanicien.lastname}` : mecanicien,
      engin: resolvedEngin ? resolvedEngin.code : targetEngin,
      perforateur: resolvedPerfo ? resolvedPerfo.code : targetPerfo,
      category: categoryFilter,
      service: service || resolvedMecanicien?.service || '',
      motif: `${interventionType}: ${motif}`,
      notes,
      status,
      items
    };

    onSubmit(mouvement);
  };

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex items-center justify-between no-print gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", type === 'ENTREE' ? "bg-emerald-500 text-white" : "bg-rose-800 text-white")}>
            {type === 'ENTREE' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase text-slate-950 tracking-tighter leading-tight">{type === 'ENTREE' ? "Bon de Réception" : "Bon de Sortie"}</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.05em] mt-1 opacity-70">MAGASIN: {site}</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ID DOCUMENT</p>
          <p className="text-lg font-mono font-black text-slate-950">{autoId}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card glass p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl border-slate-100">
          <div className="md:col-span-2 p-4 bg-slate-950 rounded-2xl text-white shadow-2xl">
            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1 opacity-70">Type de Matériel</label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-2">
              {[{ id: 'ENGINS', label: 'Engins', icon: Truck }, { id: 'PERFORATEURS', label: 'Perfos', icon: Drill }, { id: 'EPI', label: 'EPI', icon: User }, { id: 'OUTILS_TRAVAUX', label: 'Outils', icon: LayoutGrid }, { id: 'AUTRES', label: 'Autres', icon: Plus }].map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => { setCategoryFilter(cat.id); setItems([]); setShowResults(false); }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-2 rounded-xl transition-all border-2", 
                    categoryFilter === cat.id 
                      ? "bg-sky-600 border-sky-400 shadow-lg shadow-sky-500/20 scale-105" 
                      : "bg-slate-900 border-slate-800 opacity-50 hover:opacity-100"
                  )}
                >
                  <cat.icon className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {type === 'SORTIE' && isMachineRelated && (
            <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-1">Référence Machine</label>
                <select className="input-field h-10 text-xs font-black px-4" value={categoryFilter === 'ENGINS' ? targetEngin : targetPerfo} onChange={(e) => categoryFilter === 'ENGINS' ? setTargetEngin(e.target.value) : setTargetPerfo(e.target.value)} required>
                  <option value="">Sélectionner une machine...</option>
                  {categoryFilter === 'ENGINS' ? siteEngins.map(e => <option key={e.id} value={e.id}>{e.code}</option>) : sitePerfos.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-1">Opérateur / Mécanicien</label>
                <select className="input-field h-10 text-xs font-black px-4" value={mecanicien} onChange={(e) => setMecanicien(e.target.value)} required>
                  <option value="">Sélectionner un agent...</option>
                  {agents.filter(a => a.site === site).map(a => <option key={a.id} value={a.id}>{a.lastname} {a.firstname}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Justification du mouvement / Notes techniques</label>
            <textarea className="input-field h-20 p-4 text-xs font-medium leading-relaxed" placeholder="Détaillez le motif de l'intervention..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="card glass p-4 space-y-4 shadow-xl border-slate-100 rounded-2xl">
          <div className="relative group">
            <div className="absolute inset-0 bg-sky-500/5 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 relative z-10" />
            <input 
              type="text" 
              placeholder="RECHERCHER UN ARTICLE..." 
              className="input-field h-14 pl-14 text-lg font-black tracking-tight bg-white border border-slate-100 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 rounded-2xl relative z-10 transition-all uppercase"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              disabled={type === 'SORTIE' && !categoryFilter}
            />
            {showResults && search && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] max-h-80 overflow-y-auto p-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                {filteredArticles.map(article => (
                  <button key={article.id} type="button" onClick={() => addItem(article)} className="w-full text-left p-6 hover:bg-sky-50 rounded-[1.5rem] border border-transparent hover:border-sky-100 transition-all group/item">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-xl text-slate-900 group-hover/item:text-sky-900 transition-colors uppercase tracking-tight">{article.designation}</span>
                      <span className={cn(
                        "text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest",
                        article.quantity > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                      )}>
                        STK: {article.quantity}
                      </span>
                    </div>
                    <div className="text-sm font-mono font-black text-slate-400 uppercase tracking-widest">{article.ref}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-xs font-black tracking-widest">
                  <th className="text-left py-6 px-4">Article</th>
                  <th className="text-right py-6 w-48 px-4 font-black text-sky-600">Prix Unit. (MAD)</th>
                  <th className="text-center py-6 w-32 px-4">Quantité</th>
                  <th className="text-right py-6 w-16 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(item => {
                  const article = articles.find(a => a.id === item.articleId);
                  return (
                    <tr key={item.articleId} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-4">
                        <p className="font-black text-xl text-slate-900 leading-tight uppercase tracking-tight">{article?.designation}</p>
                        <p className="text-sm font-mono font-black text-slate-400 uppercase tracking-widest mt-1">{article?.ref}</p>
                      </td>
                      <td className="py-6 px-4">
                        <input 
                          type="number" 
                          step="0.01" 
                          className="w-full h-12 text-right p-4 rounded-xl border border-slate-200 font-black text-xl bg-white shadow-inner focus:border-sky-500 outline-none" 
                          value={item.price} 
                          onChange={(e) => updateItem(item.articleId, { price: Number(e.target.value) })} 
                        />
                      </td>
                      <td className="py-6 px-4">
                        <input 
                          type="number" 
                          min="1" 
                          className="w-full h-12 text-center p-4 rounded-xl border-2 border-slate-100 font-black text-2xl bg-white focus:border-sky-500 outline-none" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(item.articleId, { quantity: Number(e.target.value) })} 
                        />
                      </td>
                      <td className="py-6 px-4 text-right">
                        <button type="button" onClick={() => removeItem(item.articleId)} className="w-12 h-12 flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-8 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                 <Wallet className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-70">TOTAL VALEUR HT</p>
                <p className="text-5xl font-black text-slate-950 tracking-tighter tabular-nums">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <button 
                type="button" 
                onClick={() => { setStatus('BROUILLON'); setTimeout(() => (document.querySelector('form') as any)?.requestSubmit(), 10); }} 
                className="flex-1 sm:flex-none px-10 h-16 border-2 border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Brouillon
              </button>
              <button 
                type="submit" 
                onClick={() => setStatus('VALIDE')} 
                disabled={items.length === 0} 
                className="flex-1 sm:flex-none px-12 h-16 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-sky-600 transition-all disabled:opacity-50"
              >
                Valider & Générer Bon
              </button>
            </div>
          </div>
        </div>
        {validationError && <div className="p-3 bg-rose-50 text-rose-800 rounded-xl flex items-center gap-2 shadow-sm border border-rose-100"><AlertCircle className="w-5 h-5" /><p className="font-bold text-sm">{validationError}</p></div>}
      </form>
    </div>
  );
}
