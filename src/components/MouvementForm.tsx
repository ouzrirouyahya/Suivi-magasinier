import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  AlertTriangle,
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
  Award,
  MapPin,
  X,
  FileText,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  Star,
  WifiOff
} from 'lucide-react';
import { Article, Mouvement, MouvementItem, SiteCode, EnginMaster, PerfoMaster, AgentMaster, CatalogItem, HydrominesCatalogItem, StockType } from '../types';
import { cn, formatCurrency, generateId, logger } from '../lib/utils';
import { SITES } from '../demoData';
import { MASTER_CATALOG } from '../catalogData';
import { useInventory } from '../context/InventoryContext';
import { motion, AnimatePresence } from 'motion/react';
import { useOfflineSync } from '../hooks/useOfflineSync';

const generateReference = (prefix: string, site: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // Timestamp base36 = encode l'unicité temporelle en 4 chars
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  // 4 chiffres random pour unicité intra-milliseconde
  const rand = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, '0');
  return `${prefix}/${site}/${year}${month}-${ts}${rand}`;
};

interface MouvementFormProps {
  type: 'ENTREE' | 'SORTIE';
  site: SiteCode;
  articles: Article[];
  catalog: CatalogItem[];
  engins: EnginMaster[];
  perfos: PerfoMaster[];
  agents: AgentMaster[];
  onSubmit: (mouvement: Mouvement) => Promise<void> | void;
  onArticleCreate?: (article: Article) => void;
  initialArticleId?: string;
  isReadOnly?: boolean;
  resetKey?: number;
}

export function MouvementForm({ type, site, articles, catalog, engins, perfos, agents, onSubmit, onArticleCreate, initialArticleId, isReadOnly = false, resetKey }: MouvementFormProps) {
  const { isOnline } = useOfflineSync();
  const { hydrominesCatalog = [], saveHydrominesCatalogItem, importFromHydrominesCatalog, updatePRStatus } = useInventory();

  // Automatic selection after import state & effect
  const [pendingImports, setPendingImports] = useState<string[]>([]);

  useEffect(() => {
    if (pendingImports.length === 0) return;
    const nextPending = [...pendingImports];
    let foundAny = false;
    for (const ref of pendingImports) {
      const art = articles.find(a => a.site === site && a.ref.trim().toUpperCase() === ref.trim().toUpperCase());
      if (art) {
        addItem(art);
        const idx = nextPending.indexOf(ref);
        if (idx > -1) nextPending.splice(idx, 1);
        foundAny = true;
      }
    }
    if (foundAny) {
      setPendingImports(nextPending);
    }
  }, [articles, pendingImports, site]);

  // Hydromines Catalog Selector States
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [selectorTab, setSelectorTab] = useState<'hm_select' | 'hm_enrich_st2g' | 'hm_enrich_st2d' | 'hm_enrich_t23' | 'hm_enrich_t28' | 'hm_enrich_manual'>('hm_select');
  
  // Selection States inside Active HM Catalog
  const [hmSearchTerm, setHmSearchTerm] = useState('');
  const [hmActiveFamily, setHmActiveFamily] = useState<string>('ALL');
  const [hmActiveCategory, setHmActiveCategory] = useState<string>('ALL');
  const [hmVisibleLimit, setHmVisibleLimit] = useState(30);
  const [selectedHMItem, setSelectedHMItem] = useState<HydrominesCatalogItem | null>(null);

  // Quick Addition & Enrichment States from Tech Catalogs
  const [enrichCategory, setEnrichCategory] = useState<string>('ALL');
  const [enrichSearch, setEnrichSearch] = useState('');
  const [enrichLimit, setEnrichLimit] = useState(30);
  const [selectedTechItem, setSelectedTechItem] = useState<CatalogItem | null>(null);
  
  const [enrichUnit, setEnrichUnit] = useState('Pcs');
  const [enrichIsCritical, setEnrichIsCritical] = useState(false);

  // Emergency Manual fallback states
  const [manualRef, setManualRef] = useState('');
  const [manualDes, setManualDes] = useState('');
  const [manualUnit, setManualUnit] = useState('Pcs');
  const [manualType, setManualType] = useState<StockType>('CONSOMMABLES');
  const [manualCat, setManualCat] = useState('');
  const [manualFamily, setManualFamily] = useState<'ST2G' | 'ST2D' | 'T23' | 'T28' | 'EPI' | 'CONSOMMABLES' | 'AUTRE'>('CONSOMMABLES');
  const [manualIsCritical, setManualIsCritical] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString());

  // Date validation boundaries
  const maxDate = new Date();
  maxDate.setSeconds(maxDate.getSeconds() + 300); // +5min de marge
  const maxDateStr = new Date(maxDate.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16);

  // Pour ENTREE : autoriser jusqu'à 30 jours en arrière (BL antidaté)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 30);
  const minDateStr = new Date(minDate.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16);

  const [reference, setReference] = useState('');
  const [entityName, setEntityName] = useState(''); 
  const [entityNameError, setEntityNameError] = useState(false);
  const [receptionSource, setReceptionSource] = useState<'CENTRAL' | 'ACHAT_EXTERNE'>('CENTRAL');
  const [buyerName, setBuyerName] = useState('');
  const [mecanicien, setMecanicien] = useState(''); 
  const [mecanicienFreeText, setMecanicienFreeText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = React.useRef(false);
  const [targetEngin, setTargetEngin] = useState(''); 
  const [targetPerfo, setTargetPerfo] = useState('');
  const [interventionType, setInterventionType] = useState<'CORRECTIF' | 'PREVENTIF' | 'ROUTINE' | 'PROPRIO'>('ROUTINE');
  const [service, setService] = useState('');
  const [notes, setNotes] = useState('');
  const [backdateReason, setBackdateReason] = useState('');
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
  const [forceSubmitPrices, setForceSubmitPrices] = useState(false);
  const [priceWarnings, setPriceWarnings] = useState<string[]>([]);
  const [pendingPRId, setPendingPRId] = useState<string | null>(null);

  const dateObjForCheck = new Date(date);
  const thirtyDaysAgoForRender = new Date();
  thirtyDaysAgoForRender.setDate(thirtyDaysAgoForRender.getDate() - 30);
  const isBackdatedMoreThan30Days = dateObjForCheck.getTime() < thirtyDaysAgoForRender.getTime();

  // Real-time recalculation of anomalous price entries
  useEffect(() => {
    if (type !== 'ENTREE') {
      setPriceWarnings([]);
      return;
    }
    const warnings: string[] = [];
    items.forEach(item => {
      const art = articles.find(a => a.id === item.articleId) || localCreatedArticles.find(a => a.id === item.articleId);
      if (art) {
        if (item.price === undefined || item.price === null || isNaN(item.price)) {
          // ignore NaN during typing
        } else if (item.price <= 0) {
          warnings.push(`Prix nul de ${formatCurrency(0)} ou non spécifié pour "${art.designation}" (Réf: ${art.ref}).`);
        } else if (art.price && art.price > 0) {
          const ratio = item.price / art.price;
          if (ratio > 5) {
            warnings.push(`Prix anormalement élevé pour "${art.designation}" : ${formatCurrency(item.price)} est plus de 5 fois supérieur au prix courant enregistré (${formatCurrency(art.price)}).`);
          } else if (ratio < 0.1) {
            warnings.push(`Prix anormalement bas pour "${art.designation}" : ${formatCurrency(item.price)} est plus de 10 fois inférieur au prix courant enregistré (${formatCurrency(art.price)}).`);
          }
        }
      }
    });
    setPriceWarnings(warnings);
  }, [items, type, articles, localCreatedArticles]);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingPRReception');
    if (pending && type === 'ENTREE') {
      try {
        const { prId, items: prItems } = JSON.parse(pending);
        const newItems = prItems.map((prItem: any) => ({
          lineId: generateId(),
          articleId: prItem.articleId,
          quantity: prItem.quantity,
          price: prItem.lastPrice || 0
        }));
        setItems(newItems);
        setReference(`Réception DA`);
        sessionStorage.removeItem('pendingPRReception');
        setPendingPRId(prId);
      } catch {}
    }
  }, [type]);

  // Ergonomic UX Keyboard States
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [lastAddedLineId, setLastAddedLineId] = useState<string | null>(null);
  const [globalBeneficiaryId, setGlobalBeneficiaryId] = useState<string>('');

  // 1. activeHMCatalogItems: pieces ayant le statut 'ACTIF' dans les collections
  const activeHMCatalogItems = useMemo(() => {
    return (hydrominesCatalog || []).filter(item => item.status === 'ACTIF');
  }, [hydrominesCatalog]);

  const hmFamiliesList = useMemo(() => {
    const families = new Set<string>();
    activeHMCatalogItems.forEach(item => {
      if (item.equipmentFamily) families.add(item.equipmentFamily);
    });
    return Array.from(families).sort();
  }, [activeHMCatalogItems]);

  const hmCategoriesList = useMemo(() => {
    const categories = new Set<string>();
    activeHMCatalogItems.forEach(item => {
      if (item.functionalCategory) categories.add(item.functionalCategory);
    });
    return Array.from(categories).sort();
  }, [activeHMCatalogItems]);

  // Order filtration: Choix du catalogue -> Choix de la catégorie -> Recherche texte
  const filteredHMItems = useMemo(() => {
    let items = activeHMCatalogItems;

    if (hmActiveFamily !== 'ALL') {
      items = items.filter(it => it.equipmentFamily === hmActiveFamily);
    }

    if (hmActiveCategory !== 'ALL') {
      items = items.filter(it => it.functionalCategory === hmActiveCategory);
    }

    const query = hmSearchTerm.toLowerCase().trim();
    if (query.length >= 2) {
      items = items.filter(it => 
        it.reference?.toLowerCase().includes(query) ||
        it.designation?.toLowerCase().includes(query) ||
        it.functionalCategory?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [activeHMCatalogItems, hmActiveFamily, hmActiveCategory, hmSearchTerm]);

  const visibleHMItems = useMemo(() => {
    return filteredHMItems.slice(0, hmVisibleLimit);
  }, [filteredHMItems, hmVisibleLimit]);

  // Enrichment filters
  const currentEnrichCatalog = useMemo(() => {
    if (selectorTab === 'hm_enrich_st2g') return 'ST2G';
    if (selectorTab === 'hm_enrich_st2d') return 'ST2D';
    if (selectorTab === 'hm_enrich_t23') return 'T23';
    if (selectorTab === 'hm_enrich_t28') return 'T28';
    return null;
  }, [selectorTab]);

  const enrichCategories = useMemo(() => {
    if (!currentEnrichCatalog) return [];
    const matched = MASTER_CATALOG.filter(it => {
      const comp = (it.compatibility || '').toLowerCase();
      if (currentEnrichCatalog === 'ST2G') return comp.includes('st2g');
      if (currentEnrichCatalog === 'ST2D') return comp.includes('st2d');
      if (currentEnrichCatalog === 'T23') return comp.includes('t23');
      if (currentEnrichCatalog === 'T28') return comp.includes('t28');
      return false;
    });
    const uniq = new Set<string>();
    matched.forEach(it => {
      if (it.functionalCategory) uniq.add(it.functionalCategory);
    });
    return Array.from(uniq).sort();
  }, [currentEnrichCatalog]);

  const enrichFilteredItems = useMemo(() => {
    if (!currentEnrichCatalog) return [];
    let items = MASTER_CATALOG.filter(it => {
      const comp = (it.compatibility || '').toLowerCase();
      if (currentEnrichCatalog === 'ST2G') return comp.includes('st2g');
      if (currentEnrichCatalog === 'ST2D') return comp.includes('st2d');
      if (currentEnrichCatalog === 'T23') return comp.includes('t23');
      if (currentEnrichCatalog === 'T28') return comp.includes('t28');
      return false;
    });

    if (enrichCategory !== 'ALL') {
      items = items.filter(it => it.functionalCategory === enrichCategory);
    }

    const query = enrichSearch.toLowerCase().trim();
    if (query.length >= 2) {
      items = items.filter(it => 
        it.reference?.toLowerCase().includes(query) ||
        it.designation?.toLowerCase().includes(query) ||
        it.functionalCategory?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [currentEnrichCatalog, enrichCategory, enrichSearch]);

  const visibleEnrichItems = useMemo(() => {
    return enrichFilteredItems.slice(0, enrichLimit);
  }, [enrichFilteredItems, enrichLimit]);

  const autoId = useMemo(() => {
    const prefix = type === 'ENTREE' ? 'BE' : 
                   type === 'SORTIE' ? 'BS' : 
                   type === 'RETOUR' ? 'BR' : 'BA';
    return generateReference(prefix, site === 'ALL' ? 'HYDRO' : site);
  }, [type, site]);

  useEffect(() => {
    if (!reference) {
      setReference(autoId);
    }
  }, [autoId]);

  const siteEngins = site !== 'ALL' ? engins.filter(e => e.site === site) : [];
  const sitePerfos = site !== 'ALL' ? perfos.filter(p => p.site === site) : [];

  const filteredArticles = useMemo(() => {
    if (!site || site === 'ALL') return [];
    return articles.filter(a => {
      const matchesSearch = !search || a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase());
      const matchesSite = a.site === site;
      return matchesSearch && matchesSite && a.active;
    });
  }, [articles, search, site]);

  const sortedArticles = useMemo(() => {
    let sorted = [...filteredArticles];
    if (categoryFilter && categoryFilter !== 'ALL') {
      sorted = sorted.filter(a => a.type === categoryFilter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase().trim();
      sorted.sort((a, b) => {
        const scoreOf = (art: Article): number => {
          const ref = art.ref.toLowerCase();
          const designation = art.designation.toLowerCase();
          if (ref === searchLower) return 0; // correspondance exacte référence
          if (ref.startsWith(searchLower)) return 1; // référence commence par
          if (designation.startsWith(searchLower)) return 2; // désignation commence par
          if (ref.includes(searchLower)) return 3; // référence contient
          return 4; // désignation contient (déjà garanti par le filtre)
        };
        return scoreOf(a) - scoreOf(b);
      });
    }
    
    return sorted.slice(0, 50);
  }, [filteredArticles, categoryFilter, search]);

  const totalMatchCount = useMemo(() => {
    let sorted = [...filteredArticles];
    if (categoryFilter && categoryFilter !== 'ALL') {
      sorted = sorted.filter(a => a.type === categoryFilter);
    }
    return sorted.length;
  }, [filteredArticles, categoryFilter]);

  const filteredHydrominesCatalog = useMemo(() => {
    if (!search || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    const existingRefs = new Set(
      articles.filter(a => a.site === site).map(a => a.ref.trim().toUpperCase())
    );
    return hydrominesCatalog.filter(item => 
      item.status === 'ACTIF' &&
      !existingRefs.has(item.reference.trim().toUpperCase()) &&
      (item.designation.toLowerCase().includes(searchLower) || 
       item.reference.toLowerCase().includes(searchLower))
    ).slice(0, 10);
  }, [hydrominesCatalog, search, articles, site]);

  const filteredCatalogItems: any[] = [];

  // Unified Search Result List for Smooth Arrow Navigation
  const dropdownItems = useMemo(() => {
    const list: Array<{ type: 'article' | 'hydromines' | 'catalog'; payload: any }> = [];
    sortedArticles.forEach(a => list.push({ type: 'article', payload: a }));
    filteredHydrominesCatalog.forEach(h => list.push({ type: 'hydromines', payload: h }));
    return list;
  }, [sortedArticles, filteredHydrominesCatalog]);

  // Keyboard navigation effects
  useEffect(() => {
    setFocusedIndex(0);
  }, [search]);

  // Focus Search field when page loads or site changes
  useEffect(() => {
    if (site !== 'ALL') {
      const searchInput = document.getElementById('main-search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [site]);

  // Focus newly added item's quantity input
  useEffect(() => {
    if (lastAddedLineId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`qty-${lastAddedLineId}`);
        if (element) {
          (element as HTMLInputElement).focus();
          (element as HTMLInputElement).select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [lastAddedLineId]);

  const handleImportFromHydromines = async (item: HydrominesCatalogItem) => {
    if (!importFromHydrominesCatalog || !site || site === 'ALL') return;
    try {
      setPendingImports(prev => [...prev, item.reference]);
      const result = await importFromHydrominesCatalog(site, [item]);
      if (result.imported > 0) {
        toast.success(`"${item.designation}" ajouté au stock de ${site}`);
        setSearch('');
        setShowResults(false);
      } else if (result.skipped > 0) {
        toast.warning(`"${item.designation}" existe déjà dans le stock de ${site}`);
        setPendingImports(prev => prev.filter(r => r !== item.reference));
        const exLog = articles.find(a => a.site === site && a.ref.trim().toUpperCase() === item.reference.trim().toUpperCase());
        if (exLog) addItem(exLog);
      }
    } catch (e: any) {
      toast.error(`Erreur lors de l'import : ${e.message || e}`);
      setPendingImports(prev => prev.filter(r => r !== item.reference));
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (dropdownItems.length ? (prev + 1) % dropdownItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (dropdownItems.length ? (prev - 1 + dropdownItems.length) % dropdownItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (dropdownItems.length > 0 && focusedIndex >= 0 && focusedIndex < dropdownItems.length) {
        const selected = dropdownItems[focusedIndex];
        if (selected.type === 'article') {
          addItem(selected.payload);
        } else if (selected.type === 'hydromines') {
          handleImportFromHydromines(selected.payload);
        } else if (selected.type === 'catalog') {
          addCatalogItem(selected.payload);
        }
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const addCatalogItem = async (catalogItem: CatalogItem) => {
    if (site === 'ALL') return;
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
        const resolvedGlobalAgent = agents.find(a => a.id === globalBeneficiaryId);
        const defaultBeneficiaryProps = resolvedGlobalAgent ? {
          beneficiaryId: resolvedGlobalAgent.id,
          beneficiaryName: `${resolvedGlobalAgent.lastname} ${resolvedGlobalAgent.firstname}`,
          beneficiaryService: resolvedGlobalAgent.service
        } : {
          beneficiaryId: '',
          beneficiaryName: '',
          beneficiaryService: ''
        };
        setItems(prev => [...prev, { 
          lineId: newLineId, 
          articleId: deterministicId, 
          quantity: 1, 
          price: newArticle.price ?? 0,
          ...defaultBeneficiaryProps 
        }]);
        setValidationError(null);
        setSearch('');
        setShowResults(false);
        setLastAddedLineId(newLineId);
        toast.success(`Importation effectuée : "${newArticle.designation}" ajoutée au stock du site.`);
      } catch (err: any) {
        toast.error(`Erreur d'importation : ${err.message || err}`);
      }
    }
  };

  const handleSelectAndInstantiateHMItem = async (item: HydrominesCatalogItem) => {
    if (site === 'ALL') {
      toast.error("Veuillez sélectionner un chantier avant d'ajouter une pièce.");
      return;
    }

    const cleanRef = (item.reference || '').trim().toUpperCase().replace(/\s+/g, '_');
    const deterministicId = `${site}_${cleanRef}`;

    // CHECK FOR EXISTING LOCAL ARTICLE TO PREVENT DUPLICATES!
    const existingLocalArticle = articles.find(
      a => a.site === site && 
      a.ref.trim().toUpperCase() === item.reference.trim().toUpperCase()
    );

    if (existingLocalArticle) {
      // Already exists in local stock! Just select it
      addItem(existingLocalArticle);
      setIsSelectorModalOpen(false);
      toast.success(`La pièce "${item.designation}" existe déjà dans le stock et a été ajoutée.`);
      return;
    }

    // Create a new article following existing schema mapping exactly
    const newArticle: Article = {
      id: deterministicId,
      site: site,
      ref: item.reference.toUpperCase().trim(),
      designation: item.designation.trim(),
      type: (item.suggestedType as StockType) || 'CONSOMMABLES',
      category: item.functionalCategory || 'AUTRES',
      functionalCategory: item.functionalCategory || '',
      unit: item.unit || 'PIECE',
      quantity: 0,
      minStock: 2,
      price: 0,
      location: 'A affecter',
      active: true,
      notes: `Créé automatiquement à partir du Catalogue Hydromines ⭐ (Origine: ${item.sourceCatalog || 'Inconnu'})`
    };

    if (onArticleCreate) {
      try {
        await onArticleCreate(newArticle);
        setLocalCreatedArticles(prev => [...prev, newArticle]);
        
        // Add to items of the movement form
        const newLineId = generateId();
        const resolvedGlobalAgent = agents.find(a => a.id === globalBeneficiaryId);
        const defaultBeneficiaryProps = resolvedGlobalAgent ? {
          beneficiaryId: resolvedGlobalAgent.id,
          beneficiaryName: `${resolvedGlobalAgent.lastname} ${resolvedGlobalAgent.firstname}`,
          beneficiaryService: resolvedGlobalAgent.service
        } : {
          beneficiaryId: '',
          beneficiaryName: '',
          beneficiaryService: ''
        };

        setItems(prev => [...prev, { 
          lineId: newLineId, 
          articleId: deterministicId, 
          quantity: 1, 
          price: 0,
          ...defaultBeneficiaryProps 
        }]);

        setValidationError(null);
        setSearch('');
        setShowResults(false);
        setLastAddedLineId(newLineId);

        setIsSelectorModalOpen(false);
        toast.success(`Importation de "${newArticle.designation}" réussie dans le stock.`);
      } catch (err: any) {
        toast.error(`Erreur d'importation : ${err.message || err}`);
      }
    }
  };

  const handleAddAndInstantiateTechItem = async () => {
    if (!selectedTechItem || !currentEnrichCatalog) return;

    // Check if duplicate in HM Catalog
    const cleanRef = selectedTechItem.reference.trim().toLowerCase();
    const alreadyInHM = hydrominesCatalog.some(hm => hm.reference?.trim().toLowerCase() === cleanRef);

    let hmItem: HydrominesCatalogItem;

    if (alreadyInHM) {
      // Find existing active
      const existingHM = hydrominesCatalog.find(hm => hm.reference?.trim().toLowerCase() === cleanRef);
      if (!existingHM) {
        toast.error("Erreur de cohérence catalogue.");
        return;
      }
      hmItem = existingHM;
      toast.info(`La référence "${selectedTechItem.reference}" est déjà présente dans le Catalogue Hydromines.`);
    } else {
      let family: 'ST2G' | 'ST2D' | 'T23' | 'T28' | 'EPI' | 'CONSOMMABLES' | 'AUTRE' = 'AUTRE';
      if (currentEnrichCatalog === 'ST2G') family = 'ST2G';
      else if (currentEnrichCatalog === 'ST2D') family = 'ST2D';
      else if (currentEnrichCatalog === 'T23') family = 'T23';
      else if (currentEnrichCatalog === 'T28') family = 'T28';

      hmItem = {
        id: 'hm_' + generateId(),
        reference: selectedTechItem.reference.toUpperCase().trim(),
        designation: selectedTechItem.designation.trim(),
        suggestedType: selectedTechItem.suggestedType || 'CONSOMMABLES',
        functionalCategory: selectedTechItem.functionalCategory || 'Général',
        unit: enrichUnit || 'Pcs',
        sourceCatalog: currentEnrichCatalog,
        equipmentFamily: family,
        status: 'ACTIF',
        isHydrominesCritical: enrichIsCritical,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await saveHydrominesCatalogItem(hmItem);
        toast.success(`Enrichi : ${hmItem.reference} ajouté au Catalogue Hydromines ⭐`);
      } catch (e: any) {
        toast.error(`Erreur d'ajout au catalogue : ${e.message || e}`);
        return;
      }
    }

    // Now instantiate in site stock
    await handleSelectAndInstantiateHMItem(hmItem);
  };

  const handleAddAndInstantiateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRef.trim() || !manualDes.trim()) {
      toast.error("Veuillez renseigner les champs obligatoires (Référence et Désignation).");
      return;
    }

    const cleanRef = manualRef.trim().toLowerCase();
    const alreadyInHM = hydrominesCatalog.some(hm => hm.reference?.trim().toLowerCase() === cleanRef);

    let hmItem: HydrominesCatalogItem;

    if (alreadyInHM) {
      const existingHM = hydrominesCatalog.find(hm => hm.reference?.trim().toLowerCase() === cleanRef);
      if (!existingHM) return;
      hmItem = existingHM;
    } else {
      hmItem = {
        id: 'hm_' + generateId(),
        reference: manualRef.toUpperCase().trim(),
        designation: manualDes.trim(),
        suggestedType: manualType,
        functionalCategory: manualCat.trim() || 'Général',
        unit: manualUnit.trim() || 'Pcs',
        sourceCatalog: 'Saisie Manuelle',
        equipmentFamily: manualFamily,
        status: 'ACTIF',
        isHydrominesCritical: manualIsCritical,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await saveHydrominesCatalogItem(hmItem);
        toast.success(`Enrichi manuellement : ${hmItem.reference} créé dans le Catalogue Hydromines ⭐`);
      } catch (e: any) {
        toast.error(`Erreur d'ajout manuel au catalogue : ${e.message || e}`);
        return;
      }
    }

    // Now instantiate in site stock
    await handleSelectAndInstantiateHMItem(hmItem);
  };

  const isEpiOrOutils = categoryFilter === 'EPI' || categoryFilter === 'OUTILS_TRAVAUX';
  const isMachineRelated = categoryFilter === 'ENGINS' || categoryFilter === 'PERFORATEURS';

  const addItem = (article: Article) => {
    if (type === 'SORTIE' && article.quantity === 0) {
      setValidationError(`ERREUR : Stock épuisé pour "${article.designation}".`);
      return;
    }

    // Vérifier si l'article est déjà dans le bon
    const existingLine = items.find(i => i.articleId === article.id);
    if (existingLine) {
      // Incrémenter la quantité de la ligne existante
      const maxQty = type === 'SORTIE' ? article.quantity : 999999;
      const newQty = Math.min(existingLine.quantity + 1, maxQty);
      setItems(prev => prev.map(i =>
        i.articleId === article.id ? { ...i, quantity: newQty } : i
      ));
      toast.info(`Quantité mise à jour : "${article.designation}" → ${newQty}`);
      setSearch('');
      setShowResults(false);
      return;
    }

    const newLineId = generateId();
    const resolvedGlobalAgent = agents.find(a => a.id === globalBeneficiaryId);
    const defaultBeneficiaryProps = resolvedGlobalAgent ? {
      beneficiaryId: resolvedGlobalAgent.id,
      beneficiaryName: `${resolvedGlobalAgent.lastname} ${resolvedGlobalAgent.firstname}`,
      beneficiaryService: resolvedGlobalAgent.service
    } : {
      beneficiaryId: '',
      beneficiaryName: '',
      beneficiaryService: ''
    };
    setItems(prev => [...prev, { 
      lineId: newLineId, 
      articleId: article.id, 
      quantity: 1, 
      price: article.price ?? 0,
      ...defaultBeneficiaryProps
    }]);
    setValidationError(null);
    setSearch('');
    setShowResults(false);
    setLastAddedLineId(newLineId);
    toast.success(`Ajouté au bon : "${article.designation}"`);

    // Scroll doux vers la liste des articles après ajout
    setTimeout(() => {
      const itemsSection = document.getElementById('mouvement-items-section');
      if (itemsSection) {
        itemsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verrou anti-double-soumission — vérifié EN PREMIER, 
    // avant toute autre logique, de manière synchrone via ref et state
    if (isSubmitting || submissionLockRef.current) {
      return; // Ignorer silencieusement les clics/soumissions répétés
    }
    
    if (isReadOnly) {
      toast.error("Le compte est en lecture seule. Impossible de valider.");
      return;
    }

    // Acquérir le verrou immédiatement pour éliminer toute race condition pendant les opérations asynchrones
    submissionLockRef.current = true;
    setIsSubmitting(true);

    const fail = (msg: string) => {
      setValidationError(msg);
      submissionLockRef.current = false;
      setIsSubmitting(false);
    };
    
    // VALIDATIONS SYNCHRONES AVANT SOUMISSION
    const dateObj = new Date(date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isBackdatedMoreThan30Days = dateObj.getTime() < thirtyDaysAgo.getTime();

    if (isBackdatedMoreThan30Days && backdateReason.trim() === '') {
      return fail("La justification est obligatoire pour une saisie rétroactive de plus de 30 jours.");
    }

    if (site === 'ALL') {
      return fail("Veuillez sélectionner un chantier avant de valider.");
    }

    if (items.length === 0) { 
      return fail('Ajoutez des articles.'); 
    }

    // Vérifier que toutes les quantités sont valides et > 0
    const invalidQtyItem = items.find(item => 
      !item.quantity || 
      isNaN(item.quantity) || 
      item.quantity <= 0 ||
      item.quantity > 999999 ||  // plafond raisonnable
      Math.round(item.quantity * 1000) / 1000 !== item.quantity  // max 3 décimales
    );

    if (invalidQtyItem) {
      const art = articles.find(a => a.id === invalidQtyItem.articleId) || localCreatedArticles.find(a => a.id === invalidQtyItem.articleId);
      return fail(
        `Quantité invalide pour "${art?.designation || 'un article'}" : la quantité doit être supérieure à 0 et comporter au maximum 3 décimales.`
      );
    }

    if (type === 'ENTREE' && receptionSource !== 'CENTRAL' && (!entityName || entityName.trim() === '')) {
      setEntityNameError(true);
      // Scroll automatique vers le champ concerné
      setTimeout(() => {
        document.getElementById('entityName-input')?.scrollIntoView({ 
          behavior: 'smooth', block: 'center' 
        });
      }, 100);
      return fail(
        "Le nom du fournisseur est obligatoire pour un bon d'entrée. " +
        "Renseignez-le dans le champ 'Nom du Fournisseur / Vendeur' (surligné en rouge ci-dessous)."
      );
    }
    // Si validation passée, réinitialiser l'erreur visuelle :
    setEntityNameError(false);

    if (type === 'ENTREE') {
      const negativePriceItem = items.find(item => 
        item.price !== undefined && item.price < 0
      );
      if (negativePriceItem) {
        const art = articles.find(a => a.id === negativePriceItem.articleId) || localCreatedArticles.find(a => a.id === negativePriceItem.articleId);
        return fail(
          `Prix négatif détecté pour "${art?.designation}" : un prix ne peut pas être négatif.`
        );
      }
    }

    // NOUVELLE VÉRIFICATION : tous les articles doivent appartenir au chantier sélectionné
    const mismatchedItem = items.find(item => {
      const art = articles.find(a => a.id === item.articleId) || localCreatedArticles.find(a => a.id === item.articleId);
      return art && art.site !== site;
    });
    if (mismatchedItem) {
      const art = articles.find(a => a.id === mismatchedItem.articleId) || localCreatedArticles.find(a => a.id === mismatchedItem.articleId);
      return fail(
        `Incohérence détectée : l'article "${art?.designation}" appartient au chantier ${art?.site}, mais vous avez sélectionné le chantier ${site}. Retirez cette ligne ou changez de chantier.`
      );
    }

    if (type === 'SORTIE' && !isMachineRelated) {
      const missingBeneficiary = items.some(item => !item.beneficiaryId);
      if (missingBeneficiary) {
        return fail("Veuillez sélectionner un bénéficiaire individuel pour chaque ligne d'article.");
      }
    }

    if (type === 'SORTIE' && isMachineRelated) {
      if (!mecanicien || mecanicien.trim() === '') {
        return fail(
          "Le mécanicien responsable est obligatoire pour une sortie sur engin ou perforateur."
        );
      }
      if (categoryFilter === 'ENGINS' && (!targetEngin || targetEngin.trim() === '')) {
        return fail("L'engin concerné est obligatoire pour une sortie ENGINS.");
      }
      if (categoryFilter === 'PERFORATEURS' && (!targetPerfo || targetPerfo.trim() === '')) {
        return fail("Le perforateur concerné est obligatoire pour une sortie PERFORATEURS.");
      }
    }

    if (type === 'ENTREE' && !reference.trim()) {
      return fail("ERREUR : Le N° Bon de Livraison Fournisseur est obligatoire.");
    }

    if (type === 'ENTREE' && priceWarnings.length > 0 && !forceSubmitPrices) {
      return fail("ATTENTION : Certains prix saisis sont jugés anormaux ou nuls par le système qualité. Veuillez confirmer l'exactitude des prix en cochant la case d'approbation et réessayez.");
    }

    // Vérification de la clôture mensuelle pour verrouiller la période
    const targetMonth = date.slice(0, 7); // "YYYY-MM"
    try {
      const { doc, getDoc, db } = await import('../lib/db');
      const closingSnap = await getDoc(doc(db, 'monthlyClosings', targetMonth));
      if (closingSnap.exists()) {
        return fail(`La période ${targetMonth} est close et scellée comptablement. Impossible d'enregistrer des mouvements dans cette période.`);
      }
    } catch (err) {
      console.warn("Vérification de clôture ignorée (possible mode hors-ligne):", err);
    }
    
    try {
      const resolvedMecanicien = agents.find(a => a.id === mecanicien);
      const resolvedEngin = engins.find(e => e.id === targetEngin);
      const resolvedPerfo = perfos.find(p => p.id === targetPerfo);

      let resolvedEntityName = entityName;
      if (type === 'ENTREE') {
        if (receptionSource === 'CENTRAL') {
          resolvedEntityName = 'MAGASIN CENTRAL HYDROMINES';
        } else {
          resolvedEntityName = `${entityName.trim()}${buyerName ? ` (Acheteur: ${buyerName})` : ''}`;
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

      // S'assurer que la référence est toujours présente
      const finalReference = reference.trim() || 
        generateReference(type === 'ENTREE' ? 'BE' : 'BS', (site as string) === 'ALL' ? 'HYDRO' : site);

      const resolvedGlobalAgent = agents.find(a => a.id === globalBeneficiaryId);
      const globalAgentName = resolvedGlobalAgent ? `${resolvedGlobalAgent.lastname} ${resolvedGlobalAgent.firstname}` : '';

      const mouvement: Mouvement = {
        id: generateId(),
        site: site,
        date,
        type,
        reference: finalReference,
        vendeur: type === 'ENTREE' ? resolvedEntityName : undefined,
        demandeur: (type === 'SORTIE' && isEpiOrOutils) ? (globalAgentName || finalBeneficiaireRef || entityName) : undefined,
        beneficiaire: finalBeneficiaireRef,
        mecanicien: isMachineRelated ? (resolvedMecanicien ? `${resolvedMecanicien.firstname} ${resolvedMecanicien.lastname}` : mecanicien) : undefined,
        engin: (isMachineRelated && categoryFilter === 'ENGINS') ? (resolvedEngin ? resolvedEngin.code : targetEngin) : undefined,
        perforateur: (isMachineRelated && categoryFilter === 'PERFORATEURS') ? (resolvedPerfo ? resolvedPerfo.code : targetPerfo) : undefined,
        category: categoryFilter,
        service: service || resolvedMecanicien?.service || '',
        motif: notes,
        notes,
        interventionType: isMachineRelated ? interventionType : undefined,
        status: isBackdatedMoreThan30Days ? 'EN_ATTENTE_APPROBATION' : 'VALIDE',
        needsSuperAdminApproval: isBackdatedMoreThan30Days ? true : undefined,
        backdateReason: isBackdatedMoreThan30Days ? backdateReason.trim() : undefined,
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

      try {
        await onSubmit(mouvement);
        // updatePRStatus n'est appelé QUE si onSubmit a réussi 
        // (n'a pas levé d'exception)
        if (pendingPRId && updatePRStatus) {
          updatePRStatus(pendingPRId, 'RECU');
          setPendingPRId(null);
        }
      } catch (err) {
        // onSubmit a déjà géré l'affichage de l'erreur (toast.promise côté appelant)
        // Ne PAS marquer la PR comme reçue si le bon a échoué
        logger.error('[MouvementForm] Soumission échouée, PR non marquée RECU:', err);
      }
    } finally {
      // Le verrou est TOUJOURS libéré, succès ou échec,
      // pour permettre une nouvelle tentative si besoin
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {isReadOnly && (
        <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold no-print shadow-sm">
          <Eye className="w-5 h-5 shrink-0 text-amber-650 animate-pulse" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-black uppercase text-amber-800">Mode Consultation Seule</span>
            <span className="text-xs font-normal text-[#a0522d] leading-relaxed">
              Votre compte administrateur est en lecture seule. Contactez le SUPER_ADMIN pour obtenir des droits d'écriture.
            </span>
          </div>
        </div>
      )}

      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone de flux avec un rond luxueux */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative transition-all duration-300",
              type === 'ENTREE' 
                ? "bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]" 
                : "bg-rose-950/25 border border-rose-550/30 text-rose-500"
            )}>
              <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-current scale-110" />
              {type === 'ENTREE' ? (
                <ArrowDownLeft className="w-10 h-10 stroke-[2.5]" />
              ) : (
                <ArrowUpRight className="w-10 h-10 stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* Section centrale : Titre géant et sous-titre de flux */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", type === 'ENTREE' ? "bg-[#b8860b]" : "bg-rose-500")} />
              <span className={cn("text-[9px] font-black uppercase tracking-widest", type === 'ENTREE' ? "text-amber-800" : "text-rose-850")}>
                {type === 'ENTREE' ? "Flux Logistique Entrant (Réception)" : "Flux Logistique Sortant (Consommation)"}
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                {type === 'ENTREE' ? "Bon de Réception" : "Bon de Sortie"}
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Enregistrement et traçabilité des pièces détachées d'engins souterrains
            </p>
          </div>

          {/* Section droite : Informations sur le site / magasin */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">MAGASIN</span>
            </div>
            <div className="px-3.5 py-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg text-xs font-black text-[#ffd700] shadow-md uppercase tracking-widest select-none">
              {site === 'ALL' ? 'Chantier Non Sélectionné' : site}
            </div>
          </div>

        </div>
      </div>

      <form onSubmit={handleSubmit} className={cn("space-y-4", isReadOnly && "pointer-events-none opacity-70")}>
        {site === 'ALL' && (
          <div className="flex items-center gap-3 px-6 py-5 bg-amber-50 
                          border-2 border-amber-300 rounded-2xl mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-black text-amber-800 text-sm">
                Aucun chantier sélectionné
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Choisissez un chantier précis dans le sélecteur du menu 
                latéral (en haut à gauche) avant de créer un bon de 
                mouvement. Un mouvement de stock doit toujours être 
                rattaché à un site unique.
              </p>
            </div>
          </div>
        )}

        <div className="card glass p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl border-slate-100">
          {/* Dynamic Date and Reference Controller */}
          <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
            <div className="space-y-1 lg:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Chantier Concerne</label>
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 
                              rounded-xl text-sm font-bold text-slate-700 
                              flex items-center gap-2 h-10">
                <MapPin className="w-4 h-4 text-slate-400" />
                Chantier : {site === 'ALL' ? 'Aucun (sélectionnez en haut)' : site}
              </div>
            </div>
            <div className={cn("space-y-1", site === 'ALL' ? "lg:col-span-1" : "")}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Date & Heure du Document</label>
              <input
                type="datetime-local"
                value={new Date(date).getTime() ? new Date(new Date(date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(new Date(e.target.value).toISOString());
                  }
                }}
                max={maxDateStr}
                min="2020-01-01T00:00"
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

            {isBackdatedMoreThan30Days && (
              <div className="sm:col-span-2 lg:col-span-3 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-2 mt-2">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-black uppercase">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />
                  Saisie rétroactive supérieure à 30 jours (Approbation Requise)
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Ce bon est rétroactif de plus de 30 jours. Pour être définitivement comptabilisé et mettre à jour les stocks, il doit être **validé par le SuperAdmin**. Veuillez renseigner ci-dessous la justification de cette saisie tardive :
                </p>
                <textarea
                  placeholder="Justification obligatoire (ex: Retard de livraison du fournisseur, correction d'un écart d'inventaire, etc.)..."
                  value={backdateReason}
                  onChange={(e) => setBackdateReason(e.target.value)}
                  className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 h-20"
                  required
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2 p-5 bg-gradient-to-br from-[#121c26] via-[#091118] to-[#04080c] border border-amber-500/20 rounded-2xl text-white shadow-2xl relative overflow-hidden">
            {/* Ambient Background decoration */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <label className="text-[10px] font-black text-[#ffd700] uppercase tracking-widest ml-1 opacity-90 block mb-3">Filtre Rapide d'Equipement / Matériel</label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[{ id: 'ENGINS', label: 'Engins', icon: Truck }, { id: 'PERFORATEURS', label: 'Perfos', icon: Drill }, { id: 'EPI', label: 'EPI', icon: User }, { id: 'OUTILS_TRAVAUX', label: 'Outils', icon: LayoutGrid }, { id: 'AUTRES', label: 'Autres', icon: Plus }].map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => { setCategoryFilter(cat.id); setShowResults(false); }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3.5 rounded-xl transition-all duration-200 border-2", 
                    categoryFilter === cat.id 
                      ? "bg-amber-950/40 text-[#ffd700] border-amber-550 shadow-[0_8px_20px_rgba(184,134,11,0.25)] scale-105 font-black" 
                      : "bg-slate-900/40 border-slate-800 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-700 hover:text-slate-100"
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

          {type === 'SORTIE' && categoryFilter === 'EPI' && (
            <div className="md:col-span-2 p-6 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight leading-none">Bénéficiaire Principal (Global)</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-1 opacity-75">
                      Qui reçoit ces pièces ? Saisissez-le ici pour l'appliquer automatiquement au bon de sortie.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest ml-1">Agent Destinataire <span className="text-rose-500">*</span></label>
                <div className="relative border-none">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
                  <select 
                    className="input-field h-12 text-sm font-black pl-12 pr-4 bg-white w-full border border-slate-200 rounded-xl outline-none transition-all focus:border-sky-550 focus:ring-4 focus:ring-sky-500/5 cursor-pointer" 
                    value={globalBeneficiaryId} 
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setGlobalBeneficiaryId(selectedId);
                      const selectedAgent = agents.find(a => a.id === selectedId);
                      if (selectedAgent) {
                        setItems(prev => prev.map(item => ({
                          ...item,
                          beneficiaryId: selectedAgent.id,
                          beneficiaryName: `${selectedAgent.lastname} ${selectedAgent.firstname}`,
                          beneficiaryService: selectedAgent.service
                        })));
                        setService(selectedAgent.service);
                        toast.success(`Bénéficiaire global défini : ${selectedAgent.lastname.toUpperCase()} ${selectedAgent.firstname.toUpperCase()} (${selectedAgent.service})`);
                      } else {
                        setService('');
                      }
                    }} 
                    required={items.length > 0}
                  >
                    <option value="">SÉLECTIONNER LE DESTINATAIRE PRINCIPAL...</option>
                    {agents.filter(a => a.site === site).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.matricule} - {a.lastname.toUpperCase()} {a.firstname.toUpperCase()} ({a.service.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Service / Département d'Affectation</label>
                <input 
                  type="text"
                  placeholder="Service (Automatique)..."
                  value={service}
                  onChange={(e) => setService(e.target.value.toUpperCase())}
                  className="input-field h-12 text-sm font-black px-4 bg-slate-100 border border-slate-200 uppercase w-full rounded-xl cursor-not-allowed text-slate-400 font-mono"
                  readOnly
                  disabled
                />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 col-span-1">
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

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Nom du Fournisseur / Vendeur (ex: SODIAM, CAT, etc.)</label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input 
                        id="entityName-input"
                        type="text"
                        className={cn(
                          "input-field h-12 text-sm font-black pl-12 pr-4 bg-white uppercase w-full",
                          entityNameError && !entityName ? "border-2 border-red-500 ring-2 ring-red-200" : ""
                        )}
                        placeholder="EX: SODIAM, CATERPILLAR, COMAT, ETC."
                        value={entityName}
                        onChange={(e) => { 
                          setEntityName(e.target.value.toUpperCase()); 
                          if (entityNameError) setEntityNameError(false);
                        }}
                        required
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                      Nom de l'entreprise fournisseur (différent de "Acheteur" ci-dessus, 
                      qui est la personne interne ayant effectué l'achat)
                    </p>
                  </div>
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

        <div className="card glass p-6 space-y-4 shadow-xl border-slate-100 rounded-2xl">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-2 border-b border-slate-150">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-500" />
                Saisie & Recherche des pièces
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {type === 'ENTREE' ? "Recherchez l'article en stock local ou importez-le depuis le catalogue Hydromines" : "Recherchez la pièce à déstocker parmi le stock local disponible"}
              </p>
            </div>
            {type === 'ENTREE' && site !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setHmSearchTerm(search);
                  setIsSelectorModalOpen(true);
                  setSelectorTab('hm_select');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-sky-500/10 active:scale-95 cursor-pointer"
              >
                ⭐ Ouvrir le Sélecteur Hydromines
              </button>
            )}
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-sky-500/5 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 relative z-10" />
            <input 
              id="main-search-input"
              type="text" 
              placeholder={site === 'ALL' ? "Sélectionnez un chantier dans le menu..." : "RECHERCHER UN ARTICLE (Saisissez désignation, référence...)"} 
              disabled={site === 'ALL'}
              className={cn(
                "input-field h-14 pl-14 text-lg font-black tracking-tight bg-white border border-slate-100 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 rounded-2xl relative z-10 transition-all uppercase",
                site === 'ALL' && "opacity-50 cursor-not-allowed bg-slate-50"
              )}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onKeyDown={handleSearchKeyDown}
            />
            {showResults && search && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] max-h-96 overflow-y-auto p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                
                {/* Keyboard Navigation Assist Helper */}
                <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                  <span>Résultats correspondants</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                    [↓ / ↑] Naviguer  •  [Entrée] Choisir
                  </span>
                </div>

                {/* Groupe 1: Articles enregistrés à ce site (Stock existant, local) */}
                {sortedArticles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest px-2 mb-2">Articles enregistrés à ce site</p>
                    {sortedArticles.map((article, idx) => {
                      const absoluteIndex = idx;
                      const isFocused = absoluteIndex === focusedIndex;
                      return (
                        <button 
                          key={article.id} 
                          type="button" 
                          onClick={() => addItem(article)} 
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all group/item flex items-center justify-between",
                            isFocused 
                              ? "bg-sky-50/70 border-sky-300 shadow-sm"
                              : "border-transparent hover:bg-sky-50/40"
                          )}
                        >
                          <div>
                            <p className="font-black text-base text-slate-900 group-hover/item:text-sky-900 transition-colors uppercase tracking-tight">{article.designation}</p>
                            <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mt-0.5">{article.ref}</p>
                          </div>
                          <span className={cn(
                            "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest flex-shrink-0",
                            article.quantity > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                          )}>
                            STK: {article.quantity}
                          </span>
                        </button>
                      );
                    })}
                    {totalMatchCount > 50 && (
                      <div className="px-3 py-2 text-[10px] text-amber-600 bg-amber-50 
                                      border-t border-amber-200 font-bold">
                        {totalMatchCount - 50} autre(s) résultat(s) non affiché(s) — 
                        affinez votre recherche pour les voir (référence exacte recommandée).
                      </div>
                    )}
                  </div>
                )}
                
                {/* Groupe 2: Catalogue Hydromines (pièce de référence officielle) */}
                {filteredHydrominesCatalog.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100 mt-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                      Catalogue Hydromines — Référence officielle
                    </p>
                    {filteredHydrominesCatalog.map((item, idx) => {
                      const absoluteIndex = sortedArticles.length + idx;
                      const isFocused = absoluteIndex === focusedIndex;
                      return (
                        <button 
                          key={item.id} 
                          type="button" 
                          onClick={() => handleImportFromHydromines(item)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all group/item flex items-center justify-between",
                            isFocused 
                              ? "bg-emerald-50 text-emerald-950 border-emerald-300 shadow-sm"
                              : "border-transparent hover:bg-emerald-50/40"
                          )}
                        >
                          <div>
                            <p className="font-black text-base text-slate-900 group-hover/item:text-emerald-900 transition-colors uppercase tracking-tight">
                              {item.designation}
                            </p>
                            <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mt-0.5">
                              {item.reference}
                            </p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all uppercase flex-shrink-0">
                            + Ajouter au stock
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Helper buttons when local stock is empty */}
                {sortedArticles.length === 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 mt-1">
                    <div className="bg-amber-50/60 border border-amber-100 p-6 rounded-2xl text-center space-y-4">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-amber-500 animate-pulse" />
                        <div>
                          <p className="text-xs font-black text-amber-950 uppercase">Référence absente du stock physique.</p>
                          <p className="text-[10px] text-amber-800 font-bold uppercase mt-0.5">Cet article n'a pas encore été approvisionné sur ce chantier.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHmSearchTerm(search);
                          setIsSelectorModalOpen(true);
                          setSelectorTab('hm_select');
                        }}
                        className="mx-auto flex items-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-sky-600/10 active:scale-95 cursor-pointer font-black"
                      >
                        ⭐ Consulter le Catalogue Technique Hydromines
                      </button>
                    </div>
                  </div>
                )}

                {sortedArticles.length > 0 && filteredHydrominesCatalog.length === 0 && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHmSearchTerm(search);
                        setIsSelectorModalOpen(true);
                        setSelectorTab('hm_select');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-sky-100 text-slate-705 hover:text-sky-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      ⭐ Rechercher plus amplement dans le catalogue Hydromines
                    </button>
                  </div>
                )}

                {/* Fallback pattern when nothing found in local stock or Hydromines Catalog */}
                {search.length >= 2 && sortedArticles.length === 0 && filteredHydrominesCatalog.length === 0 && (
                  <div className="p-6 text-center space-y-3">
                    <p className="text-sm text-slate-500 font-medium">
                      Aucune référence trouvée dans le stock ni dans le Catalogue Hydromines pour "{search}".
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        toast.info("Recherchez cette référence dans la Bibliothèque Technique (menu Catalogue), puis ajoutez-la au Catalogue Hydromines pour pouvoir l'utiliser ici.");
                      }}
                      className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95"
                    >
                      Chercher dans la Bibliothèque Technique
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div id="mouvement-items-section" className="space-y-3">
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
                          <div className="relative">
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
                            {item.beneficiaryId && globalBeneficiaryId && item.beneficiaryId !== globalBeneficiaryId && (
                              <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 mt-1.5 inline-block">
                                ⚠ Bénéficiaire Spécifique (dérogatoire)
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="py-6 px-4 text-right">
                        {type === 'ENTREE' ? (
                          <input 
                            type="number" 
                            min="0"
                            step="any"
                            className="w-28 h-12 text-right p-3 rounded-xl border-2 border-slate-100 font-black text-sm bg-white focus:border-sky-500 outline-none font-mono" 
                            value={item.price} 
                            onChange={(e) => updateItem(item.lineId, { price: Number(e.target.value) })} 
                          />
                        ) : (
                          <span className="font-black text-sm text-slate-800 font-mono">
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </td>
                      <td className="py-6 px-4">
                        <input 
                          id={`qty-${item.lineId}`}
                          type="number" 
                          min="0.001"
                          step="0.001"
                          inputMode="decimal"
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
        </div>

          {/* Bloc d'avertissement de Prix d'Achat Anomalies (Alerte ERP Qualité) */}
          {type === 'ENTREE' && priceWarnings.length > 0 && (
            <div className="my-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Alerte Contrôle Financier Qualité — Prix Saisis Inhabituels</h4>
                  <ul className="list-disc pl-4 mt-2 space-y-1.5">
                    {priceWarnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-amber-900 font-bold leading-relaxed">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <label className="flex items-center gap-3 mt-1.5 p-2.5 bg-white/60 hover:bg-white rounded-xl border border-amber-150 transition-all cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-amber-600 border-amber-300 focus:ring-amber-500 rounded cursor-pointer"
                  checked={forceSubmitPrices} 
                  onChange={(e) => setForceSubmitPrices(e.target.checked)} 
                />
                <span className="text-xs font-black text-amber-950 uppercase tracking-tight">Je confirme l'exactitude des prix exceptionnels ou nuls saisis (Forcer l'enregistrement au PMP)</span>
              </label>
            </div>
          )}

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
            <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  id="mouvement-submit-btn"
                  type="submit" 
                  disabled={items.length === 0 || site === 'ALL' || isSubmitting}
                  className={cn(
                    "flex-1 sm:flex-none px-12 h-16 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all cursor-pointer",
                    (items.length === 0 || site === 'ALL' || isSubmitting)
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-50 border-none"
                      : "bg-slate-950 text-white hover:bg-sky-600 border-none"
                  )}
                >
                  {isSubmitting 
                    ? 'Enregistrement en cours...' 
                    : site === 'ALL' 
                      ? 'Sélectionnez un chantier dans le menu' 
                      : isOnline 
                        ? 'Enregistrer' 
                        : 'Enregistrer (sera sync quand online)'
                  }
                </button>
              </div>
              {!isOnline && type === 'SORTIE' && (
                <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 max-w-sm self-stretch sm:self-auto">
                  <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Mode hors-ligne : le bon de sortie sera enregistré localement 
                    et synchronisé automatiquement au retour du réseau.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {validationError && <div className="p-3 bg-rose-50 text-rose-800 rounded-xl flex items-center gap-2 shadow-sm border border-rose-100"><AlertCircle className="w-5 h-5" /><p className="font-bold text-sm">{validationError}</p></div>}
      </form>

      <AnimatePresence>
        {isSelectorModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSelectorModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white border border-slate-150 rounded-3xl shadow-3xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative z-10"
            >
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-500" />
                    Sélecteur & Importateur Hydromines ⭐
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Intégrez instantanément une pièce certifiée du catalogue dans le stock local du chantier "{(SITES as any)[site] || site}"
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsSelectorModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 flex items-center justify-center transition-all select-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subheader / Mode description banner */}
              <div className="bg-slate-50 border-b border-slate-150 py-3.5 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none no-print">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  Catalogue Maître Officiel Hydromines ({activeHMCatalogItems.length} fiches homologuées disponibles)
                </span>
                
                {/* Mode Selector Tabs Bar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setSelectorTab('hm_select'); setSelectedTechItem(null); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      selectorTab === 'hm_select'
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-500/15"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    📦 Stock local / HM
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectorTab('hm_enrich_st2g'); setSelectedTechItem(null); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      selectorTab === 'hm_enrich_st2g'
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    ⭐ ST2G (4 T)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectorTab('hm_enrich_st2d'); setSelectedTechItem(null); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      selectorTab === 'hm_enrich_st2d'
                        ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    ⭐ ST2D (3.6 T)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectorTab('hm_enrich_t23'); setSelectedTechItem(null); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      selectorTab === 'hm_enrich_t23'
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    ⭐ T23
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectorTab('hm_enrich_t28'); setSelectedTechItem(null); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      selectorTab === 'hm_enrich_t28'
                        ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow-xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    ⭐ T28
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectorTab('hm_enrich_manual'); setSelectedTechItem(null); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      selectorTab === 'hm_enrich_manual'
                        ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    ✍️ Saisie Manuelle
                  </button>
                </div>
              </div>

              {/* MODES CONTENT */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                
                {/* LEFT COLUMN: FILTERS & RESULT LISTING */}
                {selectorTab === 'hm_select' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col min-h-0 border-r border-slate-150">
                    {/* Search & Filters Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Filtrer par Catalogue / Modèle</label>
                        <select
                          className="input-field h-11 text-xs font-bold px-3 rounded-xl border border-slate-200 w-full"
                          value={hmActiveFamily}
                          onChange={(e) => { setHmActiveFamily(e.target.value); setHmVisibleLimit(30); }}
                        >
                          <option value="ALL">TOUS LES CATALOGUES ({activeHMCatalogItems.length})</option>
                          {hmFamiliesList.map(fam => (
                            <option key={fam} value={fam}>{fam.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Filtrer par Catégorie</label>
                        <select
                          className="input-field h-11 text-xs font-bold px-3 rounded-xl border border-slate-200 w-full"
                          value={hmActiveCategory}
                          onChange={(e) => { setHmActiveCategory(e.target.value); setHmVisibleLimit(30); }}
                        >
                          <option value="ALL">TOUTES LES CATÉGORIES</option>
                          {hmCategoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Recherche textuelle</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Min. 2 caractères..."
                            value={hmSearchTerm}
                            onChange={(e) => { setHmSearchTerm(e.target.value); setHmVisibleLimit(30); }}
                            className="input-field h-11 text-xs pl-9 pr-3 rounded-xl border border-slate-200 w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Listing matching items */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {visibleHMItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                          Aucune pièce active trouvée dans le Catalogue Hydromines.
                          {hmSearchTerm.trim().length >= 1 && (
                            <p className="text-[10px] text-slate-400 lowercase mt-1 font-normal">
                              Essayez d'enrichir le catalogue via les boutons rapides ci-dessus !
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase px-1 pb-1 text-left">
                            {filteredHMItems.length} références disponibles correspondantes :
                          </div>
                          {visibleHMItems.map(item => {
                            const alreadyInLocal = articles.some(
                              a => a.site === site && 
                              a.ref.trim().toUpperCase() === item.reference.trim().toUpperCase()
                            );
                            const isSelected = selectedHMItem?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedHMItem(item)}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between",
                                  isSelected
                                    ? "bg-sky-50 border-sky-400 shadow-sm"
                                    : "border-slate-100 hover:bg-slate-50/70"
                                  )}
                              >
                                <div>
                                  <p className="font-extrabold text-sm text-slate-900 uppercase leading-snug">{item.designation}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{item.reference}</span>
                                    <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.25 rounded uppercase tracking-wider">
                                      {item.equipmentFamily || item.sourceCatalog}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400">
                                      {item.functionalCategory}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  {alreadyInLocal && (
                                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-wider scale-90">
                                      Déjà en Stock
                                    </span>
                                  )}
                                  <span className="text-xs font-black text-sky-600 hover:underline">
                                    Choisir →
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                          {filteredHMItems.length > hmVisibleLimit && (
                            <button
                              type="button"
                              onClick={() => setHmVisibleLimit(prev => prev + 30)}
                              className="w-full py-3 border border-dashed border-slate-200 hover:border-sky-300 text-slate-500 hover:text-sky-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              📥 Charger plus de références (+30)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* LEFT COLUMN: ENRICH FROM SOURCED CATALOGUES */}
                {['hm_enrich_st2g', 'hm_enrich_st2d', 'hm_enrich_t23', 'hm_enrich_t28'].includes(selectorTab) && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col min-h-0 border-r border-slate-150">
                    <div className="bg-gradient-to-r from-sky-50 to-indigo-50 p-4 rounded-2xl border border-sky-100 flex items-center gap-3 text-left">
                      <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-sky-950 uppercase">Enrichissement depuis {currentEnrichCatalog}</p>
                        <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">Recherchez une référence officielle de constructeur technique et importez-la</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Filtrer par Catégorie Technique</label>
                        <select
                          className="input-field h-11 text-xs font-bold px-3 rounded-xl border border-slate-200 w-full"
                          value={enrichCategory}
                          onChange={(e) => { setEnrichCategory(e.target.value); setEnrichLimit(30); }}
                        >
                          <option value="ALL">TOUTES LES CATÉGORIES ({enrichCategories.length})</option>
                          {enrichCategories.map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Recherche de pièces constructeurs</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Saisissez référence, désignation..."
                            value={enrichSearch}
                            onChange={(e) => { setEnrichSearch(e.target.value); setEnrichLimit(30); }}
                            className="input-field h-11 text-xs pl-9 pr-3 rounded-xl border border-slate-200 w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {visibleEnrichItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                          Saisissez au moins 2 caractères pour rechercher dans {currentEnrichCatalog}.
                        </div>
                      ) : (
                        <>
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase px-1 pb-1 text-left">
                            {enrichFilteredItems.length} références techniques trouvées :
                          </div>
                          {visibleEnrichItems.map(item => {
                            const alreadyInHM = hydrominesCatalog.some(hm => hm.reference?.trim().toLowerCase() === item.reference.trim().toLowerCase());
                            const isSelected = selectedTechItem?.reference === item.reference;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedTechItem(item)}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between",
                                  isSelected
                                    ? "bg-indigo-50/70 border-indigo-400 shadow-sm"
                                    : "border-slate-200 hover:bg-slate-50/70"
                                )}
                              >
                                <div>
                                  <p className="font-extrabold text-sm text-slate-950 uppercase leading-snug">{item.designation}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{item.reference}</span>
                                    <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.25 rounded uppercase">
                                      {item.functionalCategory}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  {alreadyInHM && (
                                    <span className="text-[9px] font-black bg-indigo-50/70 text-indigo-700 px-2 py-1 rounded-full uppercase tracking-wider">
                                      Déjà catalogue HM
                                    </span>
                                  )}
                                  <span className="text-xs font-black text-indigo-600 hover:underline">
                                    Sélectionner
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                          {enrichFilteredItems.length > enrichLimit && (
                            <button
                              type="button"
                              onClick={() => setEnrichLimit(prev => prev + 30)}
                              className="w-full py-3 border border-dashed border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              📥 Charger plus de références constructeur (+30)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* LEFT COLUMN: MANUAL ENRICHMENT FORM */}
                {selectorTab === 'hm_enrich_manual' && (
                  <form onSubmit={handleAddAndInstantiateManual} className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-slate-150 text-left">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-amber-950 uppercase">Saisie Manuelle De Secours</p>
                        <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Utilisez ceci uniquement en cas de pièce introuvable dans tous les catalogues de référence</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Référence unique *</label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex : REF-MTR-99..."
                          value={manualRef}
                          onChange={(e) => setManualRef(e.target.value)}
                          className="input-field h-11 text-xs px-3 rounded-xl border border-slate-200 w-full uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Désignation complète *</label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex : CAPTEUR DE TEMPERATURE DEUTZ..."
                          value={manualDes}
                          onChange={(e) => setManualDes(e.target.value)}
                          className="input-field h-11 text-xs px-3 rounded-xl border border-slate-200 w-full uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Catégorie fonctionnelle</label>
                        <input 
                          type="text"
                          placeholder="Ex : Electricité / Moteur..."
                          value={manualCat}
                          onChange={(e) => setManualCat(e.target.value)}
                          className="input-field h-11 text-xs px-3 rounded-xl border border-slate-200 w-full uppercase"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Famille matériels</label>
                        <select
                          className="input-field h-11 text-xs font-bold px-3 rounded-xl border border-slate-200 w-full"
                          value={manualFamily}
                          onChange={(e) => setManualFamily(e.target.value as any)}
                        >
                          <option value="ST2G">ST2G (Epiroc Scooptram)</option>
                          <option value="ST2D">ST2D (Epiroc Scooptram)</option>
                          <option value="T23">T23 (Foreuse T23)</option>
                          <option value="T28">T28 (Perforateur T28)</option>
                          <option value="CONSOMMABLES">CONSOMMABLES</option>
                          <option value="EPI">EPI</option>
                          <option value="AUTRE">AUTRE / GÉNÉRAL</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Unité de mesure</label>
                        <input 
                          type="text"
                          placeholder="Ex : Pcs, Litre, Mètre..."
                          value={manualUnit}
                          onChange={(e) => setManualUnit(e.target.value)}
                          className="input-field h-11 text-xs px-3 rounded-xl border border-slate-200 w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Type d'article (Stock)</label>
                        <select
                          className="input-field h-11 text-xs font-bold px-3 rounded-xl border border-slate-200 w-full"
                          value={manualType}
                          onChange={(e) => setManualType(e.target.value as StockType)}
                        >
                          <option value="CONSOMMABLES">CONSOMMABLES</option>
                          <option value="EPI">EPI</option>
                          <option value="OUTILS_TRAVAUX">OUTILLAGE</option>
                          <option value="ENGINS">ENGINS / RECHANGE LOURD</option>
                          <option value="PERFORATEURS">PERFORATEURS</option>
                          <option value="AUTRES">AUTRE</option>
                        </select>
                      </div>

                      <div className="space-y-2 sm:col-span-2 pt-2 flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id="manualIsCriticalCheck"
                          checked={manualIsCritical}
                          onChange={(e) => setManualIsCritical(e.target.checked)}
                          className="w-4 h-4 text-sky-650 rounded bg-white border border-slate-300"
                        />
                        <label htmlFor="manualIsCriticalCheck" className="text-xs font-black text-rose-600 uppercase tracking-wider select-none cursor-pointer">
                          ⚠️ Marquer cette pièce comme CRITIQUE pour l'exploitation
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-600/10"
                      >
                        ⭐ Enregistrer et Importer dans le Stock
                      </button>
                    </div>
                  </form>
                )}


                {/* RIGHT COLUMN: INFORMATION PANEL FOR SELECTED PIECES */}
                <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col justify-between min-h-0 border-t md:border-t-0 md:border-l border-slate-150">
                  
                  {/* INFO PANEL TITLE & METADATA */}
                  <div className="space-y-6 overflow-y-auto">
                    <div className="pb-4 border-b border-slate-200 text-left">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informations techniques</h4>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">Détail technique de la référence avant validation</p>
                    </div>

                    {selectorTab === 'hm_select' && selectedHMItem ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-left">
                          <span className="text-[8px] font-black bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Certifié Catalogue
                          </span>
                          <div className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight mt-2 pb-2">
                            {selectedHMItem.designation}
                          </div>
                          <div className="space-y-1 leading-relaxed text-xs">
                            <p className="text-[10px] uppercase font-black text-slate-400">Référence</p>
                            <p className="font-mono text-xs font-black text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100 uppercase select-all">{selectedHMItem.reference}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Catalogue source</span>
                            <span className="font-black text-slate-800 uppercase feedback-value">{selectedHMItem.sourceCatalog || 'Général'}</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Comp./Famille</span>
                            <span className="font-black text-slate-850 uppercase">{selectedHMItem.equipmentFamily || 'Consommable'}</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs col-span-2">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Catégorie fonctionnelle</span>
                            <span className="font-black text-slate-800 uppercase">{selectedHMItem.functionalCategory || 'Général'}</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Unité de mesure</span>
                            <span className="font-black text-slate-800">{selectedHMItem.unit || 'PIECE'}</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Criticité</span>
                            <span className={cn(
                              "font-black uppercase text-[10px]",
                              selectedHMItem.isHydrominesCritical ? "text-rose-600 animate-pulse font-extrabold" : "text-slate-500 font-extrabold"
                            )}>
                              {selectedHMItem.isHydrominesCritical ? "🚨 CRITIQUE" : "ORDINAIRE"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : ['hm_enrich_st2g', 'hm_enrich_st2d', 'hm_enrich_t23'].includes(selectorTab) && selectedTechItem ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-left">
                          <span className="text-[8px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Pièce officielle constructeur
                          </span>
                          <div className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight mt-2 pb-2">
                            {selectedTechItem.designation}
                          </div>
                          <div className="space-y-1 leading-relaxed text-xs">
                            <p className="text-[10px] uppercase font-black text-slate-400">Référence OEM</p>
                            <p className="font-mono text-xs font-black text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100 uppercase select-all">{selectedTechItem.reference}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Catalogue</span>
                            <span className="font-black text-indigo-700 uppercase leading-none">{currentEnrichCatalog}</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Compatibilité</span>
                            <span className="font-bold text-slate-650 uppercase text-[9px] leading-tight block">{selectedTechItem.compatibility || currentEnrichCatalog}</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs col-span-2">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Sous-catégorie / Composant</span>
                            <span className="font-black text-slate-800 uppercase text-[10px] leading-snug">
                              {selectedTechItem.functionalCategory} - {selectedTechItem.subCategory || 'Consommable'}
                            </span>
                          </div>

                          {/* Options to customise the item before adding to Hydromines Catalog */}
                          <div className="p-3 bg-white border border-slate-200 col-span-2 rounded-xl text-xs space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b pb-1.5">&#128295; Configurer la pièce pour le catalogue</p>
                            
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-500 uppercase block">Unité d'approvisionnement</label>
                              <input 
                                type="text"
                                className="w-full h-8 px-2 text-xs border border-slate-200 rounded font-bold bg-white"
                                value={enrichUnit}
                                onChange={(e) => setEnrichUnit(e.target.value)}
                                placeholder="Pcs, Litres, etc..."
                              />
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              <input 
                                type="checkbox"
                                id="enrichIsCriticalCheck"
                                checked={enrichIsCritical}
                                onChange={(e) => setEnrichIsCritical(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded bg-white border border-slate-300"
                              />
                              <label htmlFor="enrichIsCriticalCheck" className="text-[9px] font-black text-rose-600 uppercase tracking-wide select-none cursor-pointer">
                                CRITIQUE pour l'exploitation
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-24 text-center text-slate-400 space-y-2">
                        <Info className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold uppercase">Aucune référence sélectionnée</p>
                        <p className="text-[10px] font-normal leading-relaxed">Veuillez choisir un article dans la liste de gauche pour afficher ses détails techniques d'origine constructeur.</p>
                      </div>
                    )}
                  </div>

                  {/* CONFIRM / SUBMIT BUTTON IN INFO PANEL */}
                  <div className="pt-6 border-t border-slate-200 text-left">
                    {selectorTab === 'hm_select' && selectedHMItem ? (
                      <button
                        type="button"
                        onClick={() => handleSelectAndInstantiateHMItem(selectedHMItem)}
                        className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-sky-600/15"
                      >
                        ⭐ Importer & Sélectionner
                      </button>
                    ) : ['hm_enrich_st2g', 'hm_enrich_st2d', 'hm_enrich_t23', 'hm_enrich_t28'].includes(selectorTab) && selectedTechItem ? (
                      <button
                        type="button"
                        onClick={handleAddAndInstantiateTechItem}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-indigo-600/15"
                      >
                        ⭐ Ajouter & Importer
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-4 bg-slate-200 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-not-allowed border-none"
                      >
                        Sélectionnez une pièce
                      </button>
                    )}
                  </div>

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
