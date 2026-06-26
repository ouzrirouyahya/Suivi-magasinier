import { useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useArticlesStore } from '../stores/article.store';
import { catalogService } from '../services/catalog.service';
import { CatalogItem, HydrominesCatalogItem } from '../types';
import { serializeFirestoreData, generateId } from '../lib/utils';
import { toast } from 'sonner';

export function buildHierarchy(catalog: CatalogItem[]) {
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

    const determineEquipmentFamily = (type: string): 'ST2G' | 'ST2D' | 'T23' | 'T28' | 'EPI' | 'CONSOMMABLES' | 'AUTRE' => {
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
