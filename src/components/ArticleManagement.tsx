import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Pencil, Trash2, X, Save, AlertCircle, ChevronDown, Wrench, Database, BookOpen, Layers, Upload, FileUp } from 'lucide-react';
import { Article, StockType, SiteCode, CatalogItem } from '../types';
import { cn, generateId, formatCurrency } from '../lib/utils';
import { MASTER_CATALOG } from '../catalogData';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { matchArticleSearch } from '../lib/searchUtils';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeCatalogType, setActiveCatalogType] = useState<StockType>('ENGINS');
  const [activeCatalogFilter, setActiveCatalogFilter] = useState<'ST2G' | 'ST2D' | 'MONTALBERT'>('ST2G');
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Dynamic Catalog State
  const [isManagingCatalog, setIsManagingCatalog] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<Partial<CatalogItem> | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Advanced Catalog Filters & Sorting
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');
  const [selectedSort, setSelectedSort] = useState<string>('DEFAULT');

  const filteredArticles = articles.filter(a => 
    a.site === site && matchArticleSearch(a, searchTerm)
  );

  const currentCatalog = React.useMemo(() => {
    return catalog.filter(item => {
      const comp = (item.compatibility || '').toLowerCase();
      const machs = (item.compatibleMachines || []).map(m => m.toLowerCase());
      const id = (item.id || '').toLowerCase();
      
      const isST2G = comp.includes('st2g') || machs.some(m => m.includes('st2g')) || id.startsWith('st2g_');
      const isST2D = comp.includes('st2d') || machs.some(m => m.includes('st2d')) || id.startsWith('st2d_');
      const isMontabert = comp.includes('montabert') || comp.includes('t23') || machs.some(m => m.includes('montabert') || m.includes('t23')) || id.startsWith('perf_');
      
      if (activeCatalogFilter === 'ST2G') return isST2G;
      if (activeCatalogFilter === 'ST2D') return isST2D;
      if (activeCatalogFilter === 'MONTALBERT') return isMontabert;
      
      return item.suggestedType === activeCatalogType;
    });
  }, [catalog, activeCatalogFilter, activeCatalogType]);

  const changeCatalogFilter = (filter: 'ST2G' | 'ST2D' | 'MONTALBERT') => {
    setActiveCatalogFilter(filter);
    setActiveCatalogType(filter === 'MONTALBERT' ? 'PERFORATEURS' : 'ENGINS');
    setNavPath([]);
    setCatalogSearch('');
  };

  // Drill-down state
  const [navPath, setNavPath] = useState<{level: string, value: string}[]>([]);
  const [currentLevel, setCurrentLevel] = useState<'CATEGORY' | 'SUBCATEGORY' | 'COMPONENT' | 'SUBCOMPONENT' | 'RESULTS'>('CATEGORY');

  const isFilterActive = selectedMachine !== 'ALL' || selectedCategory !== 'ALL' || selectedCriticality !== 'ALL';

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
    const unique = new Set<string>();
    currentCatalog.forEach(item => unique.add(item.functionalCategory));
    return Array.from(unique);
  }, [currentCatalog]);
  
  const subCategories: string[] = React.useMemo(() => {
    if (navPath.length < 1) return [];
    const unique = new Set<string>();
    currentCatalog
      .filter(item => item.functionalCategory === navPath[0].value)
      .forEach(item => { if (item.subCategory) unique.add(item.subCategory); });
    return Array.from(unique);
  }, [currentCatalog, navPath]);

  const components: string[] = React.useMemo(() => {
    if (navPath.length < 2) return [];
    const unique = new Set<string>();
    currentCatalog
      .filter(item => item.functionalCategory === navPath[0].value && item.subCategory === navPath[1].value)
      .forEach(item => { if (item.component) unique.add(item.component); });
    return Array.from(unique);
  }, [currentCatalog, navPath]);

  const subComponents: string[] = React.useMemo(() => {
    if (navPath.length < 3) return [];
    const unique = new Set<string>();
    currentCatalog
      .filter(item => item.functionalCategory === navPath[0].value && item.subCategory === navPath[1].value && item.component === navPath[2].value)
      .forEach(item => { if (item.subComponent) unique.add(item.subComponent); });
    return Array.from(unique);
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
  }, [currentCatalog, catalogSearch, navPath, selectedMachine, selectedCategory, selectedCriticality, selectedSort, articles, site, isFilterActive]);

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
              changeCatalogFilter('ST2G');
              setIsCatalogOpen(true);
            }} 
            className="btn bg-white text-emerald-700 border border-emerald-100 hover:border-emerald-600 shadow-sm h-9 px-3 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Database className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform relative z-10" /> 
            <span className="relative z-10">Catalogue ST2G</span>
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
            <span className="relative z-10">Catalogue ST2D</span>
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
            <span className="relative z-10">Catalogue Montabert T23</span>
          </button>
          
          <span className="w-1 px-1" />

          <button onClick={handleCreate} className="btn bg-slate-950 text-white hover:bg-sky-600 shadow-sm h-9 px-4 rounded-lg transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" /> Ajouter
          </button>
        </div>
      </header>

      <div className="card glass p-4 shadow-xl ring-1 ring-slate-900/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            placeholder="Rechercher une nomenclature (REF, OEM, Designation)..." 
            className="input-field pl-11 h-10 text-sm bg-white/40 border-slate-200/50 rounded-xl font-black tracking-tight"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container glass border-0 shadow-xl ring-1 ring-slate-900/5 overflow-hidden rounded-xl">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Référence & Désignation</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Classification</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Prix Unit.</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Seuil Alerte</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Localisation</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
              <th className="px-6 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {filteredArticles.map(article => (
              <tr key={article.id} className="group hover:bg-white/60 transition-all duration-300">
                <td className="px-6 py-4">
                  <p className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">#{article.ref}</p>
                  <p className="font-black text-slate-900 text-sm leading-tight">{article.designation}</p>
                  {article.component && (
                    <div className="flex items-center gap-2 mt-1.5">
                       <Layers className="w-3 h-3 text-sky-400" />
                       <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">
                         {article.functionalCategory} / {article.component}
                       </p>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 uppercase tracking-widest">
                      {article.type}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{article.category}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="text-sm font-black text-emerald-600">{formatCurrency(article.price)}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="text-sm font-black text-slate-950">{article.minStock} <span className="text-[10px] text-slate-400 uppercase">{article.unit}</span></p>
                </td>
                <td className="px-6 py-4 text-left">
                  <span className="font-black text-slate-600 text-sm">{article.location}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                    article.active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {article.active ? 'Opérationnel' : 'Archivé'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(article)} className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(article.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
                  "bg-rose-50 text-rose-600 shadow-rose-100"
                )}>
                  {activeCatalogFilter === 'MONTALBERT' ? <Layers className="w-6 h-6" /> : <Database className="w-6 h-6" />}
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
                        MONTALBERT T23
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

                  {isFilterActive && (
                     <button
                        onClick={() => {
                           setSelectedMachine('ALL');
                           setSelectedCategory('ALL');
                           setSelectedCriticality('ALL');
                           setSelectedSort('DEFAULT');
                           setCatalogSearch('');
                        }}
                        className="self-end mb-1 px-4 py-2 text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 tracking-[0.1em] uppercase rounded-xl transition-all"
                     >
                        Effacer les filtres ({[
                           selectedMachine !== 'ALL' && 'Machine',
                           selectedCategory !== 'ALL' && 'Catégorie',
                           selectedCriticality !== 'ALL' && 'Criticité'
                        ].filter(Boolean).length})
                     </button>
                  )}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 relative">
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
                               onClick={() => !isManagingCatalog && handleImportFromCatalog(item)}
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
                               
                               <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10 w-full">
                                 <div className="flex items-center gap-3">
                                   {isLocal ? (
                                     <>
                                       <span className="relative flex h-3.5 w-3.5">
                                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                         <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                                       </span>
                                       <div className="flex flex-col">
                                         <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.1em]">En stock local : {localQuantity} unités</p>
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Empl.: {localPlacement}</p>
                                       </div>
                                     </>
                                   ) : (
                                     <>
                                       <div className="w-3 h-3 bg-slate-200 rounded-full shadow-inner" />
                                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Réf. catalogue (Non en stock)</p>
                                     </>
                                   )}
                                 </div>
                                 {!isManagingCatalog && (
                                   <div className="flex items-center gap-2 text-sky-600 text-[11px] font-black uppercase tracking-[0.2em] hover:translate-x-2 transition-transform">
                                     {isLocal ? 'Ajuster Fiche' : 'Importer'} <ChevronDown className="w-4 h-4 -rotate-90" />
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

      {isModalOpen && editingArticle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
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
            
            <form onSubmit={handleSave} className="p-12 space-y-10 overflow-y-auto">
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

