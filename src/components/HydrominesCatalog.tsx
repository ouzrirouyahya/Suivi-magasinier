import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, ShieldAlert, CheckCircle2, XCircle, Database, 
  Wrench, Layers, Tag, HelpCircle, Save, X, Calendar, AlertCircle, Edit3,
  Activity, BarChart3, AlertTriangle, Clock, DollarSign, Layers3,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { HydrominesCatalogItem, CatalogItem, Article, SiteCode, EquipmentFamily, CatalogSelectorConfig } from '../types';
import { MASTER_CATALOG } from '../catalogData';
import { generateId, formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import { useCatalogFilter, getCatalogByFamily } from '../hooks/useCatalog';
import { SITE_CODES } from '../lib/constants';

const CATALOG_OPTIONS: (CatalogSelectorConfig & { desc: string })[] = [
  { id: 'ST2G', label: 'Epiroc ST2G (4 T.)', description: 'Cummins QSB4.5', desc: 'Cummins QSB4.5', color: 'from-amber-50 to-amber-100/50 hover:bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'ST2D', label: 'Epiroc ST2D (3.6 T.)', description: 'Deutz F6L-912W', desc: 'Deutz F6L-912W', color: 'from-orange-50 to-orange-100/50 hover:bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'ST7', label: 'Epiroc ST7 (6.8 T.)', description: 'Cummins QSB6.7', desc: 'Cummins QSB6.7', color: 'from-emerald-50 to-emerald-100/50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'T23', label: 'Montabert T23', description: 'Marteau 23kg', desc: 'Marteau 23kg', color: 'from-purple-50 to-purple-100/50 hover:bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'T28', label: 'Montabert T28', description: 'Marteau 28kg', desc: 'Marteau 28kg', color: 'from-fuchsia-50 to-fuchsia-100/50 hover:bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  { id: 'CONSOMMABLES', label: 'Consommables de Forage', description: 'Barres, taillants, accessoires', desc: 'Barres, taillants, accessoires', color: 'from-slate-50 to-slate-100/50 hover:bg-slate-100 text-slate-800 border-slate-200' },
];

const CATALOG_COUNTS: Record<string, number> = {
  ST2G: 284,
  ST2D: 284,
  ST7: 315,
  T23: 155,
  T28: 155,
  CONSOMMABLES: 6
};

const CATEGORY_ORDER: Record<string, string[]> = {
  'ST2G': [
    'Moteur Diesel & Filtration',
    'Système Hydraulique & Vérins',
    'Transmission & Convertisseur',
    'Ponts, Essieux & Roues',
    'Freinage & Sécurité',
    'Électricité & Canopy',
    'Châssis, Structure & Liaison',
  ],
  'ST2D': [
    'Moteur Diesel & Filtration',
    'Système Hydraulique & Vérins',
    'Transmission & Convertisseur',
    'Ponts, Essieux & Roues',
    'Freinage & Sécurité',
    'Électricité & Canopy',
    'Châssis, Structure & Liaison',
  ],
  'ST7': [
    'Moteur Diesel & Filtration',
    'Système Hydraulique & Vérins',
    'Transmission & Convertisseur',
    'Ponts, Essieux & Roues',
    'Freinage & Sécurité',
    'Électricité & Poste Opérateur',
    'Châssis, Structure & Liaison',
  ],
  'T23': [
    'Tête Arrière T23',
    'Distribution T23',
    'Cylindre T23',
    'Piston & Frappe T23',
    'Écrou Rochet & Buse T23',
    'Outils & Accessoires T23',
    'Poussoir (Jack Leg) & Fixation T23',
    'Consommables & Pièces d\'Usure T23',
  ],
  'T28': [
    'Tête Arrière T28',
    'Distribution T28',
    'Cylindre T28',
    'Piston & Frappe T28',
    'Écrou Rochet & Buse T28',
    'Outils & Accessoires T28',
    'Poussoir (Jack Leg) & Fixation T28',
    'Consommables & Pièces d\'Usure T28',
  ],
  'CONSOMMABLES': [
    'Barres de Forage',
    'Taillants & Boutons',
    'Mèches & Tiges',
    'Adaptateurs & Raccords',
    'Accessoires de Forage',
  ],
};

export function HydrominesCatalog() {
  const { 
    hydrominesCatalog = [], 
    saveHydrominesCatalogItem,
    importFromHydrominesCatalog,
    currentUser,
    articles = [],
    mouvements = [],
    currentSite
  } = useInventory();

  // Tab switcher state for cockpit/pilotage dashboard vs registry list
  const [activeTab, setActiveTab2] = useState<'dashboard' | 'registry'>('dashboard');

  // Multi-selection and import to Stock states
  const [selectedItems, setSelectedItems] = useState<HydrominesCatalogItem[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetSite, setImportTargetSite] = useState<SiteCode>(SITE_CODES[0]);
  const [isImporting, setIsImporting] = useState(false);

  // Reset selected items on tab or filters change
  const handleTabChange = (tab: 'dashboard' | 'registry') => {
    setActiveTab2(tab);
    setSelectedItems([]);
  };

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFamily, setActiveFamily] = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [activeCritical, setActiveCritical] = useState<string>('ALL');

  // State for collapsible quality panels on cockpit tab (collapsed by default)
  const [expandedAlerts, setExpandedAlerts] = useState({
    sansPrix: false,
    sansCat: false,
    sansUnite: false,
    duplicates: false,
  });

  // Modal State for custom creation / edition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<HydrominesCatalogItem> | null>(null);

  // States for the new technical catalog addition flow
  const [creationTab, setCreationTab] = useState<'catalog' | 'manual'>('catalog');
  const {
    selectedFamily,
    setSelectedFamily,
    searchQuery: techSearchTerm,
    setSearchQuery: setTechSearchTerm,
    filteredItems: techFilteredItemsHook
  } = useCatalogFilter();
  const [selectedTechCategory, setSelectedTechCategory] = useState<string>('ALL');
  const [techVisibleLimit, setTechVisibleLimit] = useState(30);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);

  // Form states for adding from technical catalog
  const [techItemUnit, setTechItemUnit] = useState('Pcs');
  const [techItemIsCritical, setTechItemIsCritical] = useState(false);

  const isAdminOrMagasinier = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MAGASINIER';

  // 1. Map physical article IDs to references for O(1) lookups in movements
  const articleIdToRefMap = useMemo(() => {
    const m = new Map<string, string>();
    articles.forEach(a => {
      if (a.id && a.ref) {
        m.set(a.id, a.ref.trim().toUpperCase());
      }
    });
    return m;
  }, [articles]);

  // 2. Physical articles grouped by reference for quality checks (like price)
  const physicalArticlesByRef = useMemo(() => {
    const m = new Map<string, Article[]>();
    articles.forEach(a => {
      const r = a.ref?.trim().toUpperCase();
      if (r) {
        const list = m.get(r) || [];
        list.push(a);
        m.set(r, list);
      }
    });
    return m;
  }, [articles]);

  // 3. Compute usage statistics from validated movements
  const usageStatsByRef = useMemo(() => {
    const usage = new Map<string, { count: number; lastDate: string }>();
    mouvements.forEach(mov => {
      // Parse movement date safely
      let dateStr = '';
      if (mov.date) {
        if (typeof mov.date === 'string') {
          dateStr = mov.date;
        } else if (typeof mov.date.toDate === 'function') {
          try {
            dateStr = mov.date.toDate().toISOString();
          } catch (e) {
            dateStr = '';
          }
        } else if (typeof (mov.date as any).seconds === 'number') {
          dateStr = new Date((mov.date as any).seconds * 1000).toISOString();
        }
      }

      if (mov.items && Array.isArray(mov.items)) {
        mov.items.forEach(it => {
          const ref = articleIdToRefMap.get(it.articleId);
          if (ref) {
            const ex = usage.get(ref) || { count: 0, lastDate: '' };
            ex.count += (it.quantity || 0);
            if (dateStr && (!ex.lastDate || dateStr > ex.lastDate)) {
              ex.lastDate = dateStr;
            }
            usage.set(ref, ex);
          }
        });
      }
    });
    return usage;
  }, [mouvements, articleIdToRefMap]);

  // Helper date function
  const getDaysSince = (dateString?: string) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const now = new Date("2026-06-18T11:54:28-07:00"); // Standardized current simulated workspace date to guarantee deterministic state
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 4. Enhanced stats and analytical metrics calculated via useMemo
  const enhancedStats = useMemo(() => {
    const total = hydrominesCatalog.length;
    const active = hydrominesCatalog.filter(x => x.status === 'ACTIF').length;
    const inactive = hydrominesCatalog.filter(x => x.status === 'INACTIF').length;
    const critical = hydrominesCatalog.filter(x => x.isHydrominesCritical).length;

    // Family counts for the requested KPIs
    const st2g = hydrominesCatalog.filter(x => x.equipmentFamily === 'ST2G').length;
    const st2d = hydrominesCatalog.filter(x => x.equipmentFamily === 'ST2D').length;
    const st7 = hydrominesCatalog.filter(x => x.equipmentFamily === 'ST7').length;
    const t23 = hydrominesCatalog.filter(x => x.equipmentFamily === 'T23').length;
    const t28 = hydrominesCatalog.filter(x => x.equipmentFamily === 'T28').length;
    const consommables = hydrominesCatalog.filter(x => x.equipmentFamily === 'CONSOMMABLES').length;

    // Quality alerts lists
    const sansPrix: HydrominesCatalogItem[] = [];
    const sansCat: HydrominesCatalogItem[] = [];
    const sansUnite: HydrominesCatalogItem[] = [];

    hydrominesCatalog.forEach(item => {
      const refUpper = item.reference.trim().toUpperCase();

      // Sans prix rule: check if any standard catalog item or physical article has a valid price
      const directPrice = (item as any).price;
      const physicals = physicalArticlesByRef.get(refUpper) || [];
      const hasPhysicalPrice = physicals.some(pa => pa.price && pa.price > 0);
      const masterItem = MASTER_CATALOG.find(mc => mc.reference?.trim().toUpperCase() === refUpper);
      const hasMasterPrice = masterItem && masterItem.price && masterItem.price > 0;

      if (!directPrice && !hasPhysicalPrice && !hasMasterPrice) {
        sansPrix.push(item);
      }

      // Sans catégorie rule
      if (!item.functionalCategory || item.functionalCategory === 'Général' || item.functionalCategory === 'AUTRE' || item.functionalCategory.trim() === '') {
        sansCat.push(item);
      }

      // Sans unité rule
      if (!item.unit || item.unit.trim() === '' || item.unit === '---') {
        sansUnite.push(item);
      }
    });

    // Duplicates list
    const refGroups = new Map<string, HydrominesCatalogItem[]>();
    hydrominesCatalog.forEach(item => {
      const cleanRef = item.reference.replace(/[\s\-_]/g, '').trim().toUpperCase();
      if (cleanRef) {
        const group = refGroups.get(cleanRef) || [];
        group.push(item);
        refGroups.set(cleanRef, group);
      }
    });

    const duplicates: { cleanRef: string; items: HydrominesCatalogItem[] }[] = [];
    refGroups.forEach((group, cleanRef) => {
      if (group.length > 1) {
        duplicates.push({ cleanRef, items: group });
      }
    });

    // Usage-based classifications (Top Used vs Dormant vs Never Used)
    const topUsed: { item: HydrominesCatalogItem; count: number; lastDate: string }[] = [];
    const neverUsed: HydrominesCatalogItem[] = [];
    const dormant: { item: HydrominesCatalogItem; lastActivity: string; daysCount: number }[] = [];

    hydrominesCatalog.forEach(item => {
      const refUpper = item.reference.trim().toUpperCase();
      const usage = usageStatsByRef.get(refUpper);

      if (usage && usage.count > 0) {
        topUsed.push({ item, count: usage.count, lastDate: usage.lastDate });
        
        // Dormancy check (used but last activity > 180 days)
        const days = getDaysSince(usage.lastDate);
        if (days !== null && days > 180) {
          dormant.push({ item, lastActivity: usage.lastDate, daysCount: days });
        }
      } else {
        neverUsed.push(item);

        // Dormancy check for never used (created > 180 days ago and never touched)
        const days = getDaysSince(item.createdAt || item.updatedAt);
        if (days !== null && days > 180) {
          dormant.push({ item, lastActivity: item.createdAt || item.updatedAt, daysCount: days });
        }
      }
    });

    // Sort top used by total count descending
    topUsed.sort((a, b) => b.count - a.count);

    // Sort dormant items by days limit descending
    dormant.sort((a, b) => b.daysCount - a.daysCount);

    // Sort recently added (createdAt desc)
    const recentlyAdded = [...hydrominesCatalog].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return {
      total,
      active,
      inactive,
      critical,
      st2g,
      st2d,
      st7,
      t23,
      t28,
      consommables,
      sansPrix,
      sansCat,
      sansUnite,
      duplicates,
      topUsed,
      neverUsed,
      dormant,
      recentlyAdded: recentlyAdded.slice(0, 5)
    };
  }, [hydrominesCatalog, usageStatsByRef, physicalArticlesByRef]);

  // Handle toggles
  const handleToggleStatus = async (item: HydrominesCatalogItem) => {
    if (!isAdminOrMagasinier) {
      toast.error("Permissions insuffisantes pour modifier le catalogue.");
      return;
    }
    const nextStatus = item.status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    const updated: HydrominesCatalogItem = {
      ...item,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    try {
      await saveHydrominesCatalogItem(updated);
      toast.success(`Statut de ${item.reference} mis à jour : ${nextStatus}`);
    } catch (e: any) {
      toast.error(`Erreur: ${e.message || e}`);
    }
  };

  const handleToggleCritical = async (item: HydrominesCatalogItem) => {
    if (!isAdminOrMagasinier) {
      toast.error("Permissions insuffisantes.");
      return;
    }
    const nextCrit = !item.isHydrominesCritical;
    const updated: HydrominesCatalogItem = {
      ...item,
      isHydrominesCritical: nextCrit,
      updatedAt: new Date().toISOString()
    };
    try {
      await saveHydrominesCatalogItem(updated);
      toast.success(nextCrit ? `Marqué comme CRITIQUE: ${item.reference}` : `Retiré du statut CRITIQUE: ${item.reference}`);
    } catch (e: any) {
      toast.error(`Erreur: ${e.message || e}`);
    }
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingItem({
      reference: '',
      designation: '',
      suggestedType: 'CONSOMMABLES',
      functionalCategory: 'Général',
      unit: 'Pcs',
      equipmentFamily: 'CONSOMMABLES',
      status: 'ACTIF',
      isHydrominesCritical: false
    });
    setCreationTab('catalog');
    setSelectedFamily(null);
    setSelectedTechCategory('ALL');
    setTechSearchTerm('');
    setTechVisibleLimit(30);
    setSelectedCatalogItem(null);
    setTechItemUnit('Pcs');
    setTechItemIsCritical(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: HydrominesCatalogItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Check unique references
  const isAlreadyInHM = (ref: string) => {
    if (!ref) return false;
    const cleanRef = ref.trim().toLowerCase();
    return hydrominesCatalog.some(hm => hm.reference?.trim().toLowerCase() === cleanRef);
  };

  // Save new manually created or updated item
  const handleSaveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.reference || !editingItem.designation) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const refClean = editingItem.reference.trim().toLowerCase();

    // Check duplicate references if creating a brand new item
    if (!editingItem.id) {
      const alreadyExists = isAlreadyInHM(editingItem.reference);
      if (alreadyExists) {
        toast.error(`La référence "${editingItem.reference}" existe déjà dans le Catalogue Hydromines !`);
        return;
      }
    }

    const isEdit = !!editingItem.id;
    const itemId = editingItem.id || 'hm_' + generateId();
    const finalItem: HydrominesCatalogItem = {
      id: itemId,
      reference: editingItem.reference.toUpperCase().trim(),
      designation: editingItem.designation.trim(),
      suggestedType: editingItem.suggestedType || 'CONSOMMABLES',
      functionalCategory: editingItem.functionalCategory || 'Général',
      unit: editingItem.unit || 'Pcs',
      sourceCatalog: editingItem.sourceCatalog || 'Saisie Manuelle',
      equipmentFamily: editingItem.equipmentFamily || 'CONSOMMABLES',
      status: editingItem.status || 'ACTIF',
      isHydrominesCritical: !!editingItem.isHydrominesCritical,
      createdAt: editingItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveHydrominesCatalogItem(finalItem);
      toast.success(isEdit ? "Pièce mise à jour avec succès !" : "Pièce ajoutée au catalogue !");
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e: any) {
      toast.error(`Erreur d'enregistrement : ${e.message || e}`);
    }
  };

  // Filter items in the main registry list
  const filteredItems = useMemo(() => {
    return hydrominesCatalog.filter(item => {
      // 1. Search term - ultra-tolerant & multi-field (Exigence 1)
      const s = searchTerm.trim();
      let matchesSearch = true;
      if (s) {
        // String normalizer function
        const normalize = (val: string) => {
          if (!val) return '';
          return val.toLowerCase().replace(/[\s\-_/]/g, '');
        };

        const searchWords = s.split(/\s+/).filter(Boolean);
        const itemFieldsCombined = [
          normalize(item.reference),
          normalize(item.designation),
          normalize(item.functionalCategory),
          normalize(item.equipmentFamily),
          normalize(item.sourceCatalog)
        ].join('|'); // Join with barrier to isolate fields correctly

        // Every typed term must be present in the item fields
        matchesSearch = searchWords.every(word => {
          const normWord = normalize(word);
          return itemFieldsCombined.includes(normWord);
        });
      }

      // 2. Family
      const matchesFamily = activeFamily === 'ALL' || item.equipmentFamily === activeFamily;

      // 3. Status
      const matchesStatus = activeStatus === 'ALL' || item.status === activeStatus;

      // 4. Criticality
      const matchesCritical = activeCritical === 'ALL' || 
        (activeCritical === 'CRITICAL' && item.isHydrominesCritical) ||
        (activeCritical === 'NORMAL' && !item.isHydrominesCritical);

      return matchesSearch && matchesFamily && matchesStatus && matchesCritical;
    });
  }, [hydrominesCatalog, searchTerm, activeFamily, activeStatus, activeCritical]);

  // Multi-selection selection handlers
  const isAllSelected = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every(fItem => selectedItems.some(sItem => sItem.id === fItem.id));
  }, [filteredItems, selectedItems]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Unselect only those that are currently visible/filtered
      setSelectedItems(prev => prev.filter(sItem => !filteredItems.some(fItem => fItem.id === sItem.id)));
    } else {
      // Select all visible/filtered items without losing previously selected ones
      setSelectedItems(prev => {
        const unique = new Map<string, HydrominesCatalogItem>(prev.map(item => [item.id, item]));
        filteredItems.forEach(item => unique.set(item.id, item));
        return Array.from(unique.values());
      });
    }
  };

  const handleToggleSelect = (item: HydrominesCatalogItem) => {
    setSelectedItems(prev => {
      const exists = prev.some(x => x.id === item.id);
      if (exists) {
        return prev.filter(x => x.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleOpenImportModal = () => {
    setImportTargetSite(currentSite && currentSite !== 'ALL' ? currentSite : 'SMI');
    setIsImportModalOpen(true);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error("Aucun article sélectionné pour l'import d'inventaire.");
      return;
    }
    setIsImporting(true);
    try {
      const res = await importFromHydrominesCatalog(importTargetSite, selectedItems);
      toast.success(
        `${res.imported} pièce(s) importée(s) vers ${importTargetSite} (${res.skipped} déjà existante(s) ignorée(s))`
      );
      setSelectedItems([]);
      setIsImportModalOpen(false);
    } catch (err: any) {
      toast.error(`Erreur lors de l'importation vers le stock : ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Compute unique categories based on selected tech catalog
  const availableCategories = useMemo(() => {
    if (!selectedFamily) return [];
    const matched = MASTER_CATALOG.filter(it => {
      const comp = (it.compatibility || '').toLowerCase();
      if (selectedFamily === 'ST2G') return comp.includes('st2g');
      if (selectedFamily === 'ST2D') return comp.includes('st2d');
      if (selectedFamily === 'ST7') return comp.includes('st7');
      if (selectedFamily === 'T23') return comp.includes('t23');
      if (selectedFamily === 'T28') return comp.includes('t28');
      return false;
    });
    const uniq = new Set<string>();
    matched.forEach(it => {
      if (it.functionalCategory) uniq.add(it.functionalCategory);
    });
    
    const categories = Array.from(uniq);
    if (categories.length === 0) {
      console.warn(`[HydrominesCatalog] No categories found for ${selectedFamily}`);
    } else {
      console.log(`[HydrominesCatalog] Found ${categories.length} categories for ${selectedFamily}:`, categories);
    }
    
    // Sort by predefined order instead of alphabetical
    const order = CATEGORY_ORDER[selectedFamily] || [];
    categories.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b); // fallback alphabetical
    });
    
    return categories;
  }, [selectedFamily]);

  // Handle tech catalog tab clicks
  const handleSelectTechCatalogChange = (cat: EquipmentFamily) => {
    setSelectedFamily(cat);
    setSelectedTechCategory('ALL');
    setTechSearchTerm('');
    setTechVisibleLimit(30);
    setSelectedCatalogItem(null);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedTechCategory(cat);
    setTechVisibleLimit(30);
    setSelectedCatalogItem(null);
  };

  const handleTechSearchChange = (val: string) => {
    setTechSearchTerm(val);
    setTechVisibleLimit(30);
  };

  // Perform quick state-cached search on static MASTER_CATALOG
  const techFilteredItems = useMemo(() => {
    let items = techFilteredItemsHook;

    // 2. Filter by Category
    if (selectedTechCategory !== 'ALL') {
      items = items.filter(it => it.functionalCategory === selectedTechCategory);
    }

    return items;
  }, [techFilteredItemsHook, selectedTechCategory]);

  // Handle adding selected item from tech catalog search
  const handleAddSelectedCatalogItem = async () => {
    if (!selectedCatalogItem) return;

    if (isAlreadyInHM(selectedCatalogItem.reference)) {
      toast.warning(`La référence ${selectedCatalogItem.reference} existe déjà dans le Catalogue Hydromines ⭐`);
      return;
    }

    // Determine equipment family mappings
    let family: EquipmentFamily = 'AUTRE';
    if (selectedFamily === 'ST2G') family = 'ST2G';
    else if (selectedFamily === 'ST2D') family = 'ST2D';
    else if (selectedFamily === 'ST7') family = 'ST7';
    else if (selectedFamily === 'T23') family = 'T23';
    else if (selectedFamily === 'T28') family = 'T28';
    else if (selectedFamily === 'CONSOMMABLES') family = 'CONSOMMABLES';

    const newItem: HydrominesCatalogItem = {
      id: 'hm_' + generateId(),
      reference: selectedCatalogItem.reference.toUpperCase().trim(),
      designation: selectedCatalogItem.designation.trim(),
      suggestedType: selectedCatalogItem.suggestedType || 'CONSOMMABLES',
      functionalCategory: selectedCatalogItem.functionalCategory || 'Général',
      unit: techItemUnit || 'Pcs',
      sourceCatalog: selectedFamily || 'ST2G',
      equipmentFamily: family,
      status: 'ACTIF',
      isHydrominesCritical: techItemIsCritical,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveHydrominesCatalogItem(newItem);
      toast.success(`La pièce ${newItem.reference} a été ajoutée avec succès au Catalogue Hydromines ⭐`);
      
      // Clear selection so they can keep adding consecutive elements without closing physical modal
      setSelectedCatalogItem(null);
    } catch (e: any) {
      toast.error(`Erreur d'enregistrement : ${e.message || e}`);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone luxueuse */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]">
              <div className="absolute inset-0 rounded-full animate-pulse opacity-13 bg-current scale-110" />
              <Database className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Section centrale : Titre géant et sous-titre */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#b8860b]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#b8860b]">
                Répertoire Centralisé &amp; Base d'Autorité
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                Catalogue hydro-mines ⭐
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Répertoire National d'autorité unifié pour les pièces d'engins souterrains et consommables miniers
            </p>
          </div>

          {/* Section droite : Informations / Actions */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">SMI CATALOGUE MASTER</span>
            </div>
            
            {isAdminOrMagasinier && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn bg-slate-950 hover:bg-slate-900 text-white shadow-sm px-3 h-8 rounded-lg transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>Nouveau</span>
              </button>
            )}
          </div>
          
        </div>
      </div>

      {/* BANDEAU CATALOGUE OFFICIEL - SOURCE D'AUTORITÉ UNIQUE */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-5 bg-[#121c26] text-white border border-amber-500/20 rounded-2xl shadow-xl overflow-hidden relative group no-print">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-700" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#ffd700] shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd700] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                Norme de Sécurité &amp; Validation
              </span>
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider mt-1">
              Catalogue Hydromines Officiel d'Autorité Unique
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-2xl mt-0.5">
              Toutes les entrées, sorties et réapprovisionnements de pièces détachées sur chantiers doivent obligatoirement utiliser les fiches de ce catalogue. La Bibliothèque Technique sert exclusivement à l'homologation de nouvelles références.
            </p>
          </div>
        </div>
      </div>

      {/* 9 KPI High-density Grid Cards representing the Pilotage Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        {/* Total References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Références</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{enhancedStats.total}</h3>
          </div>
        </div>

        {/* ST2G References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Réf. ST2G (4 T.)</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{enhancedStats.st2g}</h3>
          </div>
        </div>

        {/* ST2D References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-650 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Réf. ST2D (3.6 T.)</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{enhancedStats.st2d}</h3>
          </div>
        </div>

        {/* ST7 References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Réf. ST7 (6.8 T.)</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{enhancedStats.st7}</h3>
          </div>
        </div>

        {/* T23 References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Réf. T23</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{enhancedStats.t23}</h3>
          </div>
        </div>

        {/* T28 References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Réf. T28</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{enhancedStats.t28 || 0}</h3>
          </div>
        </div>

        {/* Active References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Actives</p>
            <h3 className="text-xl font-black text-emerald-700 mt-1">{enhancedStats.active}</h3>
          </div>
        </div>

        {/* Inactive References */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Inactives</p>
            <h3 className="text-xl font-black text-slate-600 mt-1">{enhancedStats.inactive}</h3>
          </div>
        </div>

        {/* Critical Parts */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-none">Critiques</p>
            <h3 className="text-xl font-black text-rose-700 mt-1">{enhancedStats.critical}</h3>
          </div>
        </div>
      </div>

      {/* Modern Pilotage Toggle Switcher */}
      <div className="flex bg-slate-100/80 p-1 rounded-2xl max-w-sm border border-slate-200/50">
        <button
          type="button"
          onClick={() => handleTabChange('dashboard')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'dashboard'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Activity className="w-3.5 h-3.5 text-sky-500" />
          Pilotage & Cockpit
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('registry')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'registry'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          Registre Général
        </button>
      </div>

      {/* Conditionally render Cockpit vs Registry */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-fadeIn duration-250">
          {/* Row 1: Quality Control Summary & Deep Dive */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Quality controls (Left 5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-650">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Contrôle Qualité & Conformité</h3>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-normal">
                  Audit en temps réel des caractéristiques techniques du référentiel Hydromines.
                </p>
              </div>

              {/* Quality Alerts Widgets */}
              <div className="space-y-3">
                {/* Alert 1: Without Price */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/45 hover:bg-slate-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedAlerts(prev => ({ ...prev, sansPrix: !prev.sansPrix }))}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Références sans prix</h4>
                        <p className="text-[9px] font-semibold text-slate-400">Aucun tarif unitaire trouvé dans la base</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black",
                        enhancedStats.sansPrix.length > 0 ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      )}>
                        {enhancedStats.sansPrix.length} anomalie{enhancedStats.sansPrix.length > 1 ? 's' : ''}
                      </span>
                      {enhancedStats.sansPrix.length > 0 && (
                        expandedAlerts.sansPrix ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )
                      )}
                    </div>
                  </button>
                  
                  {expandedAlerts.sansPrix && enhancedStats.sansPrix.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-2.5 max-h-[140px] overflow-y-auto space-y-1.5 animate-fadeIn">
                      {enhancedStats.sansPrix.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-[10px] font-bold">
                          <span className="font-mono font-black text-slate-900 uppercase tracking-wide">{item.reference}</span>
                          <span className="text-slate-400 italic truncate max-w-[180px]">{item.designation}</span>
                        </div>
                      ))}
                      {enhancedStats.sansPrix.length > 5 && (
                        <p className="text-[9px] font-black text-sky-600 text-right mt-1 cursor-pointer" onClick={() => { handleTabChange('registry'); setSearchTerm(enhancedStats.sansPrix[0].reference); }}>
                          + {enhancedStats.sansPrix.length - 5} autres... Rechercher
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Alert 2: Without Category */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/45 hover:bg-slate-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedAlerts(prev => ({ ...prev, sansCat: !prev.sansCat }))}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                        <Layers3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Aucune catégorie fonctionnelle</h4>
                        <p className="text-[9px] font-semibold text-slate-400">Placées sous "Général" ou non qualifiées</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black",
                        enhancedStats.sansCat.length > 0 ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      )}>
                        {enhancedStats.sansCat.length} référence{enhancedStats.sansCat.length > 1 ? 's' : ''}
                      </span>
                      {enhancedStats.sansCat.length > 0 && (
                        expandedAlerts.sansCat ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )
                      )}
                    </div>
                  </button>
                  
                  {expandedAlerts.sansCat && enhancedStats.sansCat.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-2.5 max-h-[140px] overflow-y-auto space-y-1.5 animate-fadeIn">
                      {enhancedStats.sansCat.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-[11px] font-bold">
                          <span className="font-mono font-black text-slate-900 uppercase tracking-wide">{item.reference}</span>
                          <span className="text-slate-400 uppercase text-[8.5px] font-extrabold px-1.5 py-0.5 bg-slate-100 rounded">{item.equipmentFamily}</span>
                        </div>
                      ))}
                      {enhancedStats.sansCat.length > 5 && (
                        <p className="text-[9px] font-black text-sky-600 text-right mt-1 cursor-pointer" onClick={() => { handleTabChange('registry'); setSearchTerm(enhancedStats.sansCat[0].reference); }}>
                          + {enhancedStats.sansCat.length - 5} autres...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Alert 3: Without Unit */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/45 hover:bg-slate-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedAlerts(prev => ({ ...prev, sansUnite: !prev.sansUnite }))}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Unités manquantes</h4>
                        <p className="text-[9px] font-semibold text-slate-400">Champs d'unités vides ou indéfinis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black",
                        enhancedStats.sansUnite.length > 0 ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      )}>
                        {enhancedStats.sansUnite.length} anomalie{enhancedStats.sansUnite.length > 1 ? 's' : ''}
                      </span>
                      {enhancedStats.sansUnite.length > 0 && (
                        expandedAlerts.sansUnite ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )
                      )}
                    </div>
                  </button>
                  
                  {expandedAlerts.sansUnite && enhancedStats.sansUnite.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-1.5 animate-fadeIn">
                      {enhancedStats.sansUnite.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-[11px] font-bold">
                          <span className="font-mono font-black text-slate-900 uppercase tracking-wide">{item.reference}</span>
                          <span className="text-slate-400 italic truncate max-w-[180px]">{item.designation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alert 4: Duplicates */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/45 hover:bg-slate-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedAlerts(prev => ({ ...prev, duplicates: !prev.duplicates }))}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Doublons Potentiels</h4>
                        <p className="text-[9px] font-semibold text-slate-400">Drapeau d'homonymie de référence (sans espaces)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black",
                        enhancedStats.duplicates.length > 0 ? "bg-amber-100 text-amber-800 border border-amber-250 font-bold" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      )}>
                        {enhancedStats.duplicates.length} groupe{enhancedStats.duplicates.length > 1 ? 's' : ''}
                      </span>
                      {enhancedStats.duplicates.length > 0 && (
                        expandedAlerts.duplicates ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )
                      )}
                    </div>
                  </button>
                  
                  {expandedAlerts.duplicates && enhancedStats.duplicates.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] space-y-2 max-h-[140px] overflow-y-auto animate-fadeIn">
                      {enhancedStats.duplicates.map(dup => (
                        <div key={dup.cleanRef} className="bg-amber-50/40 p-2 rounded-lg border border-amber-100/50 font-bold">
                          <p className="font-mono font-black text-amber-900 text-[9.5px]">Clé : {dup.cleanRef}</p>
                          <div className="mt-1 space-y-1 pl-2 border-l border-amber-200">
                            {dup.items.map(it => (
                              <div key={it.id} className="text-slate-600 text-[9px]">
                                • ID: {it.id} Reference: <span className="font-black text-slate-800">{it.reference}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rotation & Usage performance (Right 7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                    <BarChart3 className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Performances & Rotation d'inventaire</h3>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">
                  Analyse des mouvements réels sur le stock physique pour chaque référence du catalogue Hydromines.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top References */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <span>Top 5 Références les plus utilisées</span>
                    <span className="text-[8.5px] text-sky-600 font-bold">Mouvements de pièces</span>
                  </div>
                  
                  <div className="space-y-4">
                    {enhancedStats.topUsed.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">Aucun mouvement enregistré sur les pièces physiques.</p>
                    ) : (
                      enhancedStats.topUsed.slice(0, 5).map(({ item, count, lastDate }) => (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-black text-slate-800 uppercase leading-none">{item.reference}</span>
                            <span className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded leading-none">{count} pcs</span>
                          </div>
                          {/* Visual progress bar */}
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full" 
                              style={{ width: `${Math.min(100, (count / (enhancedStats.topUsed[0]?.count || 1)) * 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-400 leading-none">
                            <span className="truncate max-w-[130px]">{item.designation}</span>
                            <span>Mise à jour: {lastDate ? new Date(lastDate).toLocaleDateString("fr-FR") : 'Non définie'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dormant references */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <span>Références dormantes (&gt; 180 j)</span>
                    <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-extrabold border border-amber-100 leading-none">{enhancedStats.dormant.length} pièces</span>
                  </div>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {enhancedStats.dormant.length === 0 ? (
                      <p className="text-xs text-slate-450 italic py-6 text-center">Toutes les pièces enregistrent une rotation saine.</p>
                    ) : (
                      enhancedStats.dormant.slice(0, 5).map(({ item, lastActivity, daysCount }) => (
                        <div key={item.id} className="p-2.5 bg-slate-50/55 rounded-2xl border border-slate-100 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-black text-slate-900 uppercase tracking-wide leading-none">{item.reference}</span>
                              <span className="text-[7.5px] bg-slate-150 text-slate-500 px-1 py-0.2 rounded font-extrabold uppercase leading-none">{item.equipmentFamily}</span>
                            </div>
                            <p className="text-[9.5px] font-semibold text-slate-400 mt-1 truncate leading-none">{item.designation}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-[10.5px] font-black text-amber-700">
                              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                              {daysCount} j
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 block mt-1 leading-none">Inactif</span>
                          </div>
                        </div>
                      ))
                    )}
                    {enhancedStats.dormant.length > 5 && (
                      <p className="text-[9px] font-black text-sky-600 text-center cursor-pointer mt-2 leading-none" onClick={() => { handleTabChange('registry'); }}>
                        + Voir les {enhancedStats.dormant.length - 5} autres références au registre
                      </p>
                    )}
                  </div>
                </div>

              </div>

              <hr className="border-slate-100" />

              {/* Recently Added & Never Used References Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                {/* Recently Added */}
                <div className="space-y-3">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Références Récemment Enregistrées</span>
                    <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100 leading-none">Nouveau</span>
                  </div>

                  <div className="space-y-2">
                    {enhancedStats.recentlyAdded.map(item => (
                      <div key={item.id} className="p-2.5 bg-white rounded-xl border border-slate-100/80 flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-black text-slate-900 uppercase truncate leading-tight">{item.reference}</p>
                          <p className="text-[9.5px] font-semibold text-slate-405 truncate leading-none mt-1">{item.designation}</p>
                        </div>
                        <span className="font-mono text-[8.5px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded leading-none shrink-0">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : 'Indéfini'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Never Used */}
                <div className="space-y-3">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Références jamais utilisées</span>
                    <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 leading-none">{enhancedStats.neverUsed.length} références</span>
                  </div>

                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {enhancedStats.neverUsed.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">Toutes les pièces du catalogue ont enregistré au moins un mouvement.</p>
                    ) : (
                      enhancedStats.neverUsed.slice(0, 5).map(item => (
                        <div key={item.id} className="p-2.5 bg-slate-50/30 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono font-black text-slate-900 uppercase truncate leading-tight">{item.reference}</p>
                            <p className="text-[9.5px] font-semibold text-slate-400 truncate leading-none mt-1">{item.designation}</p>
                          </div>
                          <span className="text-[7.5px] font-bold bg-slate-55 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100/50 leading-none shrink-0 uppercase">
                            {item.equipmentFamily}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn duration-250">
          {/* Filter Controls Row */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par référence, désignation ou catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-705 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all animate-none"
                />
              </div>

              {/* Families */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Famille:</span>
                  <select
                    value={activeFamily}
                    onChange={(e) => setActiveFamily(e.target.value)}
                    className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-705 focus:outline-none"
                  >
                    <option value="ALL">TOUTES</option>
                    <option value="ST2G">ST2G (4 T. - Cummins)</option>
                    <option value="ST2D">ST2D (3.6 T. - Deutz)</option>
                    <option value="ST7">ST7 (6.8 T. - Cummins)</option>
                    <option value="T23">T23 (Foreuse 23kg)</option>
                    <option value="T28">T28 (Foreuse 28kg)</option>
                    <option value="EPI">EPI (Sécurité)</option>
                    <option value="CONSOMMABLES">CONSOMMABLES</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Statut:</span>
                  <select
                    value={activeStatus}
                    onChange={(e) => setActiveStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-705 focus:outline-none"
                  >
                    <option value="ALL">TOUS</option>
                    <option value="ACTIF">ACTIF</option>
                    <option value="INACTIF">INACTIF</option>
                  </select>
                </div>

                {/* Criticality */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Criticité:</span>
                  <select
                    value={activeCritical}
                    onChange={(e) => setActiveCritical(e.target.value)}
                    className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-705 focus:outline-none"
                  >
                    <option value="ALL">TOUTES</option>
                    <option value="CRITICAL">⚠️ CRITIQUE SEULEMENT</option>
                    <option value="NORMAL">NON CRITIQUE</option>
                  </select>
                </div>

                {/* Reset Filters Option (Exigence 2 & 3) */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveFamily('ALL');
                    setActiveStatus('ALL');
                    setActiveCritical('ALL');
                    toast.success("Tous les filtres ont été réinitialisés avec succès !");
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer active:scale-95",
                    (searchTerm !== '' || activeFamily !== 'ALL' || activeStatus !== 'ALL' || activeCritical !== 'ALL')
                      ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                      : "bg-slate-50 border-slate-150 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                  )}
                  title="Réinitialiser tous les filtres à leur valeur d'origine"
                >
                  <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  Réinitialiser tous les filtres
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Header */}
          {selectedItems.length > 0 && isAdminOrMagasinier && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50/70 border border-amber-200/60 px-6 py-4 rounded-3xl mb-4 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <Database className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  {selectedItems.length} pièce{selectedItems.length > 1 ? 's' : ''} sélectionnée{selectedItems.length > 1 ? 's' : ''} pour l'import d'un chantier
                </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleOpenImportModal}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Importer vers le Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* List Table Grid block */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100/80 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                    {isAdminOrMagasinier && (
                      <th className="px-4 py-4.5 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4.5 w-12 text-center">N°</th>
                    <th className="px-6 py-4.5 w-36">Référence</th>
                    <th className="px-6 py-4.5">Description</th>
                    <th className="px-6 py-4.5 w-40">Classification / Unité</th>
                    <th className="px-6 py-4.5 w-36 text-center">Famille Matériel</th>
                    <th className="px-6 py-4.5 w-24 text-center">Critique</th>
                    <th className="px-6 py-4.5 w-32 text-center">Statut Operationnel</th>
                    {isAdminOrMagasinier && <th className="px-6 py-4.5 w-24 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrMagasinier ? 9 : 8} className="px-6 py-20 text-center text-slate-400">
                        <Database className="w-12 h-12 text-slate-200 mx-auto mb-3 opacity-60" />
                        <p className="font-bold text-sm text-slate-850">Aucun article trouvé dans le Catalogue Hydromines</p>
                        <p className="text-xs text-slate-400 mt-1">Utilisez l'ajout depuis le catalogue technique pour enrichir la liste sans erreurs.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const isSelected = selectedItems.some(x => x.id === item.id);
                      return (
                        <tr key={item.id} className={cn(
                          "hover:bg-slate-50/40 transition-colors",
                          isSelected && "bg-amber-50/20 hover:bg-amber-50/30"
                        )}>
                          {isAdminOrMagasinier && (
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item)}
                                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-slate-350 text-center font-mono text-[10.5px] font-semibold">{idx + 1}</td>
                        <td className="px-6 py-4 font-mono text-xs font-black text-slate-900 tracking-wide uppercase">
                          {item.reference}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{item.designation}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold text-slate-405">Origine:</span>
                            <span className="text-[9.5px] font-extrabold text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded italic leading-none">{item.sourceCatalog || '---'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[9px] font-black bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded uppercase leading-none border border-sky-100">
                              {item.functionalCategory}
                            </span>
                            <span className="text-[9px] font-bold bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded leading-none border border-slate-100">
                              {item.suggestedType}
                            </span>
                          </div>
                          <p className="text-[9.5px] font-semibold text-slate-400">Unité : <span className="text-slate-700 font-bold">{item.unit || 'Pcs'}</span></p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-block px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase",
                            item.equipmentFamily === 'ST2G' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            item.equipmentFamily === 'ST2D' ? "bg-orange-50 text-orange-700 border border-orange-100" :
                            item.equipmentFamily === 'ST7' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            item.equipmentFamily === 'T23' ? "bg-purple-50 text-purple-700 border border-purple-100" :
                            item.equipmentFamily === 'T28' ? "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100" :
                            item.equipmentFamily === 'EPI' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            item.equipmentFamily === 'CONSOMMABLES' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                            "bg-slate-50 text-slate-600 border border-slate-100"
                          )}>
                            {item.equipmentFamily}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            disabled={!isAdminOrMagasinier}
                            onClick={() => handleToggleCritical(item)}
                            className={cn(
                              "w-11 h-11 inline-flex items-center justify-center rounded-xl transition-all active:scale-90 border",
                              item.isHydrominesCritical 
                                ? "bg-rose-100 text-rose-700 border-rose-300 shadow-xs" 
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-250",
                              isAdminOrMagasinier ? "cursor-pointer" : "cursor-default"
                            )}
                            title={item.isHydrominesCritical ? "Pièce critique. Cliquez pour décocher." : "Cliquer pour définir comme critique."}
                          >
                            <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            disabled={!isAdminOrMagasinier}
                            onClick={() => handleToggleStatus(item)}
                            className={cn(
                              "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10.5px] font-black tracking-wide uppercase transition-all active:scale-90 border shadow-xs min-h-[44px]",
                              item.status === 'ACTIF' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" 
                                : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100",
                              isAdminOrMagasinier ? "cursor-pointer" : "cursor-default"
                            )}
                          >
                            <span className={cn("w-2 h-2 rounded-full shrink-0", item.status === 'ACTIF' ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                            {item.status}
                          </button>
                        </td>
                        {isAdminOrMagasinier && (
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="w-11 h-11 inline-flex items-center justify-center text-slate-400 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-all active:scale-90 cursor-pointer border border-slate-150"
                            >
                              <Edit3 className="w-4 h-4 shrink-0" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 0 && (
              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 text-[10.5px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Affichage de {filteredItems.length} références</span>
                <span className="font-mono">Registre Central v2.0.0</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import to Stock Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden flex flex-col z-[120]"
            >
              {/* Box Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Importer vers le Stock
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Sélection du chantier physique de destination</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1.5 hover:bg-slate-150 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleImportSubmit}>
                <div className="p-6 space-y-4">
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 text-xs text-amber-800 font-bold leading-normal">
                    <p>
                      Vous vous apprêtez à initialiser librement en stock pour le chantier choisi {selectedItems.length} pièce(s) d'origine certifiée Hydromines.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Chantier Cible (Stock destination)</label>
                    <select
                      value={importTargetSite}
                      onChange={(e) => setImportTargetSite(e.target.value as SiteCode)}
                      required
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-4 py-3 text-xs font-bold text-slate-705 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all"
                    >
                      {SITE_CODES.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-205 text-[10.5px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || selectedItems.length === 0}
                    className="px-4.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[10.5px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isImporting ? "Importation..." : "Lancer l'importation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && editingItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh] z-[120]"
            >
              {/* Box Header */}
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {editingItem.id ? "Modifier la pièce" : "Enregistrer une nouvelle pièce"}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Hydromines Technical Master Catalog System</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-150 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Box Tabs - Only shown when creating a new item */}
              {!editingItem.id && (
                <div className="flex border-b border-slate-100 bg-slate-50/20 px-8 py-1 shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreationTab('catalog')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all cursor-pointer outline-none",
                      creationTab === 'catalog'
                        ? "border-sky-500 text-sky-700 font-black"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Database className="w-4 h-4 text-sky-500" />
                    Ajouter depuis les catalogues techniques
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationTab('manual')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all cursor-pointer outline-none",
                      creationTab === 'manual'
                        ? "border-amber-500 text-amber-700 font-black"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Edit3 className="w-4 h-4 text-amber-500" />
                    Saisie manuelle de secours
                  </button>
                </div>
              )}

              {/* Main Dialog body */}
              <div className="flex-1 overflow-y-auto p-8">
                {!editingItem.id && creationTab === 'catalog' ? (
                  /* Catalog insertion flow split UI */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Panel: Filters & progressive results */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Step 1: choosing technical catalog */}
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                          1. Choisir le catalogue technique
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {CATALOG_OPTIONS.map(catOpt => (
                            <button
                              key={catOpt.id}
                              type="button"
                              onClick={() => handleSelectTechCatalogChange(catOpt.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-2xl text-center border-2 transition-all cursor-pointer shadow-xs relative overflow-hidden",
                                selectedFamily === catOpt.id
                                  ? `bg-gradient-to-br ${catOpt.color} border-slate-950 scale-102 ring-2 ring-slate-900/10 font-bold`
                                  : "bg-white border-slate-150 hover:bg-slate-50 text-slate-500"
                              )}
                            >
                              <span className="text-[10px] font-black tracking-wider uppercase block">⭐ {catOpt.label}</span>
                              <span className="text-[8.5px] font-bold opacity-75 mt-0.5 leading-tight">{catOpt.desc}</span>
                              <span className="mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-black bg-white/90 border border-slate-100 text-slate-700 shadow-2xs leading-none">
                                {CATALOG_COUNTS[catOpt.id]} pièces
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Category Filter dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                          <span>2. Choisir la catégorie fonctionnelle</span>
                          <span className="text-[9px] text-slate-400 font-bold">({availableCategories.length} au total)</span>
                        </label>
                        <select
                          value={selectedTechCategory}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="ALL">📋 Toutes les catégories</option>
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Step 3: Text Search Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          3. Recherche texte instantanée <span className="text-[9px] font-bold text-sky-500 lowercase">(dépassement à partir de 2 caractères)</span>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Saisir min. 2 car. (Ex: bloc bielle, Deutz, 5580...)"
                            value={techSearchTerm}
                            onChange={(e) => handleTechSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Lists */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <span>
                            {selectedFamily 
                              ? `${techFilteredItems.length} références ${selectedFamily}`
                              : "RÉFÉRENCES DISPONIBLES"}
                          </span>
                          <span>CLIQUEZ POUR CONFIGURER</span>
                        </div>

                        <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto bg-slate-50/30 divide-y divide-slate-100">
                          {!selectedFamily ? (
                            <div className="p-8 text-center text-slate-400 bg-white">
                              <HelpCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-85 animate-pulse" />
                              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Sélectionnez un catalogue</p>
                              <p className="text-[10px] text-slate-500 mt-1">Choisissez l'un des 5 catalogues d'équipements ci-dessus pour afficher et filtrer les pièces.</p>
                            </div>
                          ) : techFilteredItems.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-white">
                              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                              <p className="text-xs font-bold text-slate-700">Aucun article trouvé</p>
                              <p className="text-[10px] text-slate-405 mt-0.5">Vérifiez les filtres de catégories ou réessayez avec d'autres termes.</p>
                            </div>
                          ) : (
                            techFilteredItems.slice(0, techVisibleLimit).map(it => {
                              const isSelected = selectedCatalogItem?.id === it.id;
                              const inHM = isAlreadyInHM(it.reference);
                              return (
                                <button
                                  key={it.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCatalogItem(it);
                                    setTechItemUnit(it.unit || 'Pcs');
                                  }}
                                  className={cn(
                                    "w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer",
                                    isSelected ? "bg-sky-50/80" : "bg-white hover:bg-slate-50/50",
                                    inHM ? "border-l-4 border-l-emerald-500 bg-emerald-50/20" : ""
                                  )}
                                >
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-black text-slate-900 tracking-wide">
                                        {it.reference}
                                      </span>
                                      {inHM && (
                                        <span className="text-[8px] font-black tracking-wide uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded leading-none">
                                          ✓ Dans Hydromines
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-650 truncate leading-tight">
                                      {it.designation}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                      <span>{it.functionalCategory}</span>
                                      <span>•</span>
                                      <span>{it.subCategory || 'Général'}</span>
                                    </div>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 transition-colors",
                                    isSelected 
                                      ? "bg-slate-950 text-white" 
                                      : "bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-700"
                                  )}>
                                    {isSelected ? "Sélectionné" : "Choisir"}
                                  </span>
                                </button>
                              );
                            })
                          )}

                          {techFilteredItems.length > techVisibleLimit && (
                            <div className="p-3.5 bg-white border-t border-slate-100 text-center">
                              <button
                                type="button"
                                onClick={() => setTechVisibleLimit(prev => prev + 30)}
                                className="px-4 py-2 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-[10px] font-black uppercase text-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                              >
                                Charger plus de pièces ({techFilteredItems.length - techVisibleLimit} restantes)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Information Card with zero schema overhead */}
                    <div className="lg:col-span-5 bg-slate-50/50 border border-slate-200/70 p-6 rounded-2xl space-y-4 max-h-[580px] overflow-y-auto flex flex-col justify-between">
                      {selectedCatalogItem ? (
                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-sky-600">FICHE INFO CONSTRUCTEUR</span>
                              <span className="text-[9px] font-bold text-slate-400">UNIFIÉ V2.0</span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase text-slate-400 leading-none">RÉFÉRENCE PIÈCE</p>
                              <p className="font-mono text-sm font-black text-slate-900 tracking-wide uppercase">{selectedCatalogItem.reference}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase text-slate-400 leading-none">DÉSIGNATION ARTICLE</p>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{selectedCatalogItem.designation}</p>
                            </div>

                            {/* Detailed Grid */}
                            <div className="grid grid-cols-2 gap-3 text-[11px] pt-1 select-none">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[8px] font-black uppercase text-slate-400 block">CATALOGUE SOURCE</span>
                                <span className="font-black text-slate-800 text-[10px] uppercase">{selectedFamily || 'Inconnu'}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[8px] font-black uppercase text-slate-400 block">FAMILLE MATÉRIEL</span>
                                <span className="font-black text-slate-800 text-[10px] uppercase">{selectedFamily || 'Inconnu'}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 col-span-2">
                                <span className="text-[8px] font-black uppercase text-slate-400 block">CATÉGORIE FONCTIONNELLE</span>
                                <span className="font-bold text-slate-800 text-[10px] truncate block">
                                  {selectedCatalogItem.functionalCategory}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 col-span-2">
                                <span className="text-[8px] font-black uppercase text-slate-400 block">COMPATIBILITÉ ÉQUIPEMENT</span>
                                <span className="font-medium text-slate-650 text-[10px] leading-snug block">
                                  {selectedCatalogItem.compatibility || 'Tous engins d\'extraction souterrains (-350m)'}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 col-span-2">
                                <span className="text-[8px] font-black uppercase text-slate-400 block">STATUT VALIDATION</span>
                                <span className="font-bold text-emerald-600 text-[10px] leading-snug flex items-center gap-1 mt-0.5">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  CONFORME CONSTRUCTEUR
                                </span>
                              </div>
                            </div>

                            {/* Adjustments: Unit */}
                            <div className="space-y-1.5 pt-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400 block">Ajuster l'unité de mesure</label>
                              <input
                                type="text"
                                placeholder="Pcs, Kit, Ens..."
                                value={techItemUnit}
                                onChange={(e) => setTechItemUnit(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-705 focus:outline-none focus:border-sky-500"
                              />
                            </div>

                            {/* Adjustments: Critical */}
                            <div>
                              <label className="inline-flex items-center gap-2.5 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-100 w-full select-none">
                                <input
                                  type="checkbox"
                                  checked={techItemIsCritical}
                                  onChange={(e) => setTechItemIsCritical(e.target.checked)}
                                  className="w-4 h-4 text-sky-600 focus:ring-sky-500 rounded"
                                />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-800">Déclarer comme pièce critique ⭐</span>
                                  <span className="text-[8.5px] text-slate-450 leading-none">Mettra en relief cet article en rouge dans l'inventaire</span>
                                </div>
                              </label>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-200">
                            {isAlreadyInHM(selectedCatalogItem.reference) ? (
                              <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl text-center text-slate-500 font-bold text-[10.5px]">
                                ✓ DÉJÀ PRÉSENT DANS LE CATALOGUE HYDROMINES
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleAddSelectedCatalogItem}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-sky-600/10 cursor-pointer transition-all active:scale-95"
                              >
                                <Save className="w-4 h-4" />
                                Ajouter au Catalogue Hydromines
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-slate-400">
                          <Database className="w-12 h-12 text-slate-205 mb-3" />
                          <h4 className="text-[11.5px] font-black text-slate-800 uppercase">Aucune sélection</h4>
                          <p className="text-[10px] text-slate-450 max-w-xs mt-1.5 leading-normal">
                            Sélectionnez une pièce parmi les résultats de recherche du catalogue technique pour afficher ses informations d'autorité constructeur et valider l'ajout.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Manual emergency fallback form */
                  <form onSubmit={handleSaveItemSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Reference */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Référence pièce <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 5580 1450 88"
                          disabled={!!editingItem.id}
                          value={editingItem.reference || ''}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, reference: e.target.value }))}
                          className={cn(
                            "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 leading-normal",
                            editingItem.id ? "opacity-60 cursor-not-allowed bg-slate-100" : ""
                          )}
                        />
                      </div>

                      {/* Unit */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Unité de mesure</label>
                        <input
                          type="text"
                          placeholder="Ex: Pcs, Kit, Ens"
                          value={editingItem.unit || ''}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, unit: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 leading-normal"
                        />
                      </div>

                      {/* Designation */}
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Désignation article <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Accouplement cannelé d'entraînement principal"
                          value={editingItem.designation || ''}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, designation: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-705 focus:outline-none focus:border-sky-500 leading-normal"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Sous-système / Catégorie</label>
                        <input
                          type="text"
                          placeholder="Ex: Système de Transmission"
                          value={editingItem.functionalCategory || ''}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, functionalCategory: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-705 focus:outline-none focus:border-sky-500 leading-normal"
                        />
                      </div>

                      {/* Suggested Type */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Type Standard Stock</label>
                        <select
                          value={editingItem.suggestedType || 'CONSOMMABLES'}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, suggestedType: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="ENGINS">ENGINS</option>
                          <option value="PERFORATEURS">PERFORATEURS</option>
                          <option value="CONSOMMABLES">CONSOMMABLES</option>
                          <option value="EPI">EPI</option>
                          <option value="OUTILS_TRAVAUX">OUTILS_TRAVAUX</option>
                          <option value="AUTRES">AUTRES</option>
                        </select>
                      </div>

                      {/* Equipment Family */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Famille Matériel</label>
                        <select
                          value={editingItem.equipmentFamily || 'CONSOMMABLES'}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, equipmentFamily: e.target.value as any }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="ST2G">ST2G</option>
                          <option value="ST2D">ST2D</option>
                          <option value="ST7">ST7</option>
                          <option value="T23">T23</option>
                          <option value="T28">T28</option>
                          <option value="EPI">EPI</option>
                          <option value="CONSOMMABLES">CONSOMMABLES</option>
                          <option value="AUTRE">AUTRE</option>
                        </select>
                      </div>

                      {/* Status */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Statut</label>
                        <select
                          value={editingItem.status || 'ACTIF'}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="ACTIF">ACTIF</option>
                          <option value="INACTIF">INACTIF</option>
                        </select>
                      </div>

                      {/* Critical Checkbox */}
                      <div className="col-span-2 pt-2">
                        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!editingItem.isHydrominesCritical}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, isHydrominesCritical: e.target.checked }))}
                            className="w-4.5 h-4.5 rounded text-sky-600 focus:ring-sky-500 border-slate-350 bg-slate-50"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">Déclarer cet article comme pièce critique Hydromines</span>
                            <span className="text-[10px] font-semibold text-slate-450 leading-normal">Mettra en surbrillance rouge cet article dans les registres d'inventaire généraux.</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Box Footer Block */}
              <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/20 px-8 py-5 shrink-0 select-none">
                <div className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                  {!editingItem.id && creationTab === 'catalog' 
                    ? `Catalogue centralisé • ${techFilteredItems.length} références trouvées`
                    : "Saisie d'autorité manuelle de secours"
                  }
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white border border-slate-150 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Fermer
                  </button>
                  {((editingItem.id) || (creationTab === 'manual')) && (
                    <button
                      type="button"
                      onClick={handleSaveItemSubmit}
                      className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-sky-600/10 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer la pièce
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
