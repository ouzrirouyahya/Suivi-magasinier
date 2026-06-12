import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Pencil, Trash2, X, Save, AlertCircle, ChevronDown, Wrench, Database, BookOpen, Layers, Upload, FileUp, RefreshCcw, Filter, TrendingDown, TrendingUp, CheckCircle2, Activity, ShieldAlert, Download, FileSpreadsheet, Clock, Eye } from 'lucide-react';
import { Article, StockType, SiteCode, CatalogItem } from '../types';
import { cn, generateId, formatCurrency } from '../lib/utils';
import { MASTER_CATALOG } from '../catalogData';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { matchArticleSearch } from '../lib/searchUtils';
import { useInventory } from '../context/InventoryContext';

interface ArticleManagementProps {
  site: SiteCode;
  articles: Article[];
  catalog: CatalogItem[];
  saveCatalogItem?: (item: CatalogItem) => Promise<void>;
  deleteCatalogItem?: (id: string) => Promise<void>;
  onSave: (article: Article) => void;
  onDelete: (id: string) => void;
}

// --- COMPONENTES AUXILIAIRES ---

function NotificationCenter({ notifications }: { notifications: { id: string, message: string, type: 'success' | 'error' | 'info' }[] }) {
  return (
    <div className="fixed bottom-10 right-10 z-[100] flex flex-col gap-4 pointer-events-none w-full max-w-[420px]">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            className={cn(
              "p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 pointer-events-auto border backdrop-blur-xl",
              notif.type === 'success' ? "bg-emerald-500/95 border-emerald-400 text-white shadow-emerald-500/20" :
              notif.type === 'error' ? "bg-rose-500/95 border-rose-400 text-white shadow-rose-500/20" :
              "bg-slate-900/95 border-slate-700 text-white shadow-slate-900/20"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              notif.type === 'success' ? "bg-white/20" :
              notif.type === 'error' ? "bg-white/20" :
              "bg-sky-500/20"
            )}>
              {notif.type === 'success' ? (
                <Save className="w-5 h-5" />
              ) : notif.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <p className="text-sm font-black uppercase tracking-widest">{notif.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ArticleManagement({ site, articles, catalog, saveCatalogItem, deleteCatalogItem, onSave, onDelete }: ArticleManagementProps) {
  const { 
    currentUser, 
    deletionRequests = [], 
    approveDeletionRequest, 
    rejectDeletionRequest,
    deleteArticles,
    importAllCatalogToArticles,
    importSpecificCatalogItems
  } = useInventory();

  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importStrategy, setImportStrategy] = useState<'UNDER_25K' | 'UNDER_40K' | 'ALL'>('UNDER_25K');
  const [importPreviewSearch, setImportPreviewSearch] = useState('');
  const [excludedRefs, setExcludedRefs] = useState<string[]>([]);
  
  // Progress states
  const [importProgressPercent, setImportProgressPercent] = useState(0);
  const [importProgressMessage, setImportProgressMessage] = useState('');
  const [importStatus, setImportStatus] = useState<'IDLE' | 'ANALYZING' | 'GENERATING' | 'COMPLETED' | 'ERROR'>('IDLE');

  const existingRefs = React.useMemo(() => {
    return new Set(
      articles
        .filter(a => a.site === site)
        .map(a => a.ref?.trim().toLowerCase())
    );
  }, [articles, site]);

  const detectedNewItemsForImport = React.useMemo(() => {
    return MASTER_CATALOG.filter(item => {
      const ref = item.reference?.trim().toLowerCase();
      if (!ref) return false;
      
      // Filter out if already exists on current site
      if (existingRefs.has(ref)) return false;

      // Filter by strategy
      if (importStrategy === 'UNDER_25K' && (item.price || 0) >= 25000) {
        return false;
      }
      if (importStrategy === 'UNDER_40K' && (item.price || 0) >= 40000) {
        return false;
      }
      return true;
    });
  }, [importStrategy, existingRefs]);

  const bulkImportFilteredItems = React.useMemo(() => {
    return detectedNewItemsForImport.filter(item => {
      const search = importPreviewSearch.toLowerCase().trim();
      if (!search) return true;
      return (
        item.reference.toLowerCase().includes(search) || 
        item.designation.toLowerCase().includes(search)
      );
    });
  }, [detectedNewItemsForImport, importPreviewSearch]);

  const handleDownloadCsvTemplate = () => {
    const headers = "catégorie;sous catégorie;Composants;sous-composants;référence;designation;prix\n";
    const exampleRow1 = "MOTEUR;ALIMENTATION;INJECTEUR;Standard;SMI-INJ-001;INJECTEUR DE CARBURANT HIGH flow;2450.50\n";
    const exampleRow2 = "HYDRAULIQUE;DISTRIBUTION;FLEXIBLE;Standard;SMI-FLX-002;FLEXIBLE HYDRAULIQUE 1/2 HP;850.00\n";
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(headers + exampleRow1 + exampleRow2);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "modele_import_catalogue.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Modèle de catalogue CSV téléchargé avec succès !");
  };

  const handleExecuteSolidImport = async () => {
    const selectedItems = detectedNewItemsForImport.filter(
      item => !excludedRefs.includes(item.reference)
    );

    if (selectedItems.length === 0) {
      toast.error("Aucune pièce n'est sélectionnée pour la génération.");
      return;
    }

    setIsBulkImporting(true);
    setImportStatus('ANALYZING');
    setImportProgressPercent(5);
    setImportProgressMessage("Vérification des doublons sur le site et verrouillage en cours...");

    await new Promise(resolve => setTimeout(resolve, 800));

    setImportStatus('GENERATING');
    setImportProgressPercent(35);
    setImportProgressMessage(`Génération des fiches de stock (0 / ${selectedItems.length})...`);
    
    await new Promise(resolve => setTimeout(resolve, 700));

    try {
      setImportProgressPercent(60);
      setImportProgressMessage(`Écritures sécurisées Firestore (${selectedItems.length} fiches)...`);
      
      const res = await importSpecificCatalogItems(site, selectedItems);
      
      setImportProgressPercent(90);
      setImportProgressMessage("Finalisation de l'évaluation, écriture du grand livre d'audit..." + ` (Importé: ${res.imported})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setImportProgressPercent(100);
      setImportProgressMessage(`Génération terminée avec succès ! ${res.imported} fiches configurées.`);
      setImportStatus('COMPLETED');
      toast.success(`Succès ! ${res.imported} fiches d'articles générées de manière robuste pour le site ${site}.`);
      
      setTimeout(() => {
        setIsBulkImportModalOpen(false);
        setImportStatus('IDLE');
        setImportProgressPercent(0);
        setImportProgressMessage('');
        setExcludedRefs([]);
      }, 1550);

    } catch (err: any) {
      console.error(err);
      setImportStatus('ERROR');
      setImportProgressMessage(`Échec: ${err.message || err}`);
      toast.error(`Erreur d'importation : ${err.message || err}`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [inspectingCatalogItem, setInspectingCatalogItem] = useState<CatalogItem | null>(null);
  const [inspectingArticle, setInspectingArticle] = useState<Article | null>(null);
  
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);

  // Advanced Filters for active site stock articles
  const [activeMainCategory, setActiveMainCategory] = useState<string>('ALL');
  const [activeMainStatus, setActiveMainStatus] = useState<'ALL' | 'ALERT' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [activeMainType, setActiveMainType] = useState<'ALL' | 'ENGINS' | 'PERFORATEURS'>('ALL');

  // Compute key statistics (KPIs) for current site articles
  const kpis = React.useMemo(() => {
    const siteArticles = articles.filter(a => a.site === site);
    const totalItems = siteArticles.length;
    const totalValue = siteArticles.reduce((sum, a) => sum + ((a.price || 0) * (a.quantity || 0)), 0);
    const alertCount = siteArticles.filter(a => a.quantity <= a.minStock && a.quantity > 0).length;
    const outOfStockCount = siteArticles.filter(a => a.quantity === 0).length;
    
    return {
      totalItems,
      totalValue,
      alertCount,
      outOfStockCount
    };
  }, [articles, site]);

  // Compute unique classification categories active for this site's articles
  const activeStockCategories = React.useMemo(() => {
    const cats = new Set<string>();
    articles.filter(a => a.site === site).forEach(a => {
      const c = a.functionalCategory || a.category;
      if (c) cats.add(c);
    });
    return Array.from(cats).sort();
  }, [articles, site]);

  const [activeCatalogType, setActiveCatalogType] = useState<StockType>('ENGINS');
  const [activeCatalogFilter, setActiveCatalogFilter] = useState<'ALL' | 'ST2G' | 'ST2D' | 'MONTALBERT'>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Dynamic Catalog State
  const [isManagingCatalog, setIsManagingCatalog] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<Partial<CatalogItem> | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Advanced Catalog Filters & Sorting
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');
  const [catalogPriceFilter, setCatalogPriceFilter] = useState<'ALL' | 'BELOW_40K' | 'BELOW_50K' | 'EXPENSIVE_ONLY'>('BELOW_40K');
  const [selectedSort, setSelectedSort] = useState<string>('DEFAULT');

  const highlightText = (text: string, search: string) => {
    if (!text) return "";
    if (!search.trim()) return <>{text}</>;
    
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-amber-100 text-amber-950 font-semibold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const toggleSelectArticle = (id: string) => {
    setSelectedArticleIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredArticles = React.useMemo(() => {
    return articles.filter(a => {
      if (a.site !== site) return false;
      
      // 1. Search term target match
      if (!matchArticleSearch(a, searchTerm)) return false;
      
      // 2. Main functional category tab filter
      if (activeMainCategory !== 'ALL') {
        const cat = a.functionalCategory || a.category || '';
        if (cat !== activeMainCategory) return false;
      }
      
      // 3. Stock Type filter
      if (activeMainType !== 'ALL') {
        if (a.type !== activeMainType) return false;
      }
      
      // 4. Stock alert & out-of-stock count filter
      if (activeMainStatus === 'ALERT') {
        if (a.quantity > a.minStock || a.quantity === 0) return false;
      } else if (activeMainStatus === 'OUT_OF_STOCK') {
        if (a.quantity !== 0) return false;
      } else if (activeMainStatus === 'IN_STOCK') {
        if (a.quantity === 0) return false;
      }
      
      return true;
    });
  }, [articles, site, searchTerm, activeMainCategory, activeMainStatus, activeMainType]);

  const isAllSelected = filteredArticles.length > 0 && filteredArticles.every(a => selectedArticleIds.includes(a.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedArticleIds(prev => prev.filter(id => !filteredArticles.some(a => a.id === id)));
    } else {
      const newIds = filteredArticles.map(a => a.id);
      setSelectedArticleIds(prev => {
        const set = new Set([...prev, ...newIds]);
        return Array.from(set);
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedArticleIds.length === 0) return;
    await deleteArticles(selectedArticleIds);
    setSelectedArticleIds([]);
  };

  const currentCatalog = React.useMemo(() => {
    return catalog.filter(item => {
      const comp = (item.compatibility || '').toLowerCase();
      const machs = (item.compatibleMachines || []).map(m => m.toLowerCase());
      const id = (item.id || '').toLowerCase();
      
      const isST2G = comp.includes('st2g') || machs.some(m => m.includes('st2g')) || id.startsWith('st2g_');
      const isST2D = comp.includes('st2d') || machs.some(m => m.includes('st2d')) || id.startsWith('st2d_');
      const isMontabert = comp.includes('montabert') || comp.includes('t23') || machs.some(m => m.includes('montabert') || m.includes('t23')) || id.startsWith('perf_') || id.startsWith('cop_');
      
      if (activeCatalogFilter === 'ALL') return true;
      if (activeCatalogFilter === 'ST2G') return isST2G;
      if (activeCatalogFilter === 'ST2D') return isST2D;
      if (activeCatalogFilter === 'MONTALBERT') return isMontabert;
      
      return item.suggestedType === activeCatalogType;
    });
  }, [catalog, activeCatalogFilter, activeCatalogType]);

  const changeCatalogFilter = (filter: 'ALL' | 'ST2G' | 'ST2D' | 'MONTALBERT') => {
    setActiveCatalogFilter(filter);
    if (filter === 'ALL') {
      setActiveCatalogType('ENGINS');
    } else {
      setActiveCatalogType(filter === 'MONTALBERT' ? 'PERFORATEURS' : 'ENGINS');
    }
    setNavPath([]);
    setCatalogSearch('');
  };

  // Drill-down state
  const [navPath, setNavPath] = useState<{level: string, value: string}[]>([]);
  const [currentLevel, setCurrentLevel] = useState<'CATEGORY' | 'SUBCATEGORY' | 'COMPONENT' | 'SUBCOMPONENT' | 'RESULTS'>('CATEGORY');

  const isFilterActive = selectedMachine !== 'ALL' || selectedCategory !== 'ALL' || selectedCriticality !== 'ALL' || catalogPriceFilter !== 'BELOW_40K';

  useEffect(() => {
    if (catalogSearch.length > 0 || isFilterActive) {
      setCurrentLevel('RESULTS');
    } else if (navPath.length === 0) {
      setCurrentLevel('CATEGORY');
    } else if (navPath.length === 1) {
      setCurrentLevel('SUBCATEGORY');
    } else if (navPath.length === 2) {
      setCurrentLevel('COMPONENT');
    } else if (navPath.length === 3) {
      setCurrentLevel('SUBCOMPONENT');
    }
  }, [navPath, catalogSearch, isFilterActive]);

  const categories: string[] = React.useMemo(() => {
    const uniqueMap = new Map<string, number>();
    currentCatalog.forEach(item => {
      const cat = item.functionalCategory || 'AUTRE';
      uniqueMap.set(cat, (uniqueMap.get(cat) || 0) + 1);
    });
    return Array.from(uniqueMap.entries())
      .sort((a, b) => b[1] - a[1]) // highest count first
      .map(entry => entry[0]);
  }, [currentCatalog]);
  
  const subCategories: string[] = React.useMemo(() => {
    if (navPath.length < 1) return [];
    const uniqueMap = new Map<string, number>();
    currentCatalog
      .filter(item => item.functionalCategory === navPath[0].value)
      .forEach(item => { 
        if (item.subCategory) {
          uniqueMap.set(item.subCategory, (uniqueMap.get(item.subCategory) || 0) + 1);
        }
      });
    return Array.from(uniqueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }, [currentCatalog, navPath]);

  const components: string[] = React.useMemo(() => {
    if (navPath.length < 2) return [];
    const uniqueMap = new Map<string, number>();
    currentCatalog
      .filter(item => item.functionalCategory === navPath[0].value && item.subCategory === navPath[1].value)
      .forEach(item => { 
        if (item.component) {
          uniqueMap.set(item.component, (uniqueMap.get(item.component) || 0) + 1);
        }
      });
    return Array.from(uniqueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }, [currentCatalog, navPath]);

  const subComponents: string[] = React.useMemo(() => {
    if (navPath.length < 3) return [];
    const uniqueMap = new Map<string, number>();
    currentCatalog
      .filter(item => item.functionalCategory === navPath[0].value && item.subCategory === navPath[1].value && item.component === navPath[2].value)
      .forEach(item => { 
        if (item.subComponent) {
          uniqueMap.set(item.subComponent, (uniqueMap.get(item.subComponent) || 0) + 1);
        }
      });
    return Array.from(uniqueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }, [currentCatalog, navPath]);

  const finalItems = React.useMemo(() => {
    let items = currentCatalog;

    // 1. Search filter
    if (catalogSearch.length > 0) {
      const s = catalogSearch.toLowerCase();
      items = items.filter(item => 
        item.reference.toLowerCase().includes(s) ||
        item.designation.toLowerCase().includes(s) ||
        item.functionalCategory.toLowerCase().includes(s) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(s)) ||
        (item.component && item.component.toLowerCase().includes(s)) ||
        (item.subComponent && item.subComponent.toLowerCase().includes(s))
      );
    } else {
      // Direct navigation layout if no advanced filters are active, otherwise flatten
      if (!isFilterActive) {
        if (navPath.length === 0) return [];
        items = items.filter(item => {
          const matchesCategory = item.functionalCategory === navPath[0].value;
          const matchesSub = navPath.length >= 2 ? item.subCategory === navPath[1].value : true;
          const matchesComp = navPath.length >= 3 ? item.component === navPath[2].value : true;
          const matchesSubComp = navPath.length >= 4 ? item.subComponent === navPath[3].value : true;
          return matchesCategory && matchesSub && matchesComp && matchesSubComp;
        });
      }
    }

    // 2. Machine filter
    if (selectedMachine !== 'ALL') {
      items = items.filter(item => {
        const comp = (item.compatibility || '').toUpperCase();
        if (selectedMachine === 'ST2G') return comp.includes('ST2G');
        if (selectedMachine === 'ST2D') return comp.includes('ST2D');
        if (selectedMachine === 'COP1838') return comp.includes('COP 1838') || comp.includes('COP');
        if (selectedMachine === 'HC50') return comp.includes('HC50') || comp.includes('MONTABERT');
        return true;
      });
    }

    // 3. Category filter
    if (selectedCategory !== 'ALL') {
      items = items.filter(item => item.functionalCategory === selectedCategory);
    }

    // 4. Criticality filter
    if (selectedCriticality !== 'ALL') {
      items = items.filter(item => item.criticality === selectedCriticality);
    }

    // 4.5 Price filter (Budget limits for warehouse storage)
    if (catalogPriceFilter === 'BELOW_40K') {
      items = items.filter(item => (item.price || 0) < 40000);
    } else if (catalogPriceFilter === 'BELOW_50K') {
      items = items.filter(item => (item.price || 0) < 50000);
    } else if (catalogPriceFilter === 'EXPENSIVE_ONLY') {
      items = items.filter(item => (item.price || 0) >= 40000);
    }

    // 5. Sorting
    if (selectedSort === 'PRICE_ASC') {
      items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (selectedSort === 'PRICE_DESC') {
      items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (selectedSort === 'DISPO_LOCAL' || selectedSort === 'DISPO_MASTER') {
      const getDispoOrder = (item: CatalogItem) => {
        const isLocal = articles.some(a => a.site === site && a.ref === item.reference);
        return isLocal ? 0 : 1;
      };
      if (selectedSort === 'DISPO_LOCAL') {
        items = [...items].sort((a, b) => getDispoOrder(a) - getDispoOrder(b));
      } else {
        items = [...items].sort((a, b) => getDispoOrder(b) - getDispoOrder(a));
      }
    }

    return items;
  }, [currentCatalog, catalogSearch, navPath, selectedMachine, selectedCategory, selectedCriticality, selectedSort, articles, site, isFilterActive, catalogPriceFilter]);

  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const confirmReplacement = confirm(
        `AVERTISSEMENT : L'importation d'un nouveau fichier va ajouter ces données au catalogue ${activeCatalogType === 'ENGINS' ? 'ST2G/ST2D' : 'Perforateurs'}.\n\nVoulez-vous continuer ?`
      );

      if (!confirmReplacement) {
        if (event.target) event.target.value = '';
        return;
      }

      setIsImporting(true);
      setImportProgress(0);
      
      const normalize = (val: string) => {
        if (!val) return "";
        return val.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") 
          .replace(/[^a-z0-9]/g, "");
      };

      // PHASE 2: PROCESSING SYSTEM
      const CHUNK_SIZE = 2000;
      let rows: string[][] = [];
      let headerRowIdx = -1;
      const colIdx = { cat: -1, sub: -1, comp: -1, subComp: -1, ref: -1, desc: -1, notes: -1, price: -1 };
      const newItems: CatalogItem[] = [];
      
      Papa.parse(file, {
        encoding: "ISO-8859-1",
        skipEmptyLines: 'greedy',
        header: false,
        worker: false, // Worker can be unstable in some sandboxes, use chunked main thread processing instead
        complete: (results) => {
          rows = results.data as string[][];
          if (rows.length === 0) {
            setIsImporting(false);
            setImportProgress(0);
            addNotification("Le fichier est vide.", "error");
            return;
          }

          setImportProgress(10);
          
          // Identify headers
          headerRowIdx = rows.findIndex(row => 
            row.some(cell => {
              const n = normalize(cell);
              return n === 'reference' || n === 'ref' || n === 'designation' || n === 'description' || 
                     n === 'partnumber' || n === 'codearticle' || n === 'oem' || n === 'pn' || 
                     n === 'p/n' || n === 'code' || n === 'article' || n === 'label' || n === 'codepiece' ||
                     n === 'referencepiece';
            })
          );

          if (headerRowIdx === -1) {
             colIdx.ref = 0;
             colIdx.desc = 1;
          } else {
            rows[headerRowIdx].forEach((cell, i) => {
              const n = normalize(cell);
              if ((n.includes('cat') || n.includes('domain') || n.includes('famill') || n.includes('system') || n.includes('groupe')) && !n.includes('sous')) colIdx.cat = i;
              if (n.includes('sous') && (n.includes('cat') || n.includes('domain') || n.includes('famill'))) colIdx.sub = i;
              if ((n.includes('comp') || n.includes('bloc') || n.includes('moteur') || n.includes('ensemble') || n.includes('module')) && !n.includes('sous')) colIdx.comp = i;
              if (n.includes('sous') && (n.includes('comp') || n.includes('bloc'))) colIdx.subComp = i;
              if (n === 'reference' || n === 'ref' || n === 'partnumber' || n === 'code' || n === 'oem' || n === 'pn' || n === 'p/n' || n === 'codearticle' || n === 'codepiece' || n === 'referencepiece') colIdx.ref = i;
              if (n === 'designation' || n === 'description' || n === 'article' || n === 'label' || n === 'nom' || n === 'libelle' || n === 'texte') colIdx.desc = i;
              if (n.includes('note') || n.includes('obs') || n.includes('com') || n.includes('remarque')) colIdx.notes = i;
              if (n.includes('prix') || n.includes('price') || n.includes('valeur') || n.includes('montant') || n.includes('cout')) colIdx.price = i;
            });
          }

          // Special logic for the provided format: catégorie;sous catégorie;Composants;sous-composants;référence
          if (colIdx.cat !== -1 && colIdx.sub !== -1 && colIdx.comp !== -1 && colIdx.subComp !== -1 && colIdx.ref === -1) {
             // If we found the first 4 but not "ref", and there's a 5th column, it's likely "ref"
             if (rows[headerRowIdx]?.length >= 5) colIdx.ref = 4;
          }

          if ((colIdx.ref === -1 || colIdx.desc === -1) && rows[headerRowIdx]?.length >= 6) {
             if (colIdx.ref === -1) colIdx.ref = 4;
             if (colIdx.desc === -1) colIdx.desc = 5;
          }

          const dataRows = rows.slice(headerRowIdx === -1 ? 0 : headerRowIdx + 1);
          let currentIdx = 0;
          let currentCat = '', currentSub = '', currentComp = '';

          // BATCH PROCESSOR FUNCTION
          const processNextChunk = () => {
            const endIdx = Math.min(currentIdx + CHUNK_SIZE, dataRows.length);
            
            for (let i = currentIdx; i < endIdx; i++) {
              const row = dataRows[i];
              if (row.length < 2) continue;
              const refVal = row[colIdx.ref]?.trim();
              
              if (!refVal) continue;
              if (normalize(refVal) === 'reference' || normalize(refVal) === 'ref') continue; 

              const priceVal = colIdx.price !== -1 ? parseFloat(row[colIdx.price]?.replace(',', '.') || '0') : 0;
              
              const cat = colIdx.cat !== -1 ? row[colIdx.cat]?.trim() : '';
              const sub = colIdx.sub !== -1 ? row[colIdx.sub]?.trim() : '';
              const comp = colIdx.comp !== -1 ? row[colIdx.comp]?.trim() : '';
              const subComp = colIdx.subComp !== -1 ? row[colIdx.subComp]?.trim() : '';
              
              if (cat) currentCat = cat;
              if (sub) currentSub = sub;
              if (comp) currentComp = comp;
              
              // If designation is missing, use the most specific hierarchy name
              let descVal = colIdx.desc !== -1 ? row[colIdx.desc]?.trim() : '';
              if (!descVal) {
                descVal = subComp || comp || sub || currentSub || currentComp || refVal;
              }
              
              newItems.push({
                id: `imp_${activeCatalogType}_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                functionalCategory: currentCat || 'AUTRES',
                subCategory: currentSub || 'DIVERS',
                component: currentComp || 'STANDARD',
                subComponent: subComp || '',
                reference: refVal,
                designation: descVal,
                notes: colIdx.notes !== -1 ? row[colIdx.notes]?.trim() || '' : '',
                price: priceVal || 0,
                suggestedType: activeCatalogType,
                source: 'UPLOAD'
              });
            }

            currentIdx = endIdx;
            const progress = Math.round(10 + (currentIdx / dataRows.length) * 80);
            setImportProgress(progress);

            if (currentIdx < dataRows.length) {
              // Yield to main thread
              setTimeout(processNextChunk, 10);
            } else {
              // FINALIZE
              finalizeImport();
            }
          };

          const finalizeImport = async () => {
             if (newItems.length > 0) {
               if (saveCatalogItem) {
                 for (const item of newItems) {
                   await saveCatalogItem(item);
                 }
               }
               setNavPath([]);
               setCatalogSearch('');
               setImportProgress(100);
               
               setTimeout(() => {
                 setIsImporting(false);
                 setImportProgress(0);
                 addNotification(`IMPORTATION RÉUSSIE : ${newItems.length} références synchronisées.`, 'success');
                 if (event.target) event.target.value = '';
               }, 500);
             } else {
               setIsImporting(false);
               setImportProgress(0);
               addNotification("Le fichier n'a pas pu être lu correctement. Vérifiez le format.", 'error');
               if (event.target) event.target.value = '';
             }
          };

          // Start processing
          processNextChunk();
        },
        error: (err) => {
          setIsImporting(false);
          setImportProgress(0);
          addNotification(`Erreur CSV: ${err}`, "error");
        }
      });
    };

  const handleDeleteCatalogBranch = async (scope: 'CATEGORY' | 'SUBCATEGORY' | 'COMPONENT', value: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toute la branche "${value}" ?`)) return;

    const itemsToDelete = catalog.filter(item => {
      if (scope === 'CATEGORY') return item.functionalCategory === value;
      if (scope === 'SUBCATEGORY') return item.subCategory === value && item.functionalCategory === navPath[0]?.value;
      if (scope === 'COMPONENT') return item.component === value && item.subCategory === navPath[1]?.value && item.functionalCategory === navPath[0]?.value;
      return false;
    });

    if (deleteCatalogItem) {
      for (const item of itemsToDelete) {
        await deleteCatalogItem(item.id);
      }
      addNotification(`${itemsToDelete.length} références supprimées`, "success");
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    if (!confirm('Supprimer cette référence du catalogue ?')) return;
    if (deleteCatalogItem) {
      await deleteCatalogItem(id);
      addNotification("Référence supprimée du master", "success");
    }
  };

  const handleSaveCatalogItem = async () => {
    if (!editingCatalogItem?.reference || !editingCatalogItem?.designation) {
      addNotification("Référence et Désignation sont requises", "error");
      return;
    }

    const newItem: CatalogItem = {
      id: editingCatalogItem.id || generateId(),
      reference: editingCatalogItem.reference.toUpperCase(),
      designation: editingCatalogItem.designation,
      functionalCategory: editingCatalogItem.functionalCategory || (navPath[0]?.value || 'SANS CATÉGORIE'),
      subCategory: editingCatalogItem.subCategory || (navPath[1]?.value || ''),
      component: editingCatalogItem.component || (navPath[2]?.value || ''),
      subComponent: editingCatalogItem.subComponent || '',
      notes: editingCatalogItem.notes || '',
      price: editingCatalogItem.price || 0,
      suggestedType: editingCatalogItem.suggestedType || activeCatalogType,
      source: 'MASTER'
    };

    if (saveCatalogItem) {
      await saveCatalogItem(newItem);
      addNotification(`Item ${newItem.reference} synchronisé au master`, "success");
      setIsCatalogModalOpen(false);
      setEditingCatalogItem(null);
    }
  };

  const pushNav = (level: string, value: string) => {
    setNavPath(prev => [...prev, { level, value }]);
    setCatalogSearch('');
  };

  const resetNav = (index: number) => {
    setNavPath(prev => prev.slice(0, index));
    setCatalogSearch('');
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingArticle({
      id: generateId(),
      site,
      ref: '',
      designation: '',
      type: 'ENGINS',
      category: '',
      unit: 'Pcs',
      quantity: 0,
      minStock: 0,
      location: '',
      price: 0,
      active: true,
      functionalCategory: '',
      subCategory: '',
      component: '',
      subComponent: ''
    });
    setIsModalOpen(true);
  };

  const handleImportFromCatalog = (item: CatalogItem) => {
    setEditingArticle({
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
      notes: item.notes,
      unit: 'Pcs',
      quantity: 0,
      minStock: 1,
      location: '',
      price: item.price || 0,
      active: true
    });
    setIsCatalogOpen(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArticle) {
      onSave(editingArticle as Article);
      setIsModalOpen(false);
      setEditingArticle(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Catalogue Articles</h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">Gouvernance des références techniques du site {site}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button 
            onClick={() => {
              changeCatalogFilter('ALL');
              setIsCatalogOpen(true);
            }} 
            className="btn bg-slate-900 border border-slate-800 text-white hover:bg-indigo-650 shadow-md h-9 px-3.5 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <BookOpen className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform relative z-10" /> 
            <span className="relative z-10">Catalogue Master (Tous)</span>
          </button>

          <button 
            onClick={() => {
              changeCatalogFilter('ST2G');
              setIsCatalogOpen(true);
            }} 
            className="btn bg-white text-emerald-700 border border-emerald-100 hover:border-emerald-600 shadow-sm h-9 px-3 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Database className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform relative z-10" /> 
            <span className="relative z-10">Cat. ST2G</span>
          </button>

          <button 
            onClick={() => {
              changeCatalogFilter('ST2D');
              setIsCatalogOpen(true);
            }} 
            className="btn bg-white text-sky-700 border border-sky-100 hover:border-sky-600 shadow-sm h-9 px-3 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Database className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform relative z-10" /> 
            <span className="relative z-10">Cat. ST2D</span>
          </button>
          
          <button 
            onClick={() => {
              changeCatalogFilter('MONTALBERT');
              setIsCatalogOpen(true);
            }} 
            className="btn bg-white text-rose-700 border border-rose-100 hover:border-rose-700 shadow-sm h-9 px-3 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-rose-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Layers className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform relative z-10" /> 
            <span className="relative z-10">Cat. T23 (Montabert)</span>
          </button>
          
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
            <button 
              onClick={() => setIsBulkImportModalOpen(true)}
              disabled={isBulkImporting}
              className="btn bg-sky-50 text-sky-700 border border-sky-100 hover:border-sky-500 hover:bg-sky-100/55 shadow-sm h-9 px-3 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 disabled:opacity-50 select-none cursor-pointer"
              title="Générer collectivement les fiches d'articles pour ce site avec filtres intelligents"
            >
              {isBulkImporting ? (
                <RefreshCcw className="w-3.5 h-3.5 animate-spin text-sky-600" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />
              )}
              <span>Tout Importer</span>
            </button>
          )}
          
          <span className="w-1 px-1" />

          <button onClick={handleCreate} className="btn bg-slate-950 text-white hover:bg-sky-600 shadow-sm h-9 px-4 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" /> Ajouter
          </button>
        </div>
      </header>

      {/* SECTION CARTES STATISTIQUES (KPIs VISUELS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 group-hover:bg-indigo-600 transition-colors" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Totale du Stock</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(kpis.totalValue)}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Valorisation du site {site}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-all">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 group-hover:bg-sky-600 transition-colors" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pièces Référencées</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{kpis.totalItems} articles</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Configurées localement</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 flex items-center justify-center transition-all">
              <Database className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 group-hover:bg-amber-600 transition-colors" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Seuil Alerte Atteint</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{kpis.alertCount} alertes</p>
              <p className="text-[9px] text-amber-500 font-semibold uppercase tracking-wider mt-0.5">Quantité ≤ Seuil minimal</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 flex items-center justify-center transition-all">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 group-hover:bg-rose-600 transition-colors" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rupture de Stock</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{kpis.outOfStockCount} articles</p>
              <p className="text-[9px] text-rose-400 font-bold uppercase tracking-wider mt-0.5">Indisponible sur Site</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 flex items-center justify-center transition-all">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Demande de suppression administratives en attente */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && deletionRequests.filter(r => r.status === 'PENDING_APPROVAL').length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-[2rem] p-6 mb-6 shadow-xl relative overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-slate-950 uppercase text-xs tracking-widest">Demandes de suppression en attente</h3>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">Validation administrative requise d'urgence</p>
            </div>
          </div>
          
          <div className="divide-y divide-amber-100/50">
            {deletionRequests.filter(r => r.status === 'PENDING_APPROVAL').map(req => (
              <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Site: {req.site}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">
                      Demandé par {req.requestedBy} le {new Date(req.requestedAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-800 text-sm font-semibold">
                    Articles : <span className="font-semibold text-slate-900">{req.articleDesignations.map((d, idx) => `${d} (${req.articleRefs[idx]})`).join(', ')}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveDeletionRequest(req.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm shadow-emerald-600/10 cursor-pointer"
                  >
                    Valider la suppression
                  </button>
                  <button
                    onClick={() => rejectDeletionRequest(req.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all outline outline-1 outline-rose-200/50 cursor-pointer"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre d'action de suppression groupée */}
      {selectedArticleIds.length > 0 && (
        <div className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 font-extrabold text-xs">
              {selectedArticleIds.length}
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-300">
              {selectedArticleIds.length === 1 ? "Article sélectionné" : "Articles sélectionnés"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleBulkDelete}
              className="bg-rose-600/[0.93] hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-lg shadow-rose-600/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> 
              {currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' ? "Supprimer définitivement" : "Demander la suppression"}
            </button>
            <button 
              onClick={() => setSelectedArticleIds([])}
              className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* BARRE DE FILTRES AVANCÉS POUR LE CATALOGUE ACTIF DU SITE */}
      <div className="p-6 bg-white/80 border border-slate-100 rounded-[2rem] shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 font-black" />
              Filtrer par Système Fonctionnel (Division Technique)
            </span>
            {activeMainCategory !== 'ALL' && (
              <button 
                onClick={() => setActiveMainCategory('ALL')}
                className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline"
              >
                Réinitialiser la catégorie
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={() => setActiveMainCategory('ALL')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border",
                activeMainCategory === 'ALL'
                  ? "bg-slate-950 text-white border-slate-950 shadow-md scale-103"
                  : "bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              Tous ({kpis.totalItems})
            </button>
            
            {activeStockCategories.map(cat => {
              const count = articles.filter(a => a.site === site && (a.functionalCategory === cat || a.category === cat)).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveMainCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border flex items-center gap-1.5",
                    activeMainCategory === cat
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10 scale-103"
                      : "bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span>{cat}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-extrabold",
                    activeMainCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100/60">
          {/* SÉLECTEUR TYPES DE PIÈCES */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Classification En Engins / Perfos</span>
            <div className="flex items-center bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
              {(['ALL', 'ENGINS', 'PERFORATEURS'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveMainType(type)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                    activeMainType === type 
                      ? "bg-white text-slate-950 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {type === 'ALL' ? 'Tous' : type}
                </button>
              ))}
            </div>
          </div>

          {/* SÉLECTEUR STATUT PHYSIQUE EN STOCK */}
          <div className="flex flex-col gap-1 min-w-[260px]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5 font-bold">Niveau d'approvisionnement (Disponibilité)</span>
            <div className="flex items-center bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
              <button
                onClick={() => setActiveMainStatus('ALL')}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                  activeMainStatus === 'ALL' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Tout Stock
              </button>
              <button
                onClick={() => setActiveMainStatus('IN_STOCK')}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1",
                  activeMainStatus === 'IN_STOCK' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Disponible
              </button>
              <button
                onClick={() => setActiveMainStatus('ALERT')}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1",
                  activeMainStatus === 'ALERT' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Alerte Seuil
              </button>
              <button
                onClick={() => setActiveMainStatus('OUT_OF_STOCK')}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1",
                  activeMainStatus === 'OUT_OF_STOCK' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                Rupture
              </button>
            </div>
          </div>

          {/* SÉLECTEUR REMISE À ZÉRO RAPIDE */}
          {(activeMainCategory !== 'ALL' || activeMainStatus !== 'ALL' || activeMainType !== 'ALL' || searchTerm !== '') && (
            <button
              onClick={() => {
                setActiveMainCategory('ALL');
                setActiveMainStatus('ALL');
                setActiveMainType('ALL');
                setSearchTerm('');
              }}
              className="px-3 py-2 text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl uppercase tracking-widest border border-rose-100 transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Réinitialiser
            </button>
          )}

          {/* INDICATEUR DE RÉSULTATS FILTRÉS */}
          <div className="ml-auto text-right pr-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Éléments filtrés :</span>
            <p className="text-sm font-black text-indigo-600">{filteredArticles.length} / {kpis.totalItems} articles</p>
          </div>
        </div>
      </div>

      <div className="card glass p-4 shadow-xl ring-1 ring-slate-900/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            placeholder="Rechercher une nomenclature (REF, OEM, Designation)..." 
            className="input-field pl-11 pr-10 h-10 text-sm bg-white/40 border-slate-200/50 rounded-xl font-black tracking-tight"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="table-container glass border-0 shadow-xl ring-1 ring-slate-900/5 overflow-hidden rounded-xl">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Référence & Désignation</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Classification</th>
              <th className="px-6 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Stock Actuel</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Prix Unit.</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Seuil Alerte</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Localisation</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
              <th className="px-6 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {filteredArticles.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-slate-800 font-black text-sm mt-2">Aucun article ne correspond à votre recherche</p>
                    <p className="text-xs text-slate-400">Essayez de modifier votre mot-clé ou réinitialiser vos paramètres de filtrage.</p>
                    {(activeMainCategory !== 'ALL' || activeMainStatus !== 'ALL' || activeMainType !== 'ALL' || searchTerm !== '') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMainCategory('ALL');
                          setActiveMainStatus('ALL');
                          setActiveMainType('ALL');
                          setSearchTerm('');
                        }}
                        className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
                      >
                        Tout réinitialiser
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredArticles.map(article => (
                <tr 
                  key={article.id} 
                  onClick={() => setInspectingArticle(article)}
                  className={cn(
                    "group hover:bg-slate-50/70 border-b border-slate-100 transition-all duration-300 cursor-pointer select-none",
                    inspectingArticle?.id === article.id && "bg-sky-50/50 hover:bg-sky-50/50"
                  )}
                >
                  <td className="px-6 py-4">
                    <p className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">#{highlightText(article.ref, searchTerm)}</p>
                    <p className="font-black text-slate-900 text-sm leading-tight">{highlightText(article.designation, searchTerm)}</p>
                    {article.component && (
                      <div className="flex items-center gap-2 mt-1.5">
                         <Layers className="w-3 h-3 text-sky-400" />
                         <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">
                           {highlightText(article.functionalCategory || '', searchTerm)} / {highlightText(article.component || '', searchTerm)}
                         </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 uppercase tracking-widest w-fit">
                        {article.type}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{highlightText(article.category, searchTerm)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {article.quantity === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-rose-700 bg-rose-50 border border-rose-100 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        Rupture (0)
                      </span>
                    ) : article.quantity <= article.minStock ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-amber-700 bg-amber-50 border border-amber-100 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                        Critique ({article.quantity} {article.unit})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 uppercase tracking-widest animate-in fade-in">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {article.quantity} <span className="text-[10px] text-emerald-600/70">{article.unit}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(article.price)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-slate-950">{article.minStock} <span className="text-[10px] text-slate-400 uppercase">{article.unit}</span></p>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <span className="font-black text-slate-600 text-sm">{highlightText(article.location, searchTerm)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                      article.active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                    )}>
                      {article.active ? 'Opérationnel' : 'Archivé'}
                    </span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setInspectingArticle(article); }}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEdit(article); }} 
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(article.id); }} 
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCatalogOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-[0_0_100px_rgba(8,145,213,0.3)] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
            <header className="px-10 py-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-white relative z-10 select-none">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "p-3 rounded-2xl shadow-md transition-all duration-500 hover:scale-110",
                  activeCatalogFilter === 'ST2G' ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" :
                  activeCatalogFilter === 'ST2D' ? "bg-sky-50 text-sky-600 shadow-sky-100" :
                  activeCatalogFilter === 'MONTALBERT' ? "bg-rose-50 text-rose-600 shadow-rose-100" :
                  "bg-indigo-50 text-indigo-600 shadow-indigo-100"
                )}>
                  {activeCatalogFilter === 'MONTALBERT' ? <Layers className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="shiny-logo px-3 py-1 rounded-xl bg-white border border-slate-50 transition-all shadow-sm">
                      <h3 className="text-lg font-black tracking-tighter uppercase flex items-center">
                        <span className="text-sky-500">Hydro</span>
                        <span className="text-red-700">Mines</span>
                      </h3>
                    </div>
                    <span className="mx-2 w-1.5 h-6 bg-slate-200 rounded-full" />
                    
                    {/* Catalog Toggles inside modal */}
                    <div className="flex items-center bg-slate-100/80 p-1.5 rounded-xl gap-1">
                      <button 
                        onClick={() => changeCatalogFilter('ALL')}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                          activeCatalogFilter === 'ALL' ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        TOUT LE CATALOGUE
                      </button>
                      <button 
                        onClick={() => changeCatalogFilter('ST2G')}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                          activeCatalogFilter === 'ST2G' ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        ST2G
                      </button>
                      <button 
                        onClick={() => changeCatalogFilter('ST2D')}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                          activeCatalogFilter === 'ST2D' ? "bg-sky-600 text-white shadow" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        ST2D
                      </button>
                      <button 
                        onClick={() => changeCatalogFilter('MONTALBERT')}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                          activeCatalogFilter === 'MONTALBERT' ? "bg-rose-600 text-white shadow" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        T23 / Montabert
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => resetNav(0)} className="text-xs font-black text-slate-400 hover:text-sky-600 uppercase tracking-[0.2em] transition-colors">Accueil</button>
                    {navPath.map((node, i) => (
                      <React.Fragment key={`${node.level}-${node.value}`}>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-200 -rotate-90" />
                        <button 
                          onClick={() => resetNav(i + 1)}
                          className={cn(
                            "text-xs font-black uppercase tracking-[0.2em] transition-all",
                            i === navPath.length - 1 ? "text-sky-600 scale-105" : "text-slate-400 hover:text-sky-600"
                          )}
                        >
                          {node.value}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (isManagingCatalog) {
                      addNotification("Base de données synchronisée.", "success");
                    }
                    setIsManagingCatalog(!isManagingCatalog);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-6 h-12 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-sm",
                    isManagingCatalog 
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-500/20" 
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {isManagingCatalog ? <Save className="w-5 h-5 animate-bounce" /> : <Pencil className="w-5 h-5" />}
                  {isManagingCatalog ? 'Valider' : 'Gérer'}
                </button>
                <button 
                  onClick={() => {
                    toast.info("Fonctionnalité de réinitialisation désactivée. Utilisez l'importation CSV pour mettre à jour le catalogue.");
                  }}
                  className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                  title="Réinitialiser"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button 
                   onClick={() => {
                    setIsCatalogOpen(false);
                    setNavPath([]);
                    setCatalogSearch('');
                    setIsManagingCatalog(false);
                  }} 
                  className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </header>
            
            <div className="px-10 py-6 pb-0 border-b border-slate-100 bg-slate-50/20">
               <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-sky-500/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-lg" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 relative z-10" />
                    <input 
                      type="text" 
                      placeholder="RECHERCHE AVANCÉE (REF, DESIGNATION...)" 
                      className="input-field pl-14 h-14 text-lg bg-white border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 relative z-10 rounded-2xl font-black tracking-tight shadow-sm"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                    />
                    {catalogSearch && (
                      <button 
                         onClick={() => setCatalogSearch('')}
                         className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-50 rounded-xl transition-colors z-20"
                      >
                        <X className="w-5 h-5 text-slate-300" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setEditingCatalogItem({ 
                          suggestedType: activeCatalogType,
                          functionalCategory: navPath[0]?.value || '',
                          subCategory: navPath[1]?.value || '',
                          component: navPath[2]?.value || '',
                          subComponent: navPath[3]?.value || ''
                        });
                        setIsCatalogModalOpen(true);
                      }}
                      className="flex items-center gap-3 px-8 h-14 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sky-600 transition-all shadow-xl active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-6 h-6" /> Nouveau
                    </button>

                    <label className={cn(
                      "flex items-center gap-3 px-8 h-14 rounded-2xl cursor-pointer transition-all font-black uppercase text-xs tracking-[0.2em] whitespace-nowrap border shadow-sm",
                      isImporting 
                        ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" 
                        : "bg-white text-emerald-600 border-emerald-100 hover:border-emerald-500 hover:shadow-lg"
                    )}>
                      {isImporting ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          CSV...
                        </div>
                      ) : (
                        <>
                          <FileUp className="w-6 h-6" />
                          Import CSV
                        </>
                      )}
                      <input 
                        type="file" 
                        accept=".csv, text/csv, .txt, application/vnd.ms-excel" 
                        className="hidden" 
                        onChange={handleCsvUpload}
                        disabled={isImporting}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="flex items-center gap-3 px-6 h-14 bg-sky-50 text-sky-700 border border-sky-100 hover:border-sky-300 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-sm"
                      title="Télécharger le modèle d'importation CSV conforme"
                    >
                      <Download className="w-5 h-5 text-sky-600" />
                      Modèle CSV
                    </button>
                  </div>
               </div>
               {/* Advanced industrial filters */}
               <div className="flex flex-wrap items-center gap-4 pb-5 border-t border-slate-100/60 pt-4">
                  <div className="flex flex-col gap-1.5 min-w-[140px]">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Machine IP / Modèle</span>
                     <select
                        value={selectedMachine}
                        onChange={(e) => setSelectedMachine(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                     >
                        <option value="ALL">Toutes machines</option>
                        <option value="ST2G">Scooptram ST2G</option>
                        <option value="ST2D">Scooptram ST2D</option>
                        <option value="COP1838">Perforateur COP 1838</option>
                        <option value="HC50">Perforateur HC50</option>
                     </select>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Système / Catégorie</span>
                     <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                     >
                        <option value="ALL">Toutes catégories</option>
                        <option value="Hydraulique">Hydraulique</option>
                        <option value="Pneumatique">Pneumatique</option>
                        <option value="Moteur">Moteur</option>
                        <option value="Transmission">Transmission</option>
                        <option value="Freinage">Freinage</option>
                        <option value="Électricité">Électricité</option>
                        <option value="Filtration">Filtration</option>
                        <option value="Perforation">Perforation</option>
                        <option value="Consommables">Consommables</option>
                        <option value="Graissage">Graissage</option>
                        <option value="Flexibles">Flexibles</option>
                        <option value="Sécurité machine">Sécurité machine</option>
                        <option value="Structure mécanique">Structure mécanique</option>
                     </select>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[150px]">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Niveau de Criticité</span>
                     <select
                        value={selectedCriticality}
                        onChange={(e) => setSelectedCriticality(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                     >
                        <option value="ALL">Toutes criticités</option>
                        <option value="CRITIQUE">CRITIQUE (Arrêt)</option>
                        <option value="HAUTE">HAUTE (Prioritaire)</option>
                        <option value="MOYENNE">MOYENNE (Standard)</option>
                        <option value="BASSE">BASSE (Rotation Rapide)</option>
                     </select>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[160px]">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tri des Résultats</span>
                     <select
                        value={selectedSort}
                        onChange={(e) => setSelectedSort(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                     >
                        <option value="DEFAULT">Ordre Nomenclature</option>
                        <option value="PRICE_ASC">Prix : Croissant</option>
                        <option value="PRICE_DESC">Prix : Décroissant</option>
                        <option value="DISPO_LOCAL">Dispo : Localement en Stock</option>
                        <option value="DISPO_MASTER">Dispo : Non-configuré d'abord</option>
                     </select>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                     <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit uppercase tracking-widest">Seuil de Stock (SMI)</span>
                     <select
                        value={catalogPriceFilter}
                        onChange={(e: any) => setCatalogPriceFilter(e.target.value)}
                        className="bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-black uppercase text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-550/20 cursor-pointer"
                     >
                        <option value="ALL">Tout afficher (Sans limites)</option>
                        <option value="BELOW_40K">Stockable Magasin (Sous 40k DH)</option>
                        <option value="BELOW_50K">Stockable Magasin (Sous 50k DH)</option>
                        <option value="EXPENSIVE_ONLY">Investissements seuls (≥ 40k DH)</option>
                     </select>
                  </div>

                  {isFilterActive && (
                     <button
                        onClick={() => {
                           setSelectedMachine('ALL');
                           setSelectedCategory('ALL');
                           setSelectedCriticality('ALL');
                           setSelectedSort('DEFAULT');
                           setCatalogPriceFilter('BELOW_40K');
                           setCatalogSearch('');
                        }}
                        className="self-end mb-1 px-4 py-2 text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 tracking-[0.1em] uppercase rounded-xl transition-all"
                     >
                        Effacer les filtres ({[
                           selectedMachine !== 'ALL' && 'Machine',
                           selectedCategory !== 'ALL' && 'Catégorie',
                           selectedCriticality !== 'ALL' && 'Criticité',
                           catalogPriceFilter !== 'BELOW_40K' && 'Seuil Budget'
                        ].filter(Boolean).length})
                     </button>
                  )}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 relative">
               {/* Quick-Jump Systems Bar inside drilldown views */}
               {navPath.length > 0 && categories.length > 0 && !isImporting && (
                  <div className="mb-6 bg-white p-4 rounded-3xl border border-slate-100/80 shadow-sm flex flex-col md:flex-row md:items-center gap-3 select-none flex-wrap animate-in slide-in-from-top-3 duration-300">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Changement de Système :</span>
                     <div className="flex flex-wrap items-center gap-2">
                        {categories.map(catItem => {
                          const isSelected = navPath[0]?.value === catItem;
                          const count = catalog.filter(i => {
                            const comp = (i.compatibility || '').toLowerCase();
                            const machs = (i.compatibleMachines || []).map(m => m.toLowerCase());
                            const id = (i.id || '').toLowerCase();
                            
                            const isST2G = comp.includes('st2g') || machs.some(m => m.includes('st2g')) || id.startsWith('st2g_');
                            const isST2D = comp.includes('st2d') || machs.some(m => m.includes('st2d')) || id.startsWith('st2d_');
                            const isMontabert = comp.includes('montabert') || comp.includes('t23') || machs.some(m => m.includes('montabert') || m.includes('t23')) || id.startsWith('perf_') || id.startsWith('cop_');
                            
                            if (activeCatalogFilter === 'ST2G') if (!isST2G) return false;
                            if (activeCatalogFilter === 'ST2D') if (!isST2D) return false;
                            if (activeCatalogFilter === 'MONTALBERT') if (!isMontabert) return false;
                            
                            return i.functionalCategory === catItem;
                          }).length;

                          if (count === 0) return null;

                          return (
                            <button
                              key={catItem}
                              onClick={() => {
                                setNavPath([{ level: 'CATEGORY', value: catItem }]);
                              }}
                              className={cn(
                                "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5",
                                isSelected 
                                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                                  : "bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-100 hover:bg-slate-100"
                              )}
                            >
                              <span>{catItem}</span>
                              <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded",
                                isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-500"
                              )}>{count}</span>
                            </button>
                          );
                        })}
                     </div>
                  </div>
               )}

               {isImporting && (
                 <div className="absolute inset-0 z-[100] bg-white/98 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-700">
                    <div className="w-40 h-40 relative mb-12">
                       <div className="absolute inset-0 border-[16px] border-slate-100/50 rounded-[3.5rem] shadow-inner"></div>
                       <div 
                         className="absolute inset-0 border-[16px] border-sky-600 border-t-transparent rounded-[3.5rem] animate-spin shadow-xl"
                         style={{ animationDuration: '0.8s' }}
                       ></div>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-black text-sky-600">{importProgress}%</span>
                       </div>
                    </div>
                    
                    <div className="text-center px-10 max-w-2xl bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-sky-900/10 border border-sky-50">
                       <h4 className="text-4xl font-black text-slate-950 uppercase tracking-tighter mb-6 leading-none">
                         Synchronisation Technique
                       </h4>
                       <div className="flex flex-col gap-4">
                          <p className="text-sky-600 font-bold uppercase text-[12px] tracking-[0.4em] animate-pulse">
                            {importProgress < 30 ? "Lecture du fichier..." : importProgress < 60 ? "Indexation des références..." : "Finalisation du catalogue..."}
                          </p>
                          <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.2em] bg-slate-50 py-4 px-8 rounded-3xl border border-slate-100 shadow-sm">
                            WAIT, YOUR CATALOGUE WILL APPEAR IN LESS THAN {importProgress < 50 ? "45 SECONDS" : "15 SECONDS"}
                          </p>
                       </div>
                       
                       <div className="mt-10 overflow-hidden">
                          <div className="flex justify-between mb-3 px-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimisation Cloud</span>
                             <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Hydromines Sync v2.0</span>
                          </div>
                          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner p-1">
                             <div 
                               className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(8,145,213,0.4)]"
                               style={{ width: `${importProgress}%` }}
                             />
                          </div>
                       </div>
                    </div>

                    <div className="mt-12 flex items-center gap-4 text-slate-300">
                       <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                       <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                       <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                       <span className="text-[9px] font-black uppercase tracking-[0.3em]">Processing Metadata...</span>
                    </div>
                 </div>
               )}

               {currentLevel === 'CATEGORY' && (
                  <>
                    {categories.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl mb-8 border border-slate-50">
                          <BookOpen className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight text-center">Catalogue Vide</h3>
                        <p className="text-slate-500 text-center max-w-sm mb-10 font-bold leading-relaxed text-sm">
                          Aucune donnée n'a été trouvée pour ce catalogue dans la base de données.<br/>Vous pouvez réinitialiser avec les données d'usine (Master).
                        </p>
                        
                        <button
                          onClick={() => {
                            toast.warning("Importez vos données via CSV pour initialiser le catalogue.");
                          }}
                          className="px-10 py-5 bg-sky-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl shadow-sky-500/30 active:scale-95 flex items-center gap-3"
                        >
                          <BookOpen className="w-4 h-4" />
                          Charger les données
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                         {categories.map(cat => (
                           <CategoryCard 
                             key={cat} 
                             cat={cat} 
                             count={currentCatalog.filter(i => i.functionalCategory === cat).length}
                             activeType={activeCatalogType}
                             onClick={() => pushNav('CATEGORY', cat)}
                           />
                         ))}
                      </div>
                    )}
                  </>
               )}

               {currentLevel === 'SUBCATEGORY' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {subCategories.map(sub => (
                      <div key={sub} className="group relative">
                        <button
                          onClick={() => pushNav('SUBCATEGORY', sub)}
                          className="w-full p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-sky-500 hover:shadow-2xl transition-all text-left flex items-center justify-between group overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/[0.02] transition-colors" />
                          <div className="flex items-center gap-6 relative z-10">
                            <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
                              <BookOpen className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-950 uppercase text-base tracking-tight leading-tight">{sub}</span>
                          </div>
                          <ChevronDown className="w-6 h-6 text-slate-200 -rotate-90 group-hover:text-sky-600 transition-all group-hover:translate-x-1 relative z-10" />
                        </button>
                        {isManagingCatalog && (
                          <button 
                            onClick={() => handleDeleteCatalogBranch('SUBCATEGORY', sub)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-lg border border-rose-100 z-20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isManagingCatalog && (
                      <button 
                        onClick={() => {
                          setEditingCatalogItem({ functionalCategory: navPath[0]?.value, subCategory: '', suggestedType: activeCatalogType });
                          setIsCatalogModalOpen(true);
                        }}
                        className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-sky-300 hover:bg-sky-50 transition-all flex items-center justify-center gap-4 text-slate-400 hover:text-sky-600 group"
                      >
                         <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                         <span className="text-[11px] font-black uppercase tracking-[0.25em]">Nouveau Sous-Système</span>
                      </button>
                    )}
                 </div>
               )}

               {currentLevel === 'COMPONENT' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {components.map(comp => (
                      <div key={comp} className="group relative">
                        <button
                          onClick={() => pushNav('COMPONENT', comp)}
                          className="w-full p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-sky-500 hover:shadow-2xl transition-all text-left flex items-center justify-between group overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/[0.02] transition-colors" />
                          <div className="flex items-center gap-6 relative z-10">
                            <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
                              <Layers className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-950 uppercase text-base tracking-tight leading-tight">{comp || 'SANS COMPOSANT'}</span>
                          </div>
                          <ChevronDown className="w-6 h-6 text-slate-200 -rotate-90 group-hover:text-sky-600 transition-all group-hover:translate-x-1 relative z-10" />
                        </button>
                        {isManagingCatalog && (
                          <button 
                            onClick={() => handleDeleteCatalogBranch('COMPONENT', comp)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-lg border border-rose-100 z-20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isManagingCatalog && (
                      <button 
                        onClick={() => {
                          setEditingCatalogItem({ 
                            functionalCategory: navPath[0]?.value, 
                            subCategory: navPath[1]?.value,
                            component: '',
                            suggestedType: activeCatalogType
                          });
                          setIsCatalogModalOpen(true);
                        }}
                        className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-sky-300 hover:bg-sky-50 transition-all flex items-center justify-center gap-4 text-slate-400 hover:text-sky-600 group"
                      >
                         <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                         <span className="text-[11px] font-black uppercase tracking-[0.25em]">Nouveau Composant</span>
                      </button>
                    )}
                 </div>
               )}

               {currentLevel === 'SUBCOMPONENT' && subComponents.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {subComponents.map(subComp => (
                      <div key={subComp} className="group relative">
                        <button
                          onClick={() => pushNav('SUBCOMPONENT', subComp)}
                          className="w-full p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-sky-500 hover:shadow-2xl transition-all text-left flex items-center justify-between group overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/[0.02] transition-colors" />
                          <div className="flex items-center gap-6 relative z-10">
                            <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
                              <Wrench className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-950 uppercase text-base tracking-tight leading-tight">{subComp}</span>
                          </div>
                          <ChevronDown className="w-6 h-6 text-slate-200 -rotate-90 group-hover:text-sky-600 transition-all group-hover:translate-x-1 relative z-10" />
                        </button>
                      </div>
                    ))}
                 </div>
               )}

               {(currentLevel === 'RESULTS' || finalItems.length > 0) && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                   {finalItems.length > 0 && (
                      <div className="p-10 bg-white shadow-2xl shadow-sky-900/5 rounded-[3rem] border border-sky-50 mb-10 flex items-center justify-between relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-2 h-full bg-sky-600" />
                         <div className="relative z-10">
                            <p className="text-[12px] font-black text-sky-600 uppercase tracking-[0.3em] mb-1">Sélection Technique</p>
                            <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{navPath[navPath.length - 1]?.value}</h4>
                         </div>
                         <div className="flex items-center gap-8 relative z-10">
                            <div className="text-right">
                               <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">Résultats</p>
                               <p className="text-xl font-black text-sky-600">{finalItems.length} Variantes</p>
                            </div>
                            {isManagingCatalog && (
                              <button 
                                onClick={() => {
                                  setEditingCatalogItem({
                                    functionalCategory: navPath[0]?.value,
                                    subCategory: navPath[1]?.value,
                                    component: navPath[2]?.value,
                                    suggestedType: activeCatalogType
                                  });
                                  setIsCatalogModalOpen(true);
                                }}
                                className="flex items-center gap-4 px-8 h-16 bg-sky-600 text-white rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] hover:bg-sky-700 transition-all shadow-[0_15px_30px_rgba(8,145,213,0.3)] hover:scale-105 active:scale-95"
                              >
                                <Plus className="w-6 h-6" /> Ajouter au Master
                              </button>
                            )}
                         </div>
                      </div>
                   )}

                   <div id="catalog-grid-results" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {finalItems.map(item => {
                         const localArticle = articles.find(a => a.site === site && a.ref === item.reference);
                         const isLocal = !!localArticle;
                         const localQuantity = localArticle?.quantity || 0;
                         const localPlacement = localArticle?.location || 'Non défini';

                         // Criticality badge layout
                         let criticalityBadge = null;
                         if (item.criticality === 'CRITIQUE') {
                           criticalityBadge = (
                             <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                               CRITIQUE
                             </span>
                           );
                         } else if (item.criticality === 'HAUTE') {
                           criticalityBadge = (
                             <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 uppercase tracking-widest flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-amber-600 rounded-full" />
                               HAUTE
                             </span>
                           );
                         } else if (item.criticality === 'MOYENNE') {
                           criticalityBadge = (
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-widest flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                               MOYENNE
                             </span>
                           );
                         } else {
                           criticalityBadge = (
                             <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                               ROTATION RAPIDE
                             </span>
                           );
                         }

                         return (
                           <div key={item.id} className="group relative animate-in fade-in duration-300">
                             <button
                               type="button"
                               onClick={() => !isManagingCatalog && setInspectingCatalogItem(item)}
                               className={cn(
                                 "w-full flex flex-col p-8 bg-white border border-slate-100 rounded-[2.5rem] transition-all text-left relative overflow-hidden h-full",
                                 !isManagingCatalog && "hover:border-sky-500 hover:shadow-[0_20px_40px_rgba(8,145,213,0.1)] cursor-pointer"
                               )}
                             >
                               <div className="absolute inset-x-0 top-0 h-1 bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                               <div className="flex justify-between items-start mb-4 relative z-10 w-full gap-4">
                                  <div className="flex flex-col gap-1">
                                    <p className="font-mono text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] group-hover:text-sky-500 transition-colors">#{item.reference}</p>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{item.functionalCategory} &gt; {item.subCategory}</span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0 font-black">
                                    <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 uppercase tracking-widest">
                                      {item.subComponent || 'Version Directe'}
                                    </span>
                                    {criticalityBadge}
                                  </div>
                               </div>
                               
                               <p className="font-black text-slate-950 group-hover:text-sky-900 transition-colors text-xl leading-tight mb-4 relative z-10">{item.designation}</p>
                               
                               <div className="mb-6 flex flex-wrap items-center gap-3">
                                 <span className="text-[12px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 uppercase tracking-widest">
                                   {formatCurrency(item.price || 0)} HT
                                 </span>
                                 {item.compatibility && (
                                   <span className="text-[10px] font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-wider">
                                     Comp: {item.compatibility}
                                   </span>
                                 )}
                               </div>
                               
                               <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10 w-full gap-4">
                                 <div className="flex items-center gap-3">
                                   {isLocal ? (
                                     <>
                                       <span className="relative flex h-3.5 w-3.5">
                                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                         <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                                       </span>
                                       <div className="flex flex-col">
                                         <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.1em]">Actif en stock : {localQuantity} {item.unit || 'U'}</p>
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Emplacement: {localPlacement}</p>
                                       </div>
                                     </>
                                   ) : (
                                     <>
                                       <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] shrink-0">Non présent sur site ({site})</p>
                                     </>
                                   )}
                                 </div>
                                 {!isManagingCatalog && (
                                   <div className="flex items-center gap-2 shrink-0">
                                     {isLocal ? (
                                       <div className="flex items-center gap-2 text-sky-600 text-[11px] font-black uppercase tracking-[0.2em] hover:translate-x-1.5 transition-transform bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl">
                                         Ajuster <ChevronDown className="w-4 h-4 -rotate-90 text-sky-500" />
                                       </div>
                                     ) : (
                                       <div className="flex items-center gap-1 text-indigo-600 text-[11px] font-black uppercase tracking-[0.1em] hover:scale-103 transition-transform bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-white">
                                         <Plus className="w-3.5 h-3.5" /> Créer Fiche
                                       </div>
                                     )}
                                   </div>
                                 )}
                               </div>
                             </button>
                             {isManagingCatalog && (
                               <div className="absolute top-4 right-4 flex gap-2">
                                 <button 
                                   onClick={() => {
                                     setEditingCatalogItem(item);
                                     setIsCatalogModalOpen(true);
                                   }}
                                   className="w-8 h-8 bg-white text-amber-600 rounded-lg flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-lg border border-amber-100 font-bold"
                                 >
                                   <Pencil className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteCatalogItem(item.id)}
                                   className="w-8 h-8 bg-white text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg border border-rose-100 font-bold"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             )}
                           </div>
                         );
                       })}
                    </div>
                   {finalItems.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-80 text-slate-300">
                        <Database className="w-20 h-20 mb-6 opacity-10" />
                        <p className="font-black uppercase tracking-[0.4em] text-xs">Aucune référence master répertoriée</p>
                     </div>
                   )}
                 </div>
               )}
            </div>
            
            {/* Catalog Edit Modal */}
            {isCatalogModalOpen && editingCatalogItem && (
               <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                  <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl flex flex-col max-h-[90vh]">
                    <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                       <div>
                          <h4 className="text-xl font-black text-slate-950 uppercase tracking-tighter">
                            {editingCatalogItem.id ? 'Éditer l\'élément' : 'Ajouter au Catalogue'}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuration des données techniques</p>
                       </div>
                       <button onClick={() => setIsCatalogModalOpen(false)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 transition-colors"><X className="w-6 h-6" /></button>
                    </header>
                    <div className="p-10 space-y-6 overflow-y-auto">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Famille / Type d'article (Master)</label>
                           <select 
                              className="input-field font-bold bg-white border border-slate-200"
                              value={editingCatalogItem.suggestedType || 'ENGINS'}
                              onChange={e => setEditingCatalogItem({...editingCatalogItem, suggestedType: e.target.value as any})}
                           >
                              <option value="ENGINS">Pièces Engins (ST2G/ST2D)</option>
                              <option value="PERFORATEURS">Perfo (Tiges/Taillants)</option>
                              <option value="CONSOMMABLES">Consommables Généraux</option>
                              <option value="EPI">Protection (EPI)</option>
                           </select>
                        </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Système / Catégorie</label>
                             <input 
                                className="input-field" 
                                value={editingCatalogItem.functionalCategory} 
                                onChange={e => setEditingCatalogItem({...editingCatalogItem, functionalCategory: e.target.value})}
                                placeholder="Ex: Propulsion"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bloc / Sous-Catégorie</label>
                             <input 
                                className="input-field" 
                                value={editingCatalogItem.subCategory} 
                                onChange={e => setEditingCatalogItem({...editingCatalogItem, subCategory: e.target.value})}
                                placeholder="Ex: Moteur"
                             />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Composant</label>
                             <input 
                                className="input-field" 
                                value={editingCatalogItem.component} 
                                onChange={e => setEditingCatalogItem({...editingCatalogItem, component: e.target.value})}
                                placeholder="Ex: Bloc"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sous-Composant (Variante)</label>
                             <input 
                                className="input-field" 
                                value={editingCatalogItem.subComponent} 
                                onChange={e => setEditingCatalogItem({...editingCatalogItem, subComponent: e.target.value})}
                                placeholder="Ex: Standard"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence Technique</label>
                          <input 
                            className="input-field" 
                            value={editingCatalogItem.reference} 
                            onChange={e => setEditingCatalogItem({...editingCatalogItem, reference: e.target.value})}
                            placeholder="Ex: 5580 00XX XX"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation Complète</label>
                          <input 
                            className="input-field" 
                            value={editingCatalogItem.designation} 
                            onChange={e => setEditingCatalogItem({...editingCatalogItem, designation: e.target.value})}
                            placeholder="Désignation technique précise"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix Indicatif (MAD)</label>
                          <input 
                            type="number"
                            step="0.01"
                            className="input-field font-bold" 
                            value={editingCatalogItem.price || 0} 
                            onChange={e => setEditingCatalogItem({...editingCatalogItem, price: Number(e.target.value)})}
                            placeholder="0.00"
                          />
                       </div>
                       <div className="flex gap-4 pt-6">
                          <button onClick={() => setIsCatalogModalOpen(false)} className="btn flex-1 bg-slate-100 text-slate-600 font-black h-14 rounded-2xl uppercase text-[10px] tracking-widest">Annuler</button>
                          <button onClick={handleSaveCatalogItem} className="btn flex-1 bg-sky-600 text-white font-black h-14 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-sky-600/20">Enregistrer</button>
                       </div>
                    </div>
                  </div>
               </div>
            )}
          </div>
        </div>
      )}

      {isBulkImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-3xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
            <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Génération des Fiches Articles
                </h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Scanner de conformité et génération des fiches de stock pour {site}
                </p>
              </div>
              <button 
                onClick={() => {
                  if (!isBulkImporting) setIsBulkImportModalOpen(false);
                }} 
                disabled={isBulkImporting}
                className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-rose-600 disabled:opacity-50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-700">
              {/* Introduction - Vision Responsable de maintenance */}
              <div className="p-4 bg-sky-50/50 border border-sky-100/60 rounded-2xl flex gap-3.5 items-start">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-left">Gouvernance du Référentiel Technique</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1 text-left">
                    Pour fluidifier les fiches articles sur {site}, choisissez une stratégie d'analyse. Le système détectera uniquement les pièces du catalogue technique absentes de vos fiches, vous évitant de créer des doublons.
                  </p>
                </div>
              </div>

              {/* Strategy Selector (3 buttons redesigned as tabs) */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase block text-left">
                  1. Choisir le filtre de détection du catalogue :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Strategy 1: < 25K */}
                  <button
                    type="button"
                    disabled={isBulkImporting}
                    onClick={() => {
                      setImportStrategy('UNDER_25K');
                      setExcludedRefs([]);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer",
                      importStrategy === 'UNDER_25K'
                        ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20"
                        : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/70"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={cn("p-1.5 rounded-lg text-white", importStrategy === 'UNDER_25K' ? "bg-emerald-500" : "bg-slate-400")}>
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded leading-none">
                        &lt; 25K MAD
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-black text-slate-900 leading-tight">Pièces Courantes</div>
                      <p className="text-[9px] text-slate-400 font-semibold leading-tight mt-0.5 truncate">Flexibles, joints, filtres...</p>
                    </div>
                  </button>

                  {/* Strategy 2: < 40K */}
                  <button
                    type="button"
                    disabled={isBulkImporting}
                    onClick={() => {
                      setImportStrategy('UNDER_40K');
                      setExcludedRefs([]);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer",
                      importStrategy === 'UNDER_40K'
                        ? "bg-sky-50/80 border-sky-500 ring-2 ring-sky-500/20"
                        : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/70"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={cn("p-1.5 rounded-lg text-white", importStrategy === 'UNDER_40K' ? "bg-sky-500" : "bg-slate-400")}>
                        <Database className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-black uppercase bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded leading-none">
                        &lt; 40K MAD
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-black text-slate-900 leading-tight">Gamme Standard</div>
                      <p className="text-[9px] text-slate-400 font-semibold leading-tight mt-0.5 truncate">Amortisseurs, capteurs...</p>
                    </div>
                  </button>

                  {/* Strategy 3: ALL */}
                  <button
                    type="button"
                    disabled={isBulkImporting}
                    onClick={() => {
                      setImportStrategy('ALL');
                      setExcludedRefs([]);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer",
                      importStrategy === 'ALL'
                        ? "bg-slate-900 border-slate-900 shadow-lg text-white"
                        : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={cn("p-1.5 rounded-lg text-white", importStrategy === 'ALL' ? "bg-sky-400" : "bg-slate-400")}>
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none", importStrategy === 'ALL' ? "bg-slate-800 text-slate-100" : "bg-slate-200 text-slate-700")}>
                        Illimité
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className={cn("text-xs font-black leading-tight", importStrategy === 'ALL' ? "text-white" : "text-slate-900")}>Tout le Catalogue</div>
                      <p className="text-[9px] text-slate-400 font-semibold leading-tight mt-0.5 truncate">Totalité des pièces</p>
                    </div>
                  </button>
                </div>
              </div>

              {importStrategy === 'UNDER_25K' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] flex gap-3.5 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-2 bg-emerald-500/10 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest text-left">Fiches Définitives &amp; Persistance Certifiée</h4>
                    <p className="text-[11px] text-emerald-700/90 font-bold leading-relaxed mt-1 text-left">
                      Toutes les pièces de rechange courantes de moins de 25 000 MAD importées feront l'objet d'une persistance absolue. Afin de garantir l'intégrité de votre stock, ces fiches resteront définitivement actives et ancrées en base de données sans risque de purge.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Interactive Detected Scanner Items */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-left">
                      📋 Pièces détectées par le système ({detectedNewItemsForImport.length})
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 text-left">
                      Absentes des fiches de stock actuelles pour le site {site}
                    </p>
                  </div>
                  
                  {/* Search Input Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrer les pièces..."
                      value={importPreviewSearch}
                      onChange={(e) => setImportPreviewSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full sm:w-48"
                    />
                  </div>
                </div>

                {/* Filter list */}
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-150/50 pr-1 select-none">
                  {bulkImportFilteredItems.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs font-black uppercase">
                      {detectedNewItemsForImport.length === 0 
                        ? "🎉 Toutes les pièces de cette catégorie existent déjà !" 
                        : "Aucune référence ne correspond à votre filtre de recherche"}
                    </div>
                  ) : (
                    bulkImportFilteredItems.map((item) => {
                      const isChecked = !excludedRefs.includes(item.reference);
                      return (
                        <div 
                          key={item.id}
                          className="py-2.5 flex items-center justify-between gap-4 text-left hover:bg-slate-100/60 px-2 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              disabled={isBulkImporting}
                              onClick={() => {
                                if (isChecked) {
                                  setExcludedRefs(prev => [...prev, item.reference]);
                                } else {
                                  setExcludedRefs(prev => prev.filter(r => r !== item.reference));
                                }
                              }}
                              className="text-slate-400 hover:text-sky-600 disabled:opacity-50 transition-all focus:outline-none cursor-pointer"
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                isChecked 
                                  ? "bg-sky-500 border-sky-500 text-white" 
                                  : "border-slate-300 bg-white"
                              )}>
                                {isChecked && (
                                  <svg className="w-3 h-3 stroke-current stroke-3" fill="none" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-black text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded leading-none">
                                  {item.reference}
                                </span>
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                  {item.suggestedType}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-800 truncate mt-1">
                                {item.designation}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-black text-slate-900 font-mono">
                              {formatCurrency(item.price || 0)}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase">
                              HT MAD
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Counter & Action controls */}
                {detectedNewItemsForImport.length > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-200/60 pt-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isBulkImporting}
                        onClick={() => {
                          const allRefs = detectedNewItemsForImport.map(i => i.reference);
                          setExcludedRefs(allRefs);
                        }}
                        className="hover:text-rose-600 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Tout Décocher
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        disabled={isBulkImporting}
                        onClick={() => {
                          setExcludedRefs([]);
                        }}
                        className="hover:text-sky-600 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Tout Cocher
                      </button>
                    </div>
                    <div className="font-black text-slate-600">
                      {detectedNewItemsForImport.filter(i => !excludedRefs.includes(i.reference)).length} / {detectedNewItemsForImport.length} Prêtes à être importées
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer with loading bar */}
              {isBulkImporting && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-700 tracking-wider">
                    <span className="flex items-center gap-2 text-sky-600">
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      {importProgressMessage}
                    </span>
                    <span>{importProgressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full transition-all duration-300 ease-out" 
                      style={{ width: `${importProgressPercent}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 rounded-b-[2.5rem]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Verrouillage SRE actif • Site {site}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  disabled={isBulkImporting}
                  onClick={() => setIsBulkImportModalOpen(false)} 
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                >
                  Fermer
                </button>
                {detectedNewItemsForImport.filter(i => !excludedRefs.includes(i.reference)).length > 0 && (
                  <button 
                    type="button"
                    disabled={isBulkImporting}
                    onClick={handleExecuteSolidImport}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    Lancer la Génération ({detectedNewItemsForImport.filter(i => !excludedRefs.includes(i.reference)).length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && editingArticle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <header className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">
                   {articles.some(a => a.id === editingArticle.id) ? 'Modifier Reference' : 'Nouvelle Nomenclature'}
                </h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Veuillez remplir les spécifications techniques</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-14 h-14 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:rotate-90 transition-all duration-500"
              >
                <X className="w-8 h-8" />
              </button>
            </header>
            
            <form onSubmit={handleSave} className="p-12 space-y-10 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Désignation de l'article</label>
                  <input 
                    type="text" 
                    className="input-field h-16 font-black text-2xl px-6"
                    placeholder="Ex: BARRE CONIQUE 1.8M"
                    value={editingArticle.designation}
                    onChange={(e) => setEditingArticle({...editingArticle, designation: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Référence OEM / Fabricant</label>
                  <input 
                    type="text" 
                    className="input-field h-16 font-black text-xl px-6"
                    placeholder="Ex: SMI-MOT-99"
                    value={editingArticle.ref}
                    onChange={(e) => setEditingArticle({...editingArticle, ref: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Famille d'article</label>
                  <div className="relative">
                    <select 
                      className="input-field h-16 appearance-none font-black text-lg px-6 cursor-pointer"
                      value={editingArticle.type}
                      onChange={(e) => setEditingArticle({...editingArticle, type: e.target.value as StockType})}
                    >
                      <option value="ENGINS">Pièces Engins</option>
                      <option value="PERFORATEURS">Perfo (Tiges/Taillants)</option>
                      <option value="CONSOMMABLES">Consommables Généraux</option>
                      <option value="EPI">Protection (EPI)</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Composant Principal</label>
                    <input 
                      type="text" 
                      className="input-field h-14 text-base px-6 shadow-inner"
                      placeholder="Ex: Bloc moteur, Piston..."
                      value={editingArticle.component || ''}
                      onChange={(e) => setEditingArticle({...editingArticle, component: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sous-Composant</label>
                    <input 
                      type="text" 
                      className="input-field h-14 text-base px-6 shadow-inner"
                      placeholder="Ex: Coussinet, Segment..."
                      value={editingArticle.subComponent || ''}
                      onChange={(e) => setEditingArticle({...editingArticle, subComponent: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sous-Catégorie</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Hydraulique, Moteur..."
                    className="input-field h-16 font-black text-lg px-6"
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})}
                    required
                  />
                </div>
                 <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Unité de mesure</label>
                  <input 
                    type="text" 
                    placeholder="Pcs, Kg, Kit..."
                    className="input-field h-16 font-black text-lg px-6 uppercase"
                    value={editingArticle.unit}
                    onChange={(e) => setEditingArticle({...editingArticle, unit: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Seuil d'alerte critique</label>
                  <input 
                    type="number" 
                    className="input-field h-16 font-black text-3xl px-6 text-rose-600"
                    value={editingArticle.minStock}
                    onChange={(e) => setEditingArticle({...editingArticle, minStock: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-sky-600 uppercase tracking-widest ml-1">Prix Standard HT (MAD) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="1200.00"
                    className="input-field h-16 font-black border-sky-200 bg-sky-50/50 focus:border-sky-500 text-sky-700 text-3xl px-6"
                    value={editingArticle.price === 0 ? '' : editingArticle.price}
                    onChange={(e) => setEditingArticle({...editingArticle, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                    required
                  />
                  {editingArticle.price >= 40000 && (
                    <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 mt-2 animate-in fade-in duration-300">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">Alerte Pièce d'investissement Coûteuse</p>
                        <p className="text-xs leading-normal">
                          Les pièces coûteuses de ≥ 40 000 DH ne sont pas recommandées en stock physique magasin (SMI). Privilégiez l'achat direct sur commande pour préserver le plafond global SMI de 400 000 DH.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Emplacement Magasin</label>
                  <input 
                    type="text" 
                    placeholder="Zone-Rayon-Niveau"
                    className="input-field h-16 font-black text-lg px-6 uppercase"
                    value={editingArticle.location}
                    onChange={(e) => setEditingArticle({...editingArticle, location: e.target.value})}
                    required
                  />
                </div>
                <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    className="w-8 h-8 text-sky-600 border-slate-300 rounded-xl focus:ring-sky-500"
                    checked={editingArticle.active}
                    onChange={(e) => setEditingArticle({...editingArticle, active: e.target.checked})}
                  />
                  <label htmlFor="isActive" className="text-sm font-black text-slate-700 uppercase tracking-widest select-none cursor-pointer">Statut Article Actif</label>
                </div>
              </div>

              <div className="flex justify-end gap-6 pt-10 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-10 py-5 font-black uppercase text-xs tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button type="submit" className="btn bg-slate-950 text-white shadow-2xl h-16 px-12 rounded-2xl group font-black uppercase text-xs tracking-widest flex items-center gap-4 hover:bg-sky-600">
                  <Save className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" /> Enregistrer la Fiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* DRAWER D'INSPECTION D'ARTICLE */}
      <AnimatePresence>
        {inspectingArticle && (
          <div className="fixed inset-0 z-[120] overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingArticle(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Panel Container */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-lg bg-white flex flex-col h-full shadow-[0_0_50px_rgba(15,23,42,0.15)] border-l border-slate-100"
              >
                {/* Drawer Header */}
                <header className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest w-fit mb-1">
                      #{inspectingArticle.ref}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                      {inspectingArticle.designation}
                    </h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setInspectingArticle(null)}
                    className="w-10 h-10 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:rotate-90 transition-all duration-300 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </header>

                {/* Drawer Content */}
                <div className="flex-1 p-8 overflow-y-auto space-y-8">
                  {/* Status & Quick Stats */}
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Niveau de Stock actuel</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-slate-900">{inspectingArticle.quantity}</span>
                      <span className="text-xs font-black text-slate-400 uppercase">{inspectingArticle.unit}</span>
                    </div>

                    {/* Progress bar */}
                    {(() => {
                      const maxLimit = Math.max(inspectingArticle.minStock * 2, 10);
                      const percent = Math.min((inspectingArticle.quantity / maxLimit) * 100, 100);
                      const isAlert = inspectingArticle.quantity <= inspectingArticle.minStock && inspectingArticle.quantity > 0;
                      const isRupture = inspectingArticle.quantity === 0;
                      
                      return (
                        <div className="space-y-2">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isRupture ? "bg-rose-500 w-0" :
                                isAlert ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                            <span className="text-slate-400">Seuil de réapprovisionnement :</span>
                            <span className="text-slate-800">{inspectingArticle.minStock} {inspectingArticle.unit}</span>
                          </div>

                          <div className="pt-2">
                            {isRupture ? (
                              <div className="bg-rose-50 text-rose-700 border border-rose-100 px-4 py-3 rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                                <span className="text-[11px] font-black uppercase tracking-wider">RUPTURE DE STOCK - Commande d'urgence requise</span>
                              </div>
                            ) : isAlert ? (
                              <div className="bg-amber-50 text-amber-700 border border-amber-100 px-4 py-3 rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="text-[11px] font-black uppercase tracking-wider">STOCK CRITIQUE - Niveau sous le seuil d'alerte</span>
                              </div>
                            ) : (
                              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-3 rounded-xl flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-[11px] font-black uppercase tracking-wider">STOCK CONFORMANT - Niveau optimal</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Classification BOM - Arborescence Technique */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomenclature & Système Technologique</h4>
                    <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4 relative">
                      {/* Vertical line indicator */}
                      <div className="absolute left-9 top-10 bottom-10 w-0.5 bg-slate-100" />
                      
                      {/* Level 1 */}
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] border border-indigo-100 shrink-0 mt-0.5 shadow-sm">
                          1
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Système Fonctionnel</p>
                          <p className="text-sm font-black text-slate-800">{inspectingArticle.functionalCategory || 'Non spécifié'}</p>
                        </div>
                      </div>

                      {/* Level 2 */}
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black text-[10px] border border-sky-100 shrink-0 mt-0.5 shadow-sm">
                          2
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Groupe Assemblage</p>
                          <p className="text-sm font-black text-slate-800">{inspectingArticle.subCategory || 'Non spécifié'}</p>
                        </div>
                      </div>

                      {/* Level 3 */}
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-[10px] border border-amber-100 shrink-0 mt-0.5 shadow-sm">
                          3
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Composant</p>
                          <p className="text-sm font-black text-slate-800">{inspectingArticle.component || 'Non spécifié'}</p>
                        </div>
                      </div>

                      {/* Level 4 */}
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[10px] border border-emerald-100 shrink-0 mt-0.5 shadow-sm">
                          4
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Spécification Technique</p>
                          <p className="text-sm font-black text-slate-800">{inspectingArticle.subComponent || 'Fiche standard'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fiche Financière & Logistique */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prix d'acquisition</span>
                      <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(inspectingArticle.price || 0)}</p>
                    </div>
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valeur Globale Stock</span>
                      <p className="text-lg font-extrabold text-slate-900">{formatCurrency((inspectingArticle.price || 0) * inspectingArticle.quantity)}</p>
                    </div>
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col gap-1 col-span-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localisation Magasin</span>
                      <p className="text-sm font-black text-slate-700 font-mono tracking-tight">{inspectingArticle.location || 'Non spécifiée'}</p>
                    </div>
                  </div>

                  {/* Extra specifications */}
                  <div className="space-y-4 pt-2">
                    {/* Machine Compatibility */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compatibilités Matériels</span>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-xs font-black text-slate-700">
                          {inspectingArticle.compatibility || 'Consignes universelles / Convient à toutes les marques répertoriées.'}
                        </p>
                      </div>
                    </div>

                    {/* Technical Notes */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes Techniques SRE</span>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl italic text-slate-500 text-xs">
                        "{inspectingArticle.notes || 'Aucun mémo technique renseigné pour cette référence.'}"
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <footer className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      const itemToEdit = { ...inspectingArticle };
                      setInspectingArticle(null);
                      handleEdit(itemToEdit);
                    }}
                    className="flex-1 py-4 bg-slate-950 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-sky-600 transition-colors flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Modifier la Fiche
                  </button>
                  <button 
                    type="button"
                    onClick={() => setInspectingArticle(null)}
                    className="px-6 py-4 border border-slate-200 text-slate-600 hover:text-slate-800 font-black uppercase text-xs tracking-wider rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </footer>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <NotificationCenter notifications={notifications} />
    </div>
  );
}

// --- Helper Components for Catalog ---

function CategoryCard({ cat, count, activeType, onClick }: { cat: string, count: number, activeType: string, onClick: () => void, key?: any }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-12 bg-white border border-slate-100 rounded-[3.5rem] transition-all flex flex-col gap-8 overflow-hidden relative group shadow-sm",
        activeType === 'ENGINS' 
          ? "hover:border-sky-500 hover:shadow-[0_45px_90px_rgba(8,145,213,0.2)]" 
          : "hover:border-red-500 hover:shadow-[0_45px_90px_rgba(220,38,38,0.15)]"
      )}
    >
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-sky-500/5 blur-[100px] group-hover:bg-sky-500/15 transition-all duration-700 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-red-600/5 blur-[100px] group-hover:bg-red-600/10 transition-all duration-700 pointer-events-none" />
      <div className="flex justify-between items-start relative z-10">
        <div className={cn(
          "w-20 h-20 bg-slate-50 text-slate-400 group-hover:text-white rounded-[2.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm",
          activeType === 'ENGINS' ? "group-hover:bg-sky-600 group-hover:shadow-sky-300" : "group-hover:bg-red-600 group-hover:shadow-red-300"
        )}>
          <Layers className="w-10 h-10" />
        </div>
        <span className={cn(
          "text-sm font-black px-6 py-3 rounded-full border shadow-sm uppercase tracking-widest",
          activeType === 'ENGINS' ? "text-sky-600 bg-sky-50 border-sky-100" : "text-red-600 bg-red-50 border-red-100"
        )}>
          {count} Références
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.25em] group-hover:text-sky-500 transition-colors mb-3">Structure Master</p>
        <h4 className="font-black text-slate-900 text-3xl group-hover:text-slate-950 transition-colors tracking-tighter leading-tight">{cat}</h4>
      </div>
      <div className={cn(
        "flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-6 group-hover:translate-x-0 relative z-10",
        activeType === 'ENGINS' ? "text-sky-600" : "text-red-600"
      )}>
         <span className="text-xs font-black uppercase tracking-[0.2em]">Parcourir</span>
         <ChevronDown className="w-6 h-6 -rotate-90" />
      </div>
    </button>
  );
}

function CatalogCard({ item, isManaging, onImport, onEdit, onDelete }: { 
  item: CatalogItem, 
  isManaging: boolean, 
  onImport: (item: CatalogItem) => void, 
  onEdit: (item: CatalogItem) => void,
  onDelete: (id: string) => void
}) {
  return (
    <div className={cn(
      "group relative w-full flex flex-col p-10 bg-white border border-slate-100 rounded-[3rem] transition-all text-left overflow-hidden",
      !isManaging ? "hover:border-sky-500 hover:shadow-2xl cursor-pointer" : ""
    )}
    onClick={() => !isManaging && onImport(item)}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start mb-6 relative z-10">
         <p className="font-mono text-sm font-black text-slate-400 uppercase tracking-[0.25em] group-hover:text-sky-500 transition-colors">#{item.reference}</p>
         <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-4 py-1.5 rounded-xl border border-sky-100 uppercase tracking-widest truncate max-w-[180px]">
           {item.subComponent || item.component || 'Standard'}
         </span>
      </div>
      <p className="font-black text-slate-950 group-hover:text-sky-900 transition-colors text-2xl leading-tight mb-10 relative z-10">{item.designation}</p>
      
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest">
          {formatCurrency(item.price || 0)}
        </span>
      </div>

      <div className="flex flex-col gap-3 mb-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
         <div className="flex items-center gap-3">
           <Database className="w-4 h-4" /> {item.functionalCategory}
         </div>
         <div className="flex items-center gap-3">
           <BookOpen className="w-4 h-4" /> {item.subCategory}
         </div>
      </div>

      <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between relative z-10">
         <div className="flex items-center gap-4">
           <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Master Reference</p>
         </div>
         {!isManaging && (
           <div className="flex items-center gap-2 text-sky-600 text-xs font-black uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">
             Importer <Plus className="w-4 h-4" />
           </div>
         )}
      </div>

      {isManaging && (
        <div className="absolute top-8 right-8 flex gap-3">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-xl border border-emerald-100"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-xl border border-rose-100"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------

