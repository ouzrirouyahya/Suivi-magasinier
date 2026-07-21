import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, db } from '../lib/db';
import { useArticlesStore } from '../stores/article.store';
import { catalogService } from '../services/catalog.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { CatalogItem, HydrominesCatalogItem, EquipmentFamily } from '../types';
import { serializeFirestoreData, generateId, handleFirestoreError, OperationType, logger } from '../lib/utils';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'sonner';

export function useCatalog() {
  const currentUser = useAuthStore(s => s.currentUser);
  const {
    catalog,
    hydrominesCatalog,
    setCatalog,
    setHydrominesCatalog
  } = useArticlesStore();

  // Subscribe to master catalog entries in Firestore
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const unsub = onSnapshot(collection(db, 'catalog'), (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as CatalogItem)
        .filter(item => !(item as any).deleted);
      setCatalog(list);
      offlineService.saveCollection('catalog', list)
        .then(() => snapshotManager.markCollectionSaved('catalog'))
        .catch(err => logger.warn('[IDB] catalog save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'catalog');
    });
    return unsub;
  }, [setCatalog, currentUser]);

  // Subscribe to hydromines catalog
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const unsub = onSnapshot(collection(db, 'hydromines_catalog'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as HydrominesCatalogItem);
      setHydrominesCatalog(list);
      offlineService.saveCollection('hydrominesCatalog', list)
        .then(() => snapshotManager.markCollectionSaved('hydrominesCatalog'))
        .catch(err => logger.warn('[IDB] hydrominesCatalog save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hydromines_catalog');
    });
    return unsub;
  }, [setHydrominesCatalog, currentUser]);

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
  };
}

export default useCatalog;
