import { useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch, setDoc, runTransaction, query, where, db } from '../lib/db';
import { useArticlesStore } from '../stores/article.store';
import { useAuthStore } from '../stores/auth.store';
import { useMovementsStore } from '../stores/movement.store';
import { articleService } from '../services/article.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { Article, CatalogItem, DeletionRequest, HydrominesCatalogItem, SiteCode } from '../types';
import { serializeFirestoreData, generateId, cleanObject, generateSecureUUID, handleFirestoreError, OperationType, logger } from '../lib/utils';
import { migrateDocument } from '../lib/migrations';
import { toast } from 'sonner';
import { offlineQueue } from '../lib/offlineQueue';
import { useSystemStore } from '../stores/system.store';

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
      if (!currentSite) return; // attendre que le site soit connu
      try {
        const cachedArticles = await offlineService.getCollection<Article>('articles');
        if (cachedArticles && cachedArticles.length > 0) {
          // Filtrer pour ne garder QUE les articles du chantier actif,
          // afin d'éviter d'afficher des données d'un autre chantier 
          // si la tablette a servi ailleurs auparavant
          const filtered = currentSite === 'ALL'
            ? cachedArticles
            : cachedArticles.filter(a => a.site === currentSite);

          // Si nous avons trouvé des articles d'un autre chantier, on les nettoie du cache local (sécurité anti-leak)
          if (filtered.length !== cachedArticles.length) {
            logger.info("[Storage Hardening] Nettoyage des articles inter-chantiers du cache local...");
            await offlineService.saveCollection('articles', filtered);
          }

          if (filtered.length > 0 && rawArticles.length === 0) {
            setArticles(filtered);
          }
        }
      } catch (err) {
        logger.warn('Error hydrating articles from IndexedDB:', err);
      }
    };
    hydrate();
  }, [setArticles, currentSite, rawArticles.length]);

  // Subscribe to articles
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setArticles([]);

    const q = currentSite === 'ALL'
      ? query(collection(db, 'articles'))
      : query(collection(db, 'articles'), where('site', '==', currentSite));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(doc => migrateDocument('articles', serializeFirestoreData({ id: doc.id, ...doc.data() })) as Article)
        .filter(a => !(a as any).deleted);
      setArticles(list);
      offlineService.saveCollection('articles', list)
        .then(() => snapshotManager.markCollectionSaved('articles'))
        .catch(err => {
          logger.warn('Error saving articles to IndexedDB:', err);
        });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });
    return unsub;
  }, [setArticles, currentSite, currentUser]);

  // Subscribe to deletion requests
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setDeletionRequests([]);

    const q = currentSite === 'ALL'
      ? query(collection(db, 'deletionRequests'))
      : query(
          collection(db, 'deletionRequests'),
          where('site', '==', currentSite)
        );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as DeletionRequest);
      setDeletionRequests(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deletionRequests');
    });
    return unsub;
  }, [setDeletionRequests, currentUser, currentSite]);

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

  const saveArticle = useCallback(async (article: Article) => {
    // Vérifier l'unicité de la référence sur le site
    const existingArticle = (rawArticles || []).find(a => a.id === article.id);

    if (existingArticle) {
      // Dans updateArticle() logic:
      if (article.ref && article.ref !== existingArticle.ref) {
        const conflict = (rawArticles || []).find(a => 
          a.id !== article.id &&
          a.ref.trim().toLowerCase() === article.ref.trim().toLowerCase() &&
          a.site === (article.site || existingArticle.site) &&
          a.active !== false
        );
        if (conflict) {
          throw new Error(`La référence "${article.ref}" est déjà utilisée par l'article "${conflict.designation}".`);
        }
      }
    } else {
      // Dans addArticle() logic:
      const existingWithSameRef = (rawArticles || []).find(a => 
        a.ref.trim().toLowerCase() === article.ref.trim().toLowerCase() &&
        a.site === article.site &&
        a.active !== false
      );

      if (existingWithSameRef) {
        throw new Error(
          `La référence "${article.ref}" existe déjà sur le chantier ${article.site} ` +
          `(Article : "${existingWithSameRef.designation}", ID : ${existingWithSameRef.id}). ` +
          `Utilisez une référence différente ou mettez à jour l'article existant.`
        );
      }
    }

    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await articleService.saveArticle(article, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'art_' + crypto.randomUUID();
      const payload = { intentId, type: 'saveArticle', payload: article };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'saveArticle',
        payload: article,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : article sauvegardé localement.");
      return;
    }

    try {
      const res = await articleService.saveArticle(article);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      logger.warn('[useArticles] Save Article failed, queuing offline fallback', err);
      const res = await articleService.saveArticle(article, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'art_' + crypto.randomUUID();
      const payload = { intentId, type: 'saveArticle', payload: article };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'saveArticle',
        payload: article,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : article sauvegardé localement.");
    }
  }, [rawArticles]);

  const deleteArticle = useCallback(async (id: string) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await articleService.deleteArticles([id], true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'del_art_' + crypto.randomUUID();
      const payload = { intentId, type: 'deleteArticles', payload: { ids: [id] } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'deleteArticles',
        payload: { ids: [id] },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : demande de suppression enregistrée localement.");
      return;
    }

    try {
      const res = await articleService.deleteArticles([id]);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      logger.warn('[useArticles] Delete Article failed, queuing offline fallback', err);
      const res = await articleService.deleteArticles([id], true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'del_art_' + crypto.randomUUID();
      const payload = { intentId, type: 'deleteArticles', payload: { ids: [id] } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'deleteArticles',
        payload: { ids: [id] },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : suppression enregistrée localement.");
    }
  }, []);

  const deleteArticles = useCallback(async (ids: string[]) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await articleService.deleteArticles(ids, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'del_arts_' + crypto.randomUUID();
      const payload = { intentId, type: 'deleteArticles', payload: { ids } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'deleteArticles',
        payload: { ids },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : suppression de groupe enregistrée localement.");
      return;
    }

    try {
      const res = await articleService.deleteArticles(ids);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      logger.warn('[useArticles] Delete Articles failed, queuing offline fallback', err);
      const res = await articleService.deleteArticles(ids, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'del_arts_' + crypto.randomUUID();
      const payload = { intentId, type: 'deleteArticles', payload: { ids } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'deleteArticles',
        payload: { ids },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : suppressions enregistrées localement.");
    }
  }, []);

  const importSpecificCatalogItems = useCallback(async (targetSite: SiteCode, itemsToImport: CatalogItem[]) => {
    if (itemsToImport.length === 0) return { imported: 0, skipped: 0 };
    
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
    }

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

  const requestDeletion = useCallback(async (articleId: string, reason: string) => {
    const article = rawArticles.find(a => a.id === articleId);
    if (!article) {
      toast.error("Article introuvable.");
      return { success: false };
    }
    try {
      const requestId = generateSecureUUID();
      await setDoc(doc(db, 'deletionRequests', requestId), {
        id: requestId,
        articleIds: [articleId],
        articleRefs: [article.ref],
        articleDesignations: [article.designation],
        site: article.site,
        requestedBy: currentUser?.email || 'unknown',
        requestedAt: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
        reason
      });
      toast.success("Demande de suppression envoyée pour validation.");
      return { success: true };
    } catch (err: any) {
      logger.error('[requestDeletion] Erreur:', err);
      toast.error(`Erreur : ${err.message || err}`);
      return { success: false };
    }
  }, [rawArticles, currentUser]);

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
      logger.error(err);
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

  const updateArticlePrice = useCallback(async (articleId: string, newPrice: number, reason: string, userRole: string, changedByEmail: string, changedByName: string) => {
    return articleService.updateArticlePrice(articleId, newPrice, reason, userRole, changedByEmail, changedByName);
  }, []);

  const addArticle = saveArticle;
  const updateArticle = saveArticle;

  return {
    articles: rawArticles,
    rawArticles,
    catalogItems: catalog,
    hydrominesCatalog,
    ghostArticles,
    deletionRequests,
    saveArticle,
    addArticle,
    updateArticle,
    updateArticlePrice,
    deleteArticle,
    deleteArticles,
    requestDeletion,
    importAllCatalogToArticles: articleService.importAllCatalogToArticles,
    importSpecificCatalogItems,
    importFromHydrominesCatalog,
    approveDeletionRequest,
    rejectDeletionRequest
  };
}
export default useArticles;
