import { useEffect, useCallback, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useArticlesStore } from '../stores/article.store';
import { catalogService } from '../services/catalog.service';
import { CatalogItem, HydrominesCatalogItem, EquipmentFamily } from '../types';
import { serializeFirestoreData, generateId } from '../lib/utils';
import { toast } from 'sonner';

// Import verified sub-catalogs and master catalog hub
import { MASTER_CATALOG } from '../catalogData';
import { ST2G_CATALOG } from '../catalogDataST2G';
import { ST2D_CATALOG } from '../catalogDataST2D';
import { ST7_CATALOG } from '../catalogDataST7';
import { T23_CATALOG } from '../catalogDataT23';
import { T28_CATALOG } from '../catalogDataT28';

/**
 * Helper to retrieve catalog items by equipment family.
 * Filters the master catalog based on the selected family.
 */
export const getCatalogByFamily = (family: string): CatalogItem[] => {
  if (family === 'CONSOMMABLES') {
    const results = MASTER_CATALOG.filter(item => 
      item.id.startsWith('for_') || 
      item.suggestedType === 'CONSOMMABLES' || 
      (item.compatibility && (
        item.compatibility.toLowerCase().includes('tous perforateurs') || 
        item.compatibility.toLowerCase().includes('consommables')
      ))
    );
    console.log(`[getCatalogByFamily] family: CONSOMMABLES, items matching count: ${results.length}`);
    return results;
  }

  const familyMap: Record<string, string> = {
    'ST2G': 'Epiroc Scooptram ST2G',
    'ST2D': 'Epiroc Scooptram ST2D',
    'ST7': 'Epiroc Scooptram ST7',
    'T23': 'Montabert T23',
    'T28': 'Montabert T28',
  };
  const targetCompatibility = familyMap[family];
  if (!targetCompatibility) {
    console.warn(`[getCatalogByFamily] No compatibility mapping found for family: ${family}`);
    return [];
  }
  const results = MASTER_CATALOG.filter(item => {
    const itemComp = (item.compatibility || '').toLowerCase();
    return itemComp === targetCompatibility.toLowerCase() || itemComp.includes(family.toLowerCase());
  });
  console.log(`[getCatalogByFamily] family: ${family}, targetCompatibility: ${targetCompatibility}, items matching count: ${results.length}`);
  return results;
};

/**
 * Hook to manage reactive filtering, searching, and family selection
 * over the entire master catalog.
 */
export function useCatalogFilter() {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredItems = useMemo(() => {
    console.log('[useCatalogFilter] selectedFamily:', selectedFamily);
    let items = MASTER_CATALOG;
    if (selectedFamily) {
      items = getCatalogByFamily(selectedFamily);
      console.log('[useCatalogFilter] filtered count by family:', items.length);
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.designation?.toLowerCase().includes(q) ||
        item.reference?.toLowerCase().includes(q) ||
        item.component?.toLowerCase().includes(q)
      );
      console.log('[useCatalogFilter] filtered count with searchQuery:', items.length);
    }
    return items;
  }, [selectedFamily, searchQuery]);
  
  return { selectedFamily, setSelectedFamily, searchQuery, setSearchQuery, filteredItems };
}

/**
 * Builds a nested category/component hierarchy for the catalog.
 * Defaults to the complete MASTER_CATALOG if no catalog is specified.
 */
export function buildHierarchy(catalog: CatalogItem[] = MASTER_CATALOG) {
  const hierarchy: Record<string, any> = {};
  
  for (const item of catalog) {
    const type = item.suggestedType || 'AUTRES';
    if (!hierarchy[type]) hierarchy[type] = { categories: {} };
    
    const cat = item.functionalCategory || 'Non classé';
    if (!hierarchy[type].categories[cat]) {
      hierarchy[type].categories[cat] = {
        name: cat,
        isLeaf: false,
        subCategories: {}
      };
    }
    
    const subCat = item.subCategory || 'Non spécifié';
    if (!hierarchy[type].categories[cat].subCategories[subCat]) {
      const hasComponents = !!item.component;
      hierarchy[type].categories[cat].subCategories[subCat] = {
        name: subCat,
        isLeaf: !hasComponents,
        components: {}
      };
    }
    
    if (item.component) {
      hierarchy[type].categories[cat].subCategories[subCat].components[item.component] = {
        name: item.component,
        reference: item.reference,
        price: item.price || 0,
        unit: item.unit || 'PIECE',
        criticality: item.criticality || 'MOYENNE',
        isLeaf: true
      };
    }
  }
  
  return hierarchy;
}

export function useCatalog() {
  const {
    catalog,
    hydrominesCatalog,
    setCatalog,
    setHydrominesCatalog
  } = useArticlesStore();

  // Subscribe to master catalog entries in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'catalog'), (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as CatalogItem)
        .filter(item => !(item as any).deleted);
      setCatalog(list);
    });
    return unsub;
  }, [setCatalog]);

  // Subscribe to hydromines catalog
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hydromines_catalog'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as HydrominesCatalogItem);
      setHydrominesCatalog(list);
    });
    return unsub;
  }, [setHydrominesCatalog]);

  const addToHydrominesCatalog = useCallback(async (
    item: any,
    selectedType: string,
    selectedCategory: string,
    selectedSubCategory?: string
  ) => {
    if (!item.isLeaf && !item.components) {
      toast.error("❌ Les catégories ne sont pas des pièces. Vous ne pouvez ajouter que des composants.");
      return;
    }

    const determineEquipmentFamily = (type: string): EquipmentFamily => {
      if (type === 'ENGINS') return 'ST2G';
      if (type === 'PERFORATEURS') return 'T23';
      if (type === 'CONSOMMABLES') return 'CONSOMMABLES';
      if (type === 'EPI') return 'EPI';
      return 'AUTRE';
    };

    const hydrominesItem = {
      id: `hm_${generateId()}`,
      reference: item.reference,
      designation: item.name || item.designation,
      suggestedType: selectedType,
      functionalCategory: selectedCategory,
      subCategory: selectedSubCategory || undefined,
      unit: item.unit || 'PIECE',
      sourceCatalog: selectedType,
      equipmentFamily: determineEquipmentFamily(selectedType),
      status: 'ACTIF' as const,
      isHydrominesCritical: item.criticality === 'CRITIQUE' || item.criticality === 'HAUTE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as unknown as HydrominesCatalogItem;

    try {
      await catalogService.saveHydrominesItem(hydrominesItem);
      toast.success(`✅ ${item.name || item.designation} ajouté au Catalogue Hydromines`);
    } catch (err) {
      toast.error("Échec de l'ajout au catalogue");
    }
  }, []);

  return {
    catalog,
    hydrominesCatalog,
    saveCatalogItem: catalogService.saveCatalogItem,
    deleteCatalogItem: catalogService.deleteCatalogItem,
    saveHydrominesCatalogItem: catalogService.saveHydrominesCatalogItem,
    saveHydrominesItem: catalogService.saveHydrominesItem,
    deleteHydrominesItem: catalogService.deleteHydrominesItem,
    addToHydrominesCatalog,
    buildHierarchy,
  };
}

export default useCatalog;
