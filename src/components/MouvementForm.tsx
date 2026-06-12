import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
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
  LayoutGrid,
  Zap,
  ShoppingBag,
  Store,
  Check,
  Award
} from 'lucide-react';
import { Article, Mouvement, MouvementItem, SiteCode, EnginMaster, PerfoMaster, AgentMaster, CatalogItem } from '../types';
import { cn, formatCurrency, generateId } from '../lib/utils';

const QUICK_ITEMS = [
  {
    category: 'EPI / SÉCURITÉ',
    items: [
      { reference: 'EPI-GAN-01', designation: 'GANTS DE PROTECTION KEVLAR SRE REFORCÉ', price: 65, unit: 'PAIRE', suggestedType: 'EPI' },
      { reference: 'EPI-BOT-02', designation: 'BOTTES DE SÉCURITÉ SOUBLES S5 SRE MINE', price: 210, unit: 'PAIRE', suggestedType: 'EPI' },
      { reference: 'EPI-CAS-03', designation: 'CASQUE DE SÉCURITÉ MINE AVEC CLIP LAMPE LED', price: 145, unit: 'PIECE', suggestedType: 'EPI' },
      { reference: 'EPI-MAS-04', designation: 'DEMI-MASQUE RESPIRATOIRE DOUBLE CARTOUCHE FFP3', price: 380, unit: 'PIECE', suggestedType: 'EPI' },
      { reference: 'EPI-GILET-01', designation: 'GILET HAUTE VISIBILITÉ SRE AVEC BANDES RÉFLÉCHISSANTES', price: 95, unit: 'PIECE', suggestedType: 'EPI' }
    ]
  },
  {
    category: 'PIÈCES PERFORATEURS',
    items: [
      { reference: 'MB-T23-991A', designation: 'TIRANTS DE PERCUSSION COMPLET T23 MONTABERT', price: 1250, unit: 'PIECE', suggestedType: 'PERFORATEURS' },
      { reference: 'MB-HC50-BUSH-BE', designation: 'DOUILLE DE GUIDAGE EMMANCHEMENT CANNELÉ BRONZE', price: 950, unit: 'PIECE', suggestedType: 'PERFORATEURS' },
      { reference: 'MB-HC50-KM500', designation: 'PISTON DE PERCUSSION TREMPÉ HC50 MONTABERT', price: 8900, unit: 'PIECE', suggestedType: 'PERFORATEURS' },
      { reference: 'EP-ST2G-CRD-H', designation: 'PLAQUE D\'USURE COMPOSITE CARTER PRINCIPAL SRE', price: 450, unit: 'PIECE', suggestedType: 'PERFORATEURS' },
      { reference: 'MB-ACC-T38', designation: 'ROTULE D\'ACCOUPLEMENT ET DE ROTATION T38', price: 1750, unit: 'PIECE', suggestedType: 'PERFORATEURS' }
    ]
  },
  {
    category: 'MACHINES & PIÈCES ENGINS',
    items: [
      { reference: 'DEUTZ-FIL-GO', designation: 'FILTRE PRINCIPAL DOUBLE DE CARBURANT DEUTZ', price: 280, unit: 'PIECE', suggestedType: 'ENGINS' },
      { reference: 'DEUTZ-FIL-HUILE', designation: 'FILTRE À HUILE LUBRIFIANTE MOTEUR DEUTZ D914', price: 195, unit: 'PIECE', suggestedType: 'ENGINS' },
      { reference: 'FLEX-HP-500', designation: 'FLEXIBLE HYDRAULIQUE BLINDÉ HP 1/2 L=1200MM', price: 480, unit: 'PIECE', suggestedType: 'ENGINS' },
      { reference: 'ALT-DEUTZ-24V', designation: 'ALTERNATEUR SCELLÉ ÉTANCHE POUSSIÈRE 24V', price: 1850, unit: 'PIECE', suggestedType: 'ENGINS' },
      { reference: 'DEM-DEUTZ-24V', designation: 'DÉMARREUR ÉLECTRIQUE 24V DEUTZ SOUFFLET', price: 2900, unit: 'PIECE', suggestedType: 'ENGINS' }
    ]
  }
];

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
  const [date, setDate] = useState(() => new Date().toISOString());
  const [reference, setReference] = useState('');
  const [entityName, setEntityName] = useState(''); 
  const [receptionSource, setReceptionSource] = useState<'CENTRAL' | 'ACHAT_EXTERNE'>('CENTRAL');
  const [buyerName, setBuyerName] = useState('');
  const [mecanicien, setMecanicien] = useState(''); 
  const [mecanicienFreeText, setMecanicienFreeText] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [targetEngin, setTargetEngin] = useState(''); 
  const [targetPerfo, setTargetPerfo] = useState('');
  const [interventionType, setInterventionType] = useState<'CORRECTIF' | 'PREVENTIF' | 'ROUTINE' | 'PROPRIO'>('ROUTINE');
  const [service, setService] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(type === 'SORTIE' ? '' : 'ALL');
  const [items, setItems] = useState<(MouvementItem & { lineId: string })[]>(() => {
    if (initialArticleId) {
      const art = articles.find(a => a.id === initialArticleId);
      if (art) {
        return [{ lineId: generateId(), articleId: art.id, quantity: 1, price: art.price ?? 0 }];
      }
    }
    return [];
  });
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [localCreatedArticles, setLocalCreatedArticles] = useState<Article[]>([]);

  const prefix = type === 'ENTREE' ? 'BE' : 'BS';
  const autoId = useMemo(() => {
    return `${prefix}/${site}/${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }, [type, site]);

  const siteEngins = engins.filter(e => e.site === site);
  const sitePerfos = perfos.filter(p => p.site === site);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch = !search || a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase());
      const matchesSite = a.site === site;
      return matchesSearch && matchesSite && a.active;
    });
  }, [articles, search, site]);

  const sortedArticles = useMemo(() => {
    const sorted = [...filteredArticles];
    if (categoryFilter && categoryFilter !== 'ALL') {
      sorted.sort((a, b) => {
        const aMatch = a.type === categoryFilter ? 1 : 0;
        const bMatch = b.type === categoryFilter ? 1 : 0;
        return bMatch - aMatch;
      });
    }
    return sorted.slice(0, 50);
  }, [filteredArticles, categoryFilter]);

  const filteredCatalogItems = useMemo(() => {
    if (type !== 'ENTREE' || !search) return [];
    if (search.length < 2) return [];

    const normSearch = search.toLowerCase();
    const matches = (catalog || []).filter(c => {
      const matchesSearch = (c.designation || '').toLowerCase().includes(normSearch) || 
                            (c.reference || '').toLowerCase().includes(normSearch);
      const existsLocally = articles.some(a => a.site === site && a.ref.trim().toUpperCase() === (c.reference || '').trim().toUpperCase());
      return matchesSearch && !existsLocally;
    });

    if (categoryFilter && categoryFilter !== 'ALL') {
      matches.sort((a, b) => {
        const aMatch = a.suggestedType === categoryFilter ? 1 : 0;
        const bMatch = b.suggestedType === categoryFilter ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return matches.slice(0, 15);
  }, [type, search, catalog, categoryFilter, articles, site]);

  const addCatalogItem = async (catalogItem: CatalogItem) => {
    const cleanRef = (catalogItem.reference || '').trim().toUpperCase().replace(/\s+/g, '_');
    const deterministicId = `${site}_${cleanRef}`;

    const newArticle: Article = {
      id: deterministicId,
      site: site,
      ref: catalogItem.reference,
      designation: catalogItem.designation,
      type: catalogItem.suggestedType || 'CONSOMMABLES',
      category: catalogItem.functionalCategory || 'AUTRES',
      functionalCategory: catalogItem.functionalCategory || '',
      subCategory: catalogItem.subCategory || '',
      component: catalogItem.component || '',
      subComponent: catalogItem.subComponent || '',
      unit: catalogItem.unit || 'PIECE',
      quantity: 0,
      minStock: catalogItem.minStock || 2,
      price: catalogItem.price || 0,
      location: 'A affecter',
      active: true,
      notes: `Importé automatiquement depuis le catalogue général`
    };

    if (onArticleCreate) {
      try {
        await onArticleCreate(newArticle);
        setLocalCreatedArticles(prev => [...prev, newArticle]);
        const newLineId = generateId();
        setItems(prev => [...prev, { lineId: newLineId, articleId: deterministicId, quantity: 1, price: newArticle.price ?? 0 }]);
        setValidationError(null);
        setSearch('');
        setShowResults(false);
        toast.success(`Importation effectuée : "${newArticle.designation}" ajoutée au stock du site.`);
      } catch (err: any) {
        toast.error(`Erreur d'importation : ${err.message || err}`);
      }
    }
  };

  const isEpiOrOutils = categoryFilter === 'EPI' || categoryFilter === 'OUTILS_TRAVAUX';
  const isMachineRelated = categoryFilter === 'ENGINS' || categoryFilter === 'PERFORATEURS';

  const addItem = (article: Article) => {
    if (type === 'SORTIE' && article.quantity === 0) {
      setValidationError(`ERREUR : Stock épuisé pour "${article.designation}".`);
      return;
    }
    const newLineId = generateId();
    setItems(prev => [...prev, { 
      lineId: newLineId, 
      articleId: article.id, 
      quantity: 1, 
      price: article.price ?? 0,
      beneficiaryId: '',
      beneficiaryName: '',
      beneficiaryService: ''
    }]);
    setValidationError(null);
    setSearch('');
    setShowResults(false);
    toast.success(`Ajouté au bon : "${article.designation}"`);
  };

  const handleQuickAdd = async (quickItem: { reference: string; designation: string; price: number; unit: string; suggestedType: string }) => {
    const existingArticle = articles.find(
      a => a.site === site && a.ref.trim().toUpperCase() === quickItem.reference.trim().toUpperCase()
    );

    if (existingArticle) {
      addItem(existingArticle);
      return;
    }

    const catalogItem = (catalog || []).find(
      c => (c.reference || '').trim().toUpperCase() === quickItem.reference.trim().toUpperCase()
    );

    if (catalogItem) {
      const cleanRef = (catalogItem.reference || '').trim().toUpperCase().replace(/\s+/g, '_');
      const deterministicId = `${site}_${cleanRef}`;
      
      const newArticle: Article = {
        id: deterministicId,
        site: site,
        ref: catalogItem.reference,
        designation: catalogItem.designation,
        type: catalogItem.suggestedType || 'CONSOMMABLES',
        category: catalogItem.functionalCategory || 'AUTRES',
        unit: catalogItem.unit || 'PIECE',
        quantity: 0,
        minStock: catalogItem.minStock || 2,
        price: catalogItem.price || quickItem.price || 0,
        location: 'A affecter',
        active: true,
        notes: `Importé via raccourci tactile de saisie rapide`
      };

      if (onArticleCreate) {
        try {
          await onArticleCreate(newArticle);
          setLocalCreatedArticles(prev => [...prev, newArticle]);
          const newLineId = generateId();
          setItems(prev => [...prev, { lineId: newLineId, articleId: deterministicId, quantity: 1, price: newArticle.price ?? 0 }]);
          setValidationError(null);
          toast.success(`Nouveau stock initialisé : "${newArticle.designation}"`);
        } catch (err: any) {
          toast.error(`Erreur d'importation : ${err.message || err}`);
        }
      }
      return;
    }

    const cleanRef = quickItem.reference.trim().toUpperCase().replace(/\s+/g, '_');
    const deterministicId = `${site}_${cleanRef}`;

    const newArticle: Article = {
      id: deterministicId,
      site: site,
      ref: quickItem.reference,
      designation: quickItem.designation,
      type: quickItem.suggestedType as any,
      category: 'AUTRES',
      unit: quickItem.unit || 'PIECE',
      quantity: 0,
      minStock: 2,
      price: quickItem.price,
      location: 'A affecter',
      active: true,
      notes: `Instancié via raccourci de saisie rapide depuis le bon de réception`
    };

    if (onArticleCreate) {
      try {
        await onArticleCreate(newArticle);
        setLocalCreatedArticles(prev => [...prev, newArticle]);
        const newLineId = generateId();
        setItems(prev => [...prev, { lineId: newLineId, articleId: deterministicId, quantity: 1, price: newArticle.price ?? 0 }]);
        setValidationError(null);
        toast.success(`Nouveau stock créé : "${newArticle.designation}"`);
      } catch (err: any) {
        toast.error(`Erreur création : ${err.message || err}`);
      }
    }
  };

  const removeItem = (lineId: string) => setItems(items.filter(i => i.lineId !== lineId));

  const updateItem = (lineId: string, updates: Partial<MouvementItem>) => {
    setItems(items.map(i => {
      if (i.lineId === lineId) {
        const article = articles.find(a => a.id === i.articleId) || localCreatedArticles.find(a => a.id === i.articleId);
        const validQty = updates.quantity !== undefined ? (isNaN(updates.quantity) ? i.quantity : updates.quantity) : i.quantity;
        const validPrice = updates.price !== undefined ? (isNaN(updates.price) ? i.price : updates.price) : i.price;
        const beneficiaryId = updates.beneficiaryId !== undefined ? updates.beneficiaryId : i.beneficiaryId;
        const beneficiaryName = updates.beneficiaryName !== undefined ? updates.beneficiaryName : i.beneficiaryName;
        const beneficiaryService = updates.beneficiaryService !== undefined ? updates.beneficiaryService : i.beneficiaryService;

        if (type === 'SORTIE' && article && updates.quantity !== undefined && validQty > article.quantity) {
          setValidationError(`Stock insuffisant (${article.quantity})`);
          return { 
            ...i, 
            quantity: article.quantity, 
            price: validPrice,
            beneficiaryId,
            beneficiaryName,
            beneficiaryService
          };
        }
        return { 
          ...i, 
          quantity: validQty, 
          price: validPrice,
          beneficiaryId,
          beneficiaryName,
          beneficiaryService
        };
      }
      return i;
    }));
  };

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (items.length === 0) { setValidationError('Ajoutez des articles.'); return; }

    if (type === 'SORTIE' && !isMachineRelated) {
      const missingBeneficiary = items.some(item => !item.beneficiaryId);
      if (missingBeneficiary) {
        setValidationError("Veuillez sélectionner un bénéficiaire individuel pour chaque ligne d'article.");
        return;
      }
    }

    if (type === 'ENTREE' && !reference.trim()) {
      setValidationError("ERREUR : Le N° Bon de Livraison Fournisseur est obligatoire.");
      return;
    }

    const resolvedMecanicien = agents.find(a => a.id === mecanicien);
    const resolvedEngin = engins.find(e => e.id === targetEngin);
    const resolvedPerfo = perfos.find(p => p.id === targetPerfo);

    let resolvedEntityName = entityName;
    if (type === 'ENTREE') {
      if (receptionSource === 'CENTRAL') {
        resolvedEntityName = 'MAGASIN CENTRAL HYDROMINES';
      } else {
        resolvedEntityName = buyerName ? `ACHAT EXTERNE (Acheteur: ${buyerName})` : 'ACHAT EXTERNE';
      }
    }

    let finalBeneficiaireRef: string | undefined = undefined;
    if (type === 'SORTIE') {
      if (isMachineRelated) {
        finalBeneficiaireRef = resolvedMecanicien ? `${resolvedMecanicien.lastname} ${resolvedMecanicien.firstname}` : mecanicien;
      } else {
        const uniqueBeneficiaryNames = Array.from(new Set(items.map(it => it.beneficiaryName).filter(Boolean))) as string[];
        if (uniqueBeneficiaryNames.length === 1) {
          finalBeneficiaireRef = uniqueBeneficiaryNames[0];
        } else if (uniqueBeneficiaryNames.length > 1) {
          finalBeneficiaireRef = "Plusieurs bénéficiaires";
        }
      }
    }

    const mouvement: Mouvement = {
      id: generateId(),
      site,
      date,
      type,
      reference,
      vendeur: type === 'ENTREE' ? resolvedEntityName : undefined,
      demandeur: (type === 'SORTIE' && isEpiOrOutils) ? entityName : undefined,
      beneficiaire: finalBeneficiaireRef,
      mecanicien: isMachineRelated ? (resolvedMecanicien ? `${resolvedMecanicien.firstname} ${resolvedMecanicien.lastname}` : mecanicien) : undefined,
      engin: (isMachineRelated && categoryFilter === 'ENGINS') ? (resolvedEngin ? resolvedEngin.code : targetEngin) : undefined,
      perforateur: (isMachineRelated && categoryFilter === 'PERFORATEURS') ? (resolvedPerfo ? resolvedPerfo.code : targetPerfo) : undefined,
      category: categoryFilter,
      service: service || resolvedMecanicien?.service || '',
      motif: notes,
      notes,
      interventionType: isMachineRelated ? interventionType : undefined,
      status: 'VALIDE',
      items: items.map(({ lineId, ...rest }) => ({
        articleId: rest.articleId,
        quantity: rest.quantity,
        price: rest.price,
        lotNumber: rest.lotNumber,
        expiryDate: rest.expiryDate,
        beneficiaryId: rest.beneficiaryId || undefined,
        beneficiaryName: rest.beneficiaryName || undefined,
        beneficiaryService: rest.beneficiaryService || undefined,
      }))
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
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card glass p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl border-slate-100">
          {/* Dynamic Date and Reference Controller */}
          <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Date & Heure du Document</label>
              <input
                type="datetime-local"
                value={new Date(date).getTime() ? new Date(new Date(date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(new Date(e.target.value).toISOString());
                  }
                }}
                className="input-field h-10 px-3 text-xs bg-white font-mono font-bold border border-slate-205 rounded-lg w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                {type === 'ENTREE' ? "N° Bon (Livraison Fournisseur)" : "N° de Bon de Sortie (Série)"}
              </label>
              <input
                type="text"
                placeholder={type === 'ENTREE' ? "EX: BL-YYYY-XXXXX" : "EX: BS-YYYY-XXXX"}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="input-field h-10 px-3 text-xs bg-white font-mono font-bold border border-slate-205 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="md:col-span-2 p-4 bg-slate-950 rounded-2xl text-white shadow-2xl">
            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1 opacity-70">Type de Matériel</label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-2">
              {[{ id: 'ENGINS', label: 'Engins', icon: Truck }, { id: 'PERFORATEURS', label: 'Perfos', icon: Drill }, { id: 'EPI', label: 'EPI', icon: User }, { id: 'OUTILS_TRAVAUX', label: 'Outils', icon: LayoutGrid }, { id: 'AUTRES', label: 'Autres', icon: Plus }].map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => { setCategoryFilter(cat.id); setShowResults(false); }}
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
            <div className="md:col-span-2 p-6 bg-indigo-50/45 backdrop-blur-md border border-indigo-200/50 rounded-3xl shadow-inner grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Référence Machine</label>
                <select className="input-field h-12 text-sm font-black px-4 bg-white" value={categoryFilter === 'ENGINS' ? targetEngin : targetPerfo} onChange={(e) => categoryFilter === 'ENGINS' ? setTargetEngin(e.target.value) : setTargetPerfo(e.target.value)} required>
                  <option value="">SÉLECTIONNER UNE MACHINE...</option>
                  {categoryFilter === 'ENGINS' ? siteEngins.map(e => <option key={e.id} value={e.id}>{e.code}</option>) : sitePerfos.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Mécanicien / Opérateur</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  {mecanicienFreeText ? (
                    <input
                      type="text"
                      className="input-field h-12 text-sm font-black pl-12 pr-4 bg-white uppercase w-full"
                      placeholder="NOM DU MÉCANICIEN..."
                      value={mecanicien}
                      onChange={(e) => setMecanicien(e.target.value)}
                      required
                    />
                  ) : (
                    <select className="input-field h-12 text-sm font-black pl-12 pr-4 bg-white w-full" value={mecanicien} onChange={(e) => setMecanicien(e.target.value)} required>
                      <option value="">SÉLECTIONNER UN AGENT...</option>
                      {agents.filter(a => a.site === site).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.matricule} - {a.lastname.toUpperCase()} {a.firstname.toUpperCase()} ({a.service.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Toggle Saisie libre */}
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="mecanicienFreeTextToggle" 
                    checked={mecanicienFreeText} 
                    onChange={(e) => {
                      setMecanicienFreeText(e.target.checked);
                      setMecanicien('');
                    }} 
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="mecanicienFreeTextToggle" className="text-xs font-bold text-indigo-600/80 cursor-pointer select-none">
                    Saisie libre / Agent non listé
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Type d'Intervention</label>
                <select className="input-field h-12 text-sm font-black px-4 bg-white" value={interventionType} onChange={(e) => setInterventionType(e.target.value as any)}>
                  <option value="ROUTINE">MAINTENANCE ROUTINE</option>
                  <option value="PREVENTIF">PRÉVENTIF (VISITE)</option>
                  <option value="CORRECTIF">CORRECTIF (PANNE)</option>
                  <option value="PROPRIO">TRAVAUX PROPRIÉTAIRE</option>
                </select>
              </div>
            </div>
          )}

          {type === 'ENTREE' && (
            <div className="md:col-span-2 p-6 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provenance Switcher */}
              <div className="md:col-span-2 space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Provenance des pièces</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => { setReceptionSource('CENTRAL'); setBuyerName(''); }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                      receptionSource === 'CENTRAL'
                        ? "bg-white border-emerald-500 shadow-md shadow-emerald-500/5 text-slate-900"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      receptionSource === 'CENTRAL' ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Magasin Central</h4>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Transfert interne Hydromines</p>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setReceptionSource('ACHAT_EXTERNE')}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                      receptionSource === 'ACHAT_EXTERNE'
                        ? "bg-white border-emerald-500 shadow-md shadow-emerald-500/5 text-slate-900"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      receptionSource === 'ACHAT_EXTERNE' ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Achat Externe ("Dehors")</h4>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Bon d'achat immédiat</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Origin Input */}
              {receptionSource === 'CENTRAL' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Emetteur d'origine</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                      type="text" 
                      className="input-field h-12 text-sm font-black pl-12 pr-4 bg-slate-100 border-transparent text-slate-500 select-none cursor-not-allowed uppercase w-full" 
                      value="MAGASIN CENTRAL HYDROMINES" 
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Acheteur de la pièce ("Qui l'a acheté ?")</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <select 
                      className="input-field h-12 text-sm font-black pl-12 pr-4 bg-white w-full"
                      value={buyerName === '' || agents.some(a => `${a.firstname} ${a.lastname}` === buyerName) ? buyerName : 'AUTRE_PERSONNE'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'AUTRE_PERSONNE') {
                          setBuyerName('AUTRE');
                        } else {
                          setBuyerName(val);
                        }
                      }}
                      required
                    >
                      <option value="">SÉLECTIONNER L'ACHETEUR...</option>
                      {agents.filter(a => a.site === site).map(a => (
                        <option key={a.id} value={`${a.firstname} ${a.lastname}`}>{a.lastname} {a.firstname} ({a.service})</option>
                      ))}
                      <option value="AUTRE_PERSONNE">AUTRE (Taper manuellement...)</option>
                    </select>
                  </div>
                  {/* Allow manual type if "AUTRE_PERSONNE" selected or custom */}
                  {(!agents.some(a => `${a.firstname} ${a.lastname}` === buyerName) && buyerName !== '') && (
                    <input 
                      type="text"
                      className="input-field h-12 text-sm font-black px-4 bg-white uppercase mt-2 w-full"
                      placeholder="Saisir le nom de l'acheteur..."
                      value={buyerName === 'AUTRE' ? '' : buyerName}
                      onChange={(e) => setBuyerName(e.target.value.toUpperCase())}
                      required
                    />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2.5 p-4 bg-emerald-550/10 rounded-2xl border border-emerald-500/20 text-emerald-800 text-xs">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 select-none animate-pulse" />
                <span className="font-bold uppercase tracking-wide">Information : Le N° Bon de Livraison est obligatoire et géré au sommet du formulaire.</span>
              </div>
            </div>
          )}

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Justification du mouvement / Notes techniques</label>
            <textarea className="input-field h-20 p-4 text-xs font-medium leading-relaxed" placeholder="Détaillez le motif de l'intervention..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="card glass p-4 space-y-4 shadow-xl border-slate-100 rounded-2xl">
          {type === 'ENTREE' && (
            <div className="bg-slate-50/50 backdrop-blur-md border border-slate-100/60 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight leading-none">Saisie Tactile Rapide</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1 opacity-70">Ajoutez d'un clic les familles de pièces fréquentes</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {QUICK_ITEMS.map((cat, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">{cat.category}</h4>
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                      {cat.items.map((item, iIdx) => {
                        const isChosen = items.some(iter => {
                          const art = articles.find(a => a.id === iter.articleId);
                          return art && art.ref.trim().toUpperCase() === item.reference.toUpperCase();
                        });
                        return (
                          <button
                            key={iIdx}
                            type="button"
                            onClick={() => handleQuickAdd(item)}
                            className={cn(
                              "w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 group/btn",
                              isChosen 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                            )}
                          >
                            <div className="truncate flex-1">
                              <p className="font-extrabold truncate uppercase tracking-tight group-hover/btn:text-slate-900">{item.designation}</p>
                              <p className="text-[9px] font-mono text-slate-400 tracking-wider mt-0.5">{item.reference}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                                isChosen ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-500"
                              )}>
                                {item.price} Dh
                              </span>
                              {isChosen && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            />
            {showResults && search && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] max-h-80 overflow-y-auto p-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                {sortedArticles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest px-2 mb-2">Articles enregistrés à ce site</p>
                    {sortedArticles.map(article => (
                      <button key={article.id} type="button" onClick={() => addItem(article)} className="w-full text-left p-4 hover:bg-sky-50 rounded-xl border border-transparent hover:border-sky-100 transition-all group/item flex items-center justify-between">
                        <div>
                          <p className="font-black text-base text-slate-900 group-hover/item:text-sky-900 transition-colors uppercase tracking-tight">{article.designation}</p>
                          <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mt-0.5">{article.ref}</p>
                        </div>
                        <span className={cn(
                          "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest",
                          article.quantity > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0"
                        )}>
                          STK: {article.quantity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                
                {filteredCatalogItems.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100 mt-2">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-2 mb-2">Catalogue Général (Prêt pour Importation)</p>
                    {filteredCatalogItems.map(item => (
                      <button key={item.id} type="button" onClick={() => addCatalogItem(item)} className="w-full text-left p-4 hover:bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-300 transition-all group/item flex items-center justify-between">
                        <div>
                          <p className="font-black text-base text-slate-900 group-hover/item:text-indigo-950 transition-colors uppercase tracking-tight">
                            {item.designation}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">{item.reference}</span>
                            <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.25 rounded uppercase tracking-wider">
                              Non instancié ici
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all uppercase flex-shrink-0">
                          + Importer
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {sortedArticles.length === 0 && filteredCatalogItems.length === 0 && (
                  <div className="p-6 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                    Aucun article trouvé pour "{search}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-xs font-black tracking-widest">
                  <th className="text-left py-6 px-4">Article</th>
                  {type === 'SORTIE' && !isMachineRelated && (
                    <th className="text-left py-6 px-4">Bénéficiaire individuel (Ouvrier/Mineur)</th>
                  )}
                  <th className="text-right py-6 w-40 px-4 font-black text-sky-600">Prix Unit. (MAD)</th>
                  <th className="text-center py-6 w-32 px-4">Quantité</th>
                  <th className="text-right py-6 w-16 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(item => {
                  const article = articles.find(a => a.id === item.articleId) || localCreatedArticles.find(a => a.id === item.articleId);
                  return (
                    <tr key={item.lineId} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-4">
                        <p className="font-black text-lg text-slate-900 leading-tight uppercase tracking-tight">{article?.designation || "Nouvel article"}</p>
                        <p className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest mt-1">
                          {article?.ref} | <span className="text-sky-600 font-extrabold">Stock: {article?.quantity ?? 0}</span>
                        </p>
                      </td>
                      {type === 'SORTIE' && !isMachineRelated && (
                        <td className="py-6 px-4">
                          <select 
                            className="w-full h-12 text-xs font-black px-3 rounded-xl border-2 border-slate-100 bg-white shadow-sm focus:border-sky-500 outline-none"
                            value={item.beneficiaryId || ''}
                            onChange={(e) => {
                              const selectedAgentId = e.target.value;
                              const selectedAgent = agents.find(a => a.id === selectedAgentId);
                              if (selectedAgent) {
                                updateItem(item.lineId, {
                                  beneficiaryId: selectedAgent.id,
                                  beneficiaryName: `${selectedAgent.lastname} ${selectedAgent.firstname}`,
                                  beneficiaryService: selectedAgent.service
                                });
                              } else {
                                updateItem(item.lineId, {
                                  beneficiaryId: '',
                                  beneficiaryName: '',
                                  beneficiaryService: ''
                                });
                              }
                            }}
                          >
                            <option value="">SÉLECTIONNER UN TRAVAILLEUR...</option>
                            {agents.filter(a => a.site === site).map(a => (
                              <option key={a.id} value={a.id}>
                                {a.lastname} {a.firstname} ({a.fonction || 'MINEUR'} - {a.service})
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-6 px-4 text-right font-black text-sm text-slate-800 font-mono">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-6 px-4">
                        <input 
                          type="number" 
                          min="1" 
                          className="w-full h-12 text-center p-4 rounded-xl border-2 border-slate-100 font-black text-lg bg-white focus:border-sky-500 outline-none" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(item.lineId, { quantity: Number(e.target.value) })} 
                        />
                      </td>
                      <td className="py-6 px-4 text-right">
                        <button type="button" onClick={() => removeItem(item.lineId)} className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer">
                          <Trash2 className="w-5 h-5" />
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
                type="submit" 
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
