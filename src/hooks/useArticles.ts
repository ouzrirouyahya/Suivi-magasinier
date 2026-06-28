import { useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch, setDoc, runTransaction, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useArticlesStore } from '../stores/article.store';
import { useAuthStore } from '../stores/auth.store';
import { useMovementsStore } from '../stores/movement.store';
import { articleService } from '../services/article.service';
import { offlineService } from '../services/offline.service';
import { Article, CatalogItem, DeletionRequest, HydrominesCatalogItem, SiteCode } from '../types';
import { CatalogUsageStats } from '../context/InventoryContext';
import { MASTER_CATALOG } from '../catalogData';
import { serializeFirestoreData, generateId, cleanObject, generateSecureUUID } from '../lib/utils';
import { toast } from 'sonner';

export function useArticles() {
  const {
    articles: rawArticles,
    catalog,
    hydrominesCatalog,
    deletionRequests,
    setArticles,
    setCatalog,
    setHydrominesCatalog,
    setDeletionRequests,
  } = useArticlesStore();

  const movements = useMovementsStore(s => s.mouvements);
  const currentUser = useAuthStore(s => s.currentUser);
  const currentSite = useAuthStore(s => s.currentSite);

  // Hydrate from IndexedDB if offline or first load
  useEffect(() => {
    const hydrate = async () => {
      try {
        const cachedArticles = await offlineService.getCollection<Article>('articles');
        if (cachedArticles && cachedArticles.length > 0 && rawArticles.length === 0) {
          setArticles(cachedArticles);
        }
      } catch (err) {
        console.warn('Error hydrating articles from IndexedDB:', err);
      }
    };
    hydrate();
  }, [setArticles]);

  // Subscribe to articles
  useEffect(() => {
    if (!currentSite) return;

    const q = currentSite === 'ALL'
      ? query(collection(db, 'articles'))
      : query(collection(db, 'articles'), where('site', '==', currentSite));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Article)
        .filter(a => !(a as any).deleted);
      setArticles(list);
      offlineService.saveCollection('articles', list).catch(err => {
        console.warn('Error saving articles to IndexedDB:', err);
      });
    });
    return unsub;
  }, [setArticles, currentSite]);

  // Subscribe to deletion requests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'deletionRequests'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as DeletionRequest);
      setDeletionRequests(list);
    });
    return unsub;
  }, [setDeletionRequests]);

  // Computed: ghostArticles
  const ghostArticles = useMemo(() => {
    const usedArticleIds = new Set<string>();
    movements.forEach(m => {
      if (m.items) {
        m.items.forEach(item => usedArticleIds.add(item.articleId));
      }
    });
    return rawArticles.filter(a => 
      (a.quantity || 0) === 0 && !usedArticleIds.has(a.id)
    );
  }, [rawArticles, movements]);

  // Computed: catalogUsageStats
  const catalogUsageStats: CatalogUsageStats[] = useMemo(() => {
    const hydrominesRefs = new Set(
      (hydrominesCatalog || []).map(h => h.reference.trim().toUpperCase())
    );

    const articlesByRef = new Map<string, Article[]>();
    for (let i = 0; i < rawArticles.length; i++) {
      const a = rawArticles[i];
      if (!a.ref) continue;
      const refNorm = a.ref.trim().toUpperCase();
      let list = articlesByRef.get(refNorm);
      if (!list) {
        list = [];
        articlesByRef.set(refNorm, list);
      }
      list.push(a);
    }

    const movementsByArticleId = new Map<string, any[]>();
    for (let i = 0; i < movements.length; i++) {
      const m = movements[i];
      if (!m.items) continue;
      for (let j = 0; j < m.items.length; j++) {
        const item = m.items[j];
        if (!item.articleId) continue;
        let list = movementsByArticleId.get(item.articleId);
        if (!list) {
          list = [];
          movementsByArticleId.set(item.articleId, list);
        }
        list.push(m);
      }
    }

    return MASTER_CATALOG.map(catalogItem => {
      const refNorm = catalogItem.reference.trim().toUpperCase();
      const matchingArticles = articlesByRef.get(refNorm) || [];
      
      const relevantMovementsSet = new Set<any>();
      for (let i = 0; i < matchingArticles.length; i++) {
        const art = matchingArticles[i];
        const movs = movementsByArticleId.get(art.id);
        if (movs) {
          for (let j = 0; j < movs.length; j++) {
            relevantMovementsSet.add(movs[j]);
          }
        }
      }
      const relevantMovements = Array.from(relevantMovementsSet);

      const matchingArticleIds = new Set<string>();
      for (let i = 0; i < matchingArticles.length; i++) {
        matchingArticleIds.add(matchingArticles[i].id);
      }

      let totalQuantityOut = 0;
      const sitesUsingSet = new Set<string>();
      let maxTime = 0;
      let lastUsedDate: string | null = null;

      for (let i = 0; i < relevantMovements.length; i++) {
        const m = relevantMovements[i];
        
        if (m.site) {
          sitesUsingSet.add(m.site);
        }

        if (m.date) {
          const time = new Date(m.date).getTime();
          if (time > maxTime) {
            maxTime = time;
            lastUsedDate = m.date;
          }
        }

        if (m.type === 'SORTIE' && m.items) {
          for (let j = 0; j < m.items.length; j++) {
            const item = m.items[j];
            if (matchingArticleIds.has(item.articleId)) {
              totalQuantityOut += item.quantity || 0;
            }
          }
        }
      }

      return {
        catalogItem,
        isUsed: relevantMovements.length > 0,
        movementCount: relevantMovements.length,
        totalQuantityOut,
        sitesUsing: Array.from(sitesUsingSet),
        isInHydrominesCatalog: hydrominesRefs.has(refNorm),
        lastUsedDate
      };
    });
  }, [rawArticles, movements, hydrominesCatalog]);

  const saveArticle = useCallback(async (article: Article) => {
    const res = await articleService.saveArticle(article);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  const deleteArticle = useCallback(async (id: string) => {
    const res = await articleService.deleteArticles([id]);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  const deleteArticles = useCallback(async (ids: string[]) => {
    const res = await articleService.deleteArticles(ids);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  const importSpecificCatalogItems = useCallback(async (targetSite: SiteCode, itemsToImport: CatalogItem[]) => {
    if (itemsToImport.length === 0) return { imported: 0, skipped: 0 };
    
    const batch = writeBatch(db);
    let importedCount = 0;

    for (const item of itemsToImport) {
      const artId = generateId();
      const art: Article = {
        id: artId,
        site: targetSite,
        ref: item.reference,
        designation: item.designation,
        type: item.suggestedType,
        category: item.functionalCategory || 'NON_CATEGORISE',
        functionalCategory: item.functionalCategory,
        subCategory: item.subCategory,
        component: item.component,
        subComponent: item.subComponent,
        unit: item.unit || 'PIECE',
        quantity: 0,
        minStock: item.minStock || 5,
        location: 'Non assigné',
        price: item.price || 0,
        active: true,
        notes: item.notes,
        compatibility: item.compatibility,
        criticality: item.criticality || 'MOYENNE'
      };
      batch.set(doc(db, 'articles', artId), cleanObject(art));
      importedCount++;
    }
    await batch.commit();
    return { imported: importedCount, skipped: 0 };
  }, []);

  const importFromHydrominesCatalog = useCallback(async (targetSite: SiteCode, items: HydrominesCatalogItem[]) => {
    if (items.length === 0) return { imported: 0, skipped: 0 };

    const existingRefs = new Set(
      rawArticles.filter(a => a.site === targetSite).map(a => a.ref.trim().toUpperCase())
    );

    const itemsToImport = items.filter(
      item => !existingRefs.has(item.reference.trim().toUpperCase())
    );
    const skippedCount = items.length - itemsToImport.length;

    if (itemsToImport.length === 0) {
      return { imported: 0, skipped: skippedCount };
    }

    const chunkSize = 400;
    let importedCount = 0;

    for (let i = 0; i < itemsToImport.length; i += chunkSize) {
      const chunk = itemsToImport.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const artId = generateId();
        const art: Article = {
          id: artId,
          site: targetSite,
          ref: item.reference,
          designation: item.designation,
          type: ((item as any).suggestedType || 'AUTRE') as any,
          category: (item as any).functionalCategory || 'NON_CATEGORISE',
          functionalCategory: (item as any).functionalCategory,
          subCategory: (item as any).subCategory,
          component: (item as any).component,
          subComponent: (item as any).subComponent,
          unit: item.unit || 'PIECE',
          quantity: (item as any).quantity || 0,
          minStock: (item as any).minStock || 5,
          location: (item as any).location || 'Non assigné',
          price: (item as any).price || 0,
          active: true,
          notes: (item as any).notes,
          compatibility: (item as any).compatibility,
          criticality: (item as any).criticality || 'MOYENNE',
          hydrominesCatalogRefId: item.id
        };
        batch.set(doc(db, 'articles', artId), cleanObject(art));
        importedCount++;
      }

      await batch.commit();
    }

    return { imported: importedCount, skipped: skippedCount };
  }, [rawArticles]);

  const approveDeletionRequest = useCallback(async (requestId: string) => {
    const req = deletionRequests.find(r => r.id === requestId);
    if (!req) {
      toast.error("Demande introuvable.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        for (const id of req.articleIds) {
          transaction.delete(doc(db, 'articles', id));
        }
        transaction.update(doc(db, 'deletionRequests', requestId), { status: 'APPROVED' });

        const logId = generateSecureUUID();
        const logRef = doc(db, 'auditLogs', logId);
        transaction.set(logRef, {
          id: logId,
          timestamp: new Date().toISOString(),
          userEmail: currentUser?.email || 'unknown',
          site: req.site,
          action: 'SUPPRESSION_APPROUVEE',
          details: `Suppression de ${req.articleIds.length} articles : ${req.articleRefs?.join(', ')}`
        });
      });
      toast.success("Demande de suppression approuvée.");
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur lors de l'approbation : ${err.message || err}`);
    }
  }, [deletionRequests, currentUser]);

  const rejectDeletionRequest = useCallback(async (requestId: string) => {
    const req = deletionRequests.find(r => r.id === requestId);
    if (!req) {
      toast.error("Demande introuvable.");
      return;
    }

    await setDoc(doc(db, 'deletionRequests', requestId), { status: 'REJECTED' }, { merge: true });
    toast.success("Demande de suppression rejetée.");
  }, [deletionRequests]);

  return {
    articles: rawArticles,
    ghostArticles,
    catalogUsageStats,
    deletionRequests,
    saveArticle,
    deleteArticle,
    deleteArticles,
    importAllCatalogToArticles: articleService.importAllCatalogToArticles,
    importSpecificCatalogItems,
    importFromHydrominesCatalog,
    approveDeletionRequest,
    rejectDeletionRequest
  };
}
export default useArticles;
