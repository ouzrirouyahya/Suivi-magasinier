import { useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useArticlesStore } from '../stores/article.store';
import { catalogService } from '../services/catalog.service';
import { CatalogItem, HydrominesCatalogItem } from '../types';
import { serializeFirestoreData } from '../lib/utils';

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

  return {
    catalog,
    hydrominesCatalog,
    saveCatalogItem: catalogService.saveCatalogItem,
    deleteCatalogItem: catalogService.deleteCatalogItem,
    saveHydrominesCatalogItem: catalogService.saveHydrominesCatalogItem,
  };
}
export default useCatalog;
