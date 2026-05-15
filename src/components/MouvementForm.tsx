import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, User, Truck, Drill, Wallet, ArrowDownLeft, ArrowUpRight, Search, LayoutGrid, Database, BookOpen, Layers } from 'lucide-react';
import { Article, Mouvement, MouvementType, MouvementItem, SiteCode, EnginMaster, PerfoMaster, AgentMaster, CatalogItem } from '../types';
import { cn, formatCurrency, generateId } from '../lib/utils';
import { SERVICES } from '../demoData';

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

  const catalogResults = catalog.filter(item => {
    if (!search || search.length < 2) return false;
    const matchesSearch = item.designation.toLowerCase().includes(search.toLowerCase()) || item.reference.toLowerCase().includes(search.toLowerCase());
    const matchesType = !categoryFilter || categoryFilter === 'ALL' || item.suggestedType === categoryFilter;
    // Don't show if already in articles for this site
    const alreadyInStock = articles.some(a => a.site === site && a.ref === item.reference);
    return matchesSearch && matchesType && !alreadyInStock;
  }).slice(0, 10);

  const isEpiOrOutils = categoryFilter === 'EPI' || categoryFilter === 'OUTILS_TRAVAUX';
  const isMachineRelated = categoryFilter === 'ENGINS' || categoryFilter === 'PERFORATEURS';

  const addItem = (article: Article) => {
    if (items.some(i => i.articleId === article.id)) return;
    
    if (type === 'SORTIE' && article.quantity === 0) {
      setValidationError(`ERREUR : Le stock de "${article.designation}" est épuisé. Réceptionnez du stock avant de tenter une sortie.`);
      return;
    }

    setItems([...items, { articleId: article.id, quantity: 1, price: article.price ?? 0 }]);
    setValidationError(null);
    setSearch('');
    setShowResults(false);
  };

  const importAndAddItem = (item: CatalogItem) => {
    if (!onArticleCreate) return;

    // Create a new article based on catalog item
    const newArticle: Article = {
      id: generateId(),
      site,
      ref: item.reference,
      designation: item.designation,
      type: item.suggestedType,
      category: item.functionalCategory,
      functionalCategory: item.functionalCategory,
      subCategory: item.subCategory,
      component: item.component,
      subComponent: item.subComponent,
      unit: 'Pcs',
      quantity: 0,
      minStock: 1,
      location: 'MAGASIN',
      price: item.price || 0,
      active: true,
      notes: item.notes
    };

    onArticleCreate(newArticle);
    
    // Add to current movement items
    setItems([...items, { articleId: newArticle.id, quantity: 1, price: item.price || 0 }]);
    setValidationError(null);
    setSearch('');
    setShowResults(false);
  };

  const removeItem = (articleId: string) => {
    setItems(items.filter(i => i.articleId !== articleId));
  };

  const updateItem = (articleId: string, updates: Partial<MouvementItem>) => {
    setItems(items.map(i => {
      if (i.articleId === articleId) {
        const article = articles.find(a => a.id === articleId);
        if (type === 'SORTIE' && article && updates.quantity && updates.quantity > article.quantity) {
          setValidationError(`Quantité maximale dépassée pour ${article.designation}. Stock disponible : ${article.quantity}`);
          return { ...i, ...updates, quantity: article.quantity };
        }
        return { ...i, ...updates };
      }
      return i;
    }));
  };

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (items.length === 0) {
      setValidationError('Veuillez ajouter au moins un article.');
      return;
    }

    if (type === 'SORTIE') {
      if (!categoryFilter) {
        setValidationError('Veuillez d\'abord sélectionner une catégorie de pièces.');
        return;
      }

      for (const item of items) {
        const article = articles.find(a => a.id === item.articleId);
        if (article && item.quantity > article.quantity) {
          setValidationError(`Stock insuffisant pour ${article.designation} (Disponible: ${article.quantity})`);
          return;
        }
      }

      if (isMachineRelated && categoryFilter === 'ENGINS' && (!targetEngin || !mecanicien)) {
        setValidationError('Les champs Engin et Mécanicien sont obligatoires.');
        return;
      }

      if (isMachineRelated && categoryFilter === 'PERFORATEURS' && (!targetPerfo || !mecanicien)) {
        setValidationError('Les champs Perforateur et Mécanicien sont obligatoires pour les pièces de rechange.');
        return;
      }

      if (isEpiOrOutils && !entityName) {
        setValidationError('Veuillez sélectionner l\'agent bénéficiaire.');
        return;
      }
    }

    const resolvedMecanicien = agents.find(a => a.id === mecanicien);
    const resolvedEngin = engins.find(e => e.id === targetEngin);
    const resolvedPerfo = perfos.find(p => p.id === targetPerfo);

    // Auto-resolve service from mecanicien if not already set (e.g. by agent benefit selection)
    const finalService = service || resolvedMecanicien?.service || '';

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
      service: finalService,
      motif: `${interventionType}: ${motif}`,
      notes,
      status,
      items
    };

    onSubmit(mouvement);
    setItems([]);
    setReference('');
    setEntityName('');
    setMecanicien('');
    setTargetEngin('');
    setTargetPerfo('');
    setService('');
  };

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between no-print gap-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl ring-1 ring-slate-900/10",
            type === 'ENTREE' ? "bg-emerald-500 text-white" : "bg-rose-800 text-white"
          )}>
            {type === 'ENTREE' ? <ArrowDownLeft className="w-8 h-8" /> : <ArrowUpRight className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight leading-none uppercase">
              {type === 'ENTREE' ? "Réception / Bon d'Entrée" : "Sortie / Bon de Consommation"}
            </h2>
            <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">
              <span className="text-sky-600 font-black">ENREGISTREMENT OFFICIEL</span> • ROYAUME DE {site}
            </p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col items-end ring-1 ring-slate-900/5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ID DOCUMENT
          </p>
          <p className="text-2xl font-mono font-black text-slate-900 tracking-tighter">{autoId}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card glass p-8 grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
          
          <div className="space-y-2 md:col-span-2 p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl">
            <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] ml-1">ÉTAPE 1 : Sélectionner la Catégorie de Pièce</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              {[
                { id: 'ENGINS', label: 'Engins / Véhicules', icon: Truck },
                { id: 'PERFORATEURS', label: 'Perforateurs', icon: Drill },
                { id: 'EPI', label: 'EPI', icon: User },
                { id: 'OUTILS_TRAVAUX', label: 'Outils de Travaux', icon: LayoutGrid },
                { id: 'AUTRES', label: 'Autres', icon: Plus },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    setItems([]); 
                    setShowResults(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                    categoryFilter === cat.id 
                      ? "bg-sky-600 border-sky-400 scale-105 shadow-xl shadow-sky-900/40" 
                      : "bg-slate-800 border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100"
                  )}
                >
                  <cat.icon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Sections */}
          {type === 'SORTIE' && isMachineRelated && (
            <div className="md:col-span-2 p-8 bg-slate-50 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-500">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> 
                  {categoryFilter === 'ENGINS' ? 'Engin / Véhicule' : 'Perforateur / Marteau'} 
                </label>
                <select 
                  className="input-field bg-white border-sky-100 focus:border-sky-500"
                  value={categoryFilter === 'ENGINS' ? targetEngin : targetPerfo}
                  onChange={(e) => categoryFilter === 'ENGINS' ? setTargetEngin(e.target.value) : setTargetPerfo(e.target.value)}
                  required
                >
                  <option value="">Choisir la machine...</option>
                  {categoryFilter === 'ENGINS' 
                    ? siteEngins.map(e => <option key={e.id} value={e.id}>{e.code} — {e.label}</option>)
                    : sitePerfos.map(p => <option key={p.id} value={p.id}>{p.code}</option>)
                  }
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-1">
                  {categoryFilter === 'PERFORATEURS' ? 'Foreur / Mécanicien Responsable' : 'Mécanicien en Charge'}
                </label>
                <select 
                  className="input-field bg-white border-sky-100"
                  value={mecanicien}
                  onChange={(e) => {
                    setMecanicien(e.target.value);
                    const agent = agents.find(a => a.id === e.target.value);
                    if (agent) setService(agent.service);
                  }}
                  required
                >
                  <option value="">Sélectionner dans le registre...</option>
                  {agents.filter(a => 
                    (a.service === 'MAINTENANCE' || 
                     a.service === 'MÉCANICIEN' || 
                     a.service === 'FOREUR / MINEUR' || 
                     a.service === 'FORAGE') && 
                    a.site === site
                  ).map(a => (
                    <option key={a.id} value={a.id}>{a.firstname} {a.lastname} — {a.service}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(type === 'ENTREE' || isEpiOrOutils) && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                {type === 'ENTREE' ? 'Fournisseur / Source' : 'Agent Bénéficiaire'}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300" />
                {type === 'ENTREE' ? (
                  <input 
                    type="text" 
                    placeholder="Nom de la société / Fournisseur"
                    className="input-field pl-12"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    required
                  />
                ) : (
                  <select 
                    className="input-field pl-12 appearance-none"
                    value={entityName}
                    onChange={(e) => {
                      const agent = agents.find(a => a.id === e.target.value);
                      if (agent) {
                        setEntityName(`${agent.firstname} ${agent.lastname} [${agent.matricule}]`);
                        setService(agent.service);
                      } else {
                        setEntityName('');
                      }
                    }}
                    required
                  >
                    <option value="">Sélectionner l'agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.firstname} {a.lastname} ({a.matricule})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {type === 'SORTIE' && (
            <div className="space-y-4 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Type & Motif de la Sortie</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'CORRECTIF', label: 'Correctif (Panne)', color: 'border-rose-500 text-rose-700 bg-rose-50' },
                  { id: 'PREVENTIF', label: 'Préventif (Entretien)', color: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
                  { id: 'ROUTINE', label: 'Routine / Consommable', color: 'border-slate-300 text-slate-700 bg-slate-50' },
                  { id: 'PROPRIO', label: 'Travaux Spéciaux', color: 'border-sky-500 text-sky-700 bg-sky-50' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInterventionType(t.id as any)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                      interventionType === t.id ? t.color : "border-slate-100 text-slate-400 bg-white hover:border-slate-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Détails du motif (Ex: Casse flexible, Entretien 250h...)"
                className="input-field"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Notes et Commentaires</label>
            <textarea 
              placeholder="Informations complémentaires, observations terrain..."
              className="input-field min-h-[100px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="card glass overflow-visible no-print">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Étape 2 : Ajouter des pièces ({categoryFilter || 'Choisir'})</h3>
                <div className="relative group">
                   <div className="absolute inset-0 bg-sky-500/5 rounded-2xl scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <p className="text-[10px] font-bold text-slate-400 italic">L'application filtre automatiquement les pièces selon la catégorie choisie ci-dessus.</p>
                </div>
              </div>
              
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="Référence ou désignation..."
                  className="input-field pl-12 bg-white"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  disabled={type === 'SORTIE' && !categoryFilter}
                />
                {(showResults && (search || (type === 'SORTIE' && categoryFilter)) && categoryFilter !== 'ALL') && (
                <div 
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[350px] flex flex-col"
                >
                  <div className="sticky top-0 bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center z-10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Disponible ({filteredArticles.length})</p>
                    <button 
                      type="button" 
                      onClick={() => setShowResults(false)}
                      className="text-[9px] font-black text-sky-600 uppercase hover:bg-sky-50 px-3 py-1 rounded-full transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredArticles.length > 0 && (
                      <div className="px-6 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                        <LayoutGrid className="w-3 h-3 text-slate-400" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Articles déjà en stock ({filteredArticles.length})</p>
                      </div>
                    )}
                    {filteredArticles.map(article => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => addItem(article)}
                        className="w-full text-left px-6 py-4 hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">{article.designation}</p>
                            {article.component && (
                              <p className="text-[9px] font-black text-sky-500 uppercase tracking-tighter mt-0.5">
                                {article.functionalCategory} / {article.component}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full whitespace-nowrap">{article.type}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{article.ref}</span>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter",
                            article.quantity > 10 ? "text-emerald-600" : article.quantity > 0 ? "text-amber-600" : "text-rose-600 font-black"
                          )}>
                            DISPO: {article.quantity} {article.unit}
                          </span>
                        </div>
                      </button>
                    ))}

                    {catalogResults.length > 0 && (
                      <div className="px-6 py-2 bg-indigo-50/50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="w-3 h-3 text-indigo-400" />
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Résultats du Master Catalog ({catalogResults.length})</p>
                        </div>
                        {type === 'SORTIE' && (
                           <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase">Indisponible sur Site</span>
                        )}
                      </div>
                    )}
                    {catalogResults.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (type === 'ENTREE') {
                            importAndAddItem(item);
                          } else {
                            alert("Cet article n'est pas encore en stock sur ce site. Vous devez faire un Bon d'Entrée au préalable.");
                          }
                        }}
                        className={cn(
                          "w-full text-left px-6 py-4 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0",
                          type === 'SORTIE' && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">{item.designation}</p>
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mt-0.5">
                              {item.functionalCategory} / {item.component}
                            </p>
                          </div>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">MASTER</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{item.reference}</span>
                          {type === 'ENTREE' && (
                             <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                               <Plus className="w-3 h-3" /> Importer
                             </span>
                          )}
                        </div>
                      </button>
                    ))}

                    {filteredArticles.length === 0 && catalogResults.length === 0 && (
                      <div className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px]">Aucun article trouvé dans cette catégorie</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="table-container border-0 rounded-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description de l'Article</th>
                  <th className="text-right">Prix Unit.</th>
                  <th className="text-center">Quantité</th>
                  <th className="text-right">Total HT</th>
                  <th className="text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const article = articles.find(a => a.id === item.articleId);
                  const itemError = type === 'SORTIE' && article && item.quantity > article.quantity;
                  return (
                    <tr key={item.articleId} className={cn("group transition-colors", itemError ? "bg-rose-50/50" : "hover:bg-slate-50/50")}>
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-900 leading-none mb-1.5">{article?.designation || 'Article Inconnu'}</p>
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{article?.ref || 'N/A'} • {article?.unit || 'Unité'}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-32 text-right pr-4 pl-4 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                              value={item.price}
                              onChange={(e) => updateItem(item.articleId, { price: Number(e.target.value) })}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">P.U</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center gap-1.5">
                          <input 
                            type="number" 
                            min="1"
                            className={cn(
                              "w-28 text-center px-4 py-2.5 rounded-xl font-black text-lg outline-none transition-all",
                              itemError ? "bg-rose-100 text-rose-800 border-2 border-rose-400" : "bg-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                            )}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.articleId, { quantity: Number(e.target.value) })}
                          />
                          {itemError && (
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter whitespace-nowrap">⚠️ Insuffisant</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="font-black text-slate-950">{formatCurrency(item.quantity * item.price)}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeItem(item.articleId)}
                          className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-8 bg-slate-50/50 flex flex-col md:flex-row gap-8 items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Financière Totale</p>
                <p className="text-2xl font-black text-emerald-600 leading-none mt-1">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                type="button"
                onClick={() => { setStatus('BROUILLON'); setTimeout(() => (document.querySelector('form') as any)?.requestSubmit(), 10); }}
                className="btn btn-secondary h-16 px-8 rounded-3xl"
              >
                Enregistrer Brouillon
              </button>
              <button 
                type="submit" 
                onClick={() => setStatus('VALIDE')}
                disabled={items.length === 0 || !!validationError || items.some(i => type === 'SORTIE' && i.quantity > (articles.find(a => a.id === i.articleId)?.quantity || 0))}
                className="btn btn-primary h-16 px-12 rounded-3xl text-sm tracking-[0.2em] shadow-2xl shadow-sky-600/30"
              >
                {type === 'ENTREE' ? 'Valider et Ajouter au Stock' : 'Valider et Sortir du Stock'}
              </button>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="flex items-center gap-4 p-6 bg-rose-50 border-2 border-rose-200 rounded-3xl text-rose-800 animate-in shake-100">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Erreur de Validation</p>
              <p className="font-bold text-lg">{validationError}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
