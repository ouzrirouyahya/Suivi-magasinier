import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp, limit, db } from '../lib/db';
import { useMovementsStore } from '../stores/movement.store';
import { useAuthStore } from '../stores/auth.store';
import { movementsService } from '../services/movement.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { Mouvement, DistributionEPI, PurchaseRequest, AnomalyReport, Article, Inventaire, compareDates } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType, logger } from '../lib/utils';
import { migrateDocument } from '../lib/migrations';
import { calculatePriceUpdates } from '../context/InventoryContext';
import { offlineQueue } from '../lib/offlineQueue';
import { useSystemStore } from '../stores/system.store';
import { toast } from 'sonner';

export function useMovements() {
  const currentSite = useAuthStore(s => s.currentSite);
  const currentUser = useAuthStore(s => s.currentUser);
  const {
    mouvements,
    distributions,
    purchaseRequests,
    anomalyReports,
    inventaires,
    setMouvements,
    setDistributions,
    setPurchaseRequests,
    setAnomalyReports,
    setInventaires,
  } = useMovementsStore();

  // Hydrate from IndexedDB on load/offline
  useEffect(() => {
    const hydrate = async () => {
      if (!currentSite) return; // attendre que le site soit connu
      try {
        const cachedMouvements = await offlineService.getCollection<Mouvement>('mouvements');
        if (cachedMouvements && cachedMouvements.length > 0) {
          // Filtrer pour ne garder QUE les mouvements du chantier actif
          const filtered = currentSite === 'ALL'
            ? cachedMouvements
            : cachedMouvements.filter(m => m.site === currentSite);

          // Si nous avons trouvé des mouvements d'un autre chantier, on nettoie le cache local (sécurité anti-leak)
          if (filtered.length !== cachedMouvements.length) {
            logger.info("[Storage Hardening] Nettoyage des mouvements inter-chantiers du cache local...");
            await offlineService.saveCollection('mouvements', filtered);
          }

          if (filtered.length > 0 && mouvements.length === 0) {
            setMouvements(filtered);
          }
        }
      } catch (err) {
        logger.warn('Error hydrating movements from IndexedDB:', err);
      }
      try {
        const cachedInventaires = await offlineService.getCollection<Inventaire>('inventaires');
        if (cachedInventaires && cachedInventaires.length > 0) {
          // Filtrer pour ne garder QUE les inventaires du chantier actif
          const filtered = currentSite === 'ALL'
            ? cachedInventaires
            : cachedInventaires.filter(i => i.site === currentSite);

          // Si nous avons trouvé des inventaires d'un autre chantier, on nettoie le cache local (sécurité anti-leak)
          if (filtered.length !== cachedInventaires.length) {
            logger.info("[Storage Hardening] Nettoyage des inventaires inter-chantiers du cache local...");
            await offlineService.saveCollection('inventaires', filtered);
          }

          if (filtered.length > 0 && inventaires.length === 0) {
            setInventaires(filtered);
          }
        }
      } catch (err) {
        logger.warn('Error hydrating inventaires from IndexedDB:', err);
      }
    };
    hydrate();
  }, [setMouvements, setInventaires, currentSite, mouvements.length, inventaires.length]);

  // Subscribe to movements (filter by site and last 90 days, merged with any pending superadmin approvals)
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setMouvements([]);

    let standardList: Mouvement[] = [];
    let pendingList: Mouvement[] = [];

    const updateStore = () => {
      const merged = [...standardList];
      pendingList.forEach(p => {
        if (!merged.some(m => m.id === p.id)) {
          merged.push(p);
        }
      });
      // Sort descending by date
      merged.sort((a, b) => compareDates(b.date, a.date));
      setMouvements(merged);

      offlineService.saveCollection('mouvements', merged)
        .then(() => snapshotManager.markCollectionSaved('mouvements'))
        .catch(err => {
          logger.warn('Error saving movements to IndexedDB:', err);
        });
    };

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const qStd = currentSite === 'ALL'
      ? query(
          collection(db, 'mouvements'),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          orderBy('date', 'desc')
        )
      : query(
          collection(db, 'mouvements'),
          where('site', '==', currentSite),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          orderBy('date', 'desc')
        );

    const unsubStd = onSnapshot(qStd, (snap) => {
      standardList = snap.docs.map(doc => migrateDocument('mouvements', serializeFirestoreData({ id: doc.id, ...doc.data() })) as Mouvement);
      updateStore();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mouvements');
    });

    const qPending = currentSite === 'ALL'
      ? query(
          collection(db, 'mouvements'),
          where('status', '==', 'EN_ATTENTE_APPROBATION')
        )
      : query(
          collection(db, 'mouvements'),
          where('site', '==', currentSite),
          where('status', '==', 'EN_ATTENTE_APPROBATION')
        );

    const unsubPending = onSnapshot(qPending, (snap) => {
      pendingList = snap.docs.map(doc => migrateDocument('mouvements', serializeFirestoreData({ id: doc.id, ...doc.data() })) as Mouvement);
      updateStore();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mouvements_pending');
    });

    return () => {
      unsubStd();
      unsubPending();
    };
  }, [setMouvements, currentSite, currentUser]);

  // Subscribe to distributions
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setDistributions([]);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const q = currentSite === 'ALL'
      ? query(
          collection(db, 'distributions'),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        )
      : query(
          collection(db, 'distributions'),
          where('site', '==', currentSite),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as DistributionEPI);
      setDistributions(list);
      offlineService.saveCollection('distributions', list)
        .then(() => snapshotManager.markCollectionSaved('distributions'))
        .catch(err => logger.warn('[IDB] distributions save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'distributions');
    });
    return unsub;
  }, [setDistributions, currentSite, currentUser]);

  // Subscribe to purchase requests
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setPurchaseRequests([]);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const q = currentSite === 'ALL'
      ? query(
          collection(db, 'purchaseRequests'),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        )
      : query(
          collection(db, 'purchaseRequests'),
          where('site', '==', currentSite),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as PurchaseRequest);
      setPurchaseRequests(list);
      offlineService.saveCollection('purchaseRequests', list)
        .then(() => snapshotManager.markCollectionSaved('purchaseRequests'))
        .catch(err => logger.warn('[IDB] purchaseRequests save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchaseRequests');
    });
    return unsub;
  }, [setPurchaseRequests, currentSite, currentUser]);

  // Subscribe to anomaly reports
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setAnomalyReports([]);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const q = currentSite === 'ALL'
      ? query(
          collection(db, 'anomalyReports'),
          where('timestamp', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        )
      : query(
          collection(db, 'anomalyReports'),
          where('site', '==', currentSite),
          where('timestamp', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AnomalyReport);
      setAnomalyReports(list);
      offlineService.saveCollection('anomalyReports', list)
        .then(() => snapshotManager.markCollectionSaved('anomalyReports'))
        .catch(err => logger.warn('[IDB] anomalyReports save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'anomalyReports');
    });
    return unsub;
  }, [setAnomalyReports, currentSite, currentUser]);

  // Subscribe to inventaires
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setInventaires([]);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const q = currentSite === 'ALL'
      ? query(
          collection(db, 'inventaires'),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        )
      : query(
          collection(db, 'inventaires'),
          where('site', '==', currentSite),
          where('date', '>=', ninetyDaysAgo.toISOString()),
          limit(500)
        );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Inventaire);
      setInventaires(list);
      offlineService.saveCollection('inventaires', list)
        .then(() => snapshotManager.markCollectionSaved('inventaires'))
        .catch(err => logger.warn('[IDB] inventaires save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventaires');
    });
    return unsub;
  }, [setInventaires, currentSite, currentUser]);

  const addMouvement = useCallback(async (mouvement: Mouvement) => {
    // Injecter createdBy depuis l'utilisateur connecté
    const enrichedMouvement: Mouvement = {
      ...mouvement,
      createdBy: currentUser?.email || mouvement.createdBy || 'unknown'
    };

    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await movementsService.addMouvement(enrichedMouvement, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'mvt_' + crypto.randomUUID();
      const payload = { intentId, type: 'addMouvement', payload: enrichedMouvement };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'addMouvement',
        payload: enrichedMouvement,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : mouvement enregistré localement. Il sera synchronisé dès le retour du réseau.");
      return;
    }

    try {
      const res = await movementsService.addMouvement(enrichedMouvement);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      const isBusinessError = errorMsg.includes('PERIODE_CLOTUREE') || 
                              errorMsg.includes('Violation des règles') || 
                              errorMsg.includes('Stock insuffisant') || 
                              errorMsg.includes('MOUVEMENT_DEJA_TRAITE') ||
                              errorMsg.includes('ARTICLE_INTROUVABLE');
      if (isBusinessError) {
        toast.error(`Erreur de mouvement : ${errorMsg}`);
        throw err;
      }

      logger.warn('[useMovements] Transaction failed, queuing offline fallback', err);
      const res = await movementsService.addMouvement(enrichedMouvement, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'mvt_' + crypto.randomUUID();
      const payload = { intentId, type: 'addMouvement', payload: enrichedMouvement };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'addMouvement',
        payload: enrichedMouvement,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : mouvement enregistré localement pour synchronisation future.");
    }
  }, [currentUser]);

  const addPurchaseRequest = useCallback(async (pr: PurchaseRequest) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await movementsService.addPurchaseRequest(pr, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'pr_' + crypto.randomUUID();
      const payload = { intentId, type: 'addPurchaseRequest', payload: pr };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'addPurchaseRequest',
        payload: pr,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : demande d'achat enregistrée localement.");
      return { success: true };
    }

    try {
      const res = await movementsService.addPurchaseRequest(pr);
      if (!res.success) throw new Error(res.error);
      return res;
    } catch (err: any) {
      logger.warn('[useMovements] Add PR failed, queuing offline fallback', err);
      const res = await movementsService.addPurchaseRequest(pr, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'pr_' + crypto.randomUUID();
      const payload = { intentId, type: 'addPurchaseRequest', payload: pr };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'addPurchaseRequest',
        payload: pr,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : demande d'achat enregistrée localement.");
      return { success: true };
    }
  }, [currentUser]);

  const updatePRStatus = useCallback(async (id: string, status: any) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await movementsService.updatePRStatus(id, status, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'upr_' + crypto.randomUUID();
      const payload = { intentId, type: 'updatePRStatus', payload: { id, status } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'updatePRStatus',
        payload: { id, status },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : changement de statut enregistré localement.");
      return { success: true };
    }

    try {
      const res = await movementsService.updatePRStatus(id, status);
      if (!res.success) throw new Error(res.error);
      return res;
    } catch (err: any) {
      logger.warn('[useMovements] Update PR status failed, queuing offline fallback', err);
      const res = await movementsService.updatePRStatus(id, status, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'upr_' + crypto.randomUUID();
      const payload = { intentId, type: 'updatePRStatus', payload: { id, status } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'updatePRStatus',
        payload: { id, status },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : changement de statut enregistré localement.");
      return { success: true };
    }
  }, []);

  const saveInventaire = useCallback(async (inv: Inventaire) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await movementsService.saveInventaire(inv, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'inv_' + crypto.randomUUID();
      const payload = { intentId, type: 'saveInventaire', payload: inv };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'saveInventaire',
        payload: inv,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : inventaire enregistré localement. Il sera synchronisé dès le retour du réseau.");
      return;
    }

    try {
      const res = await movementsService.saveInventaire(inv);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      const isBusinessError = errorMsg.includes('PERIODE_CLOTUREE') || 
                              errorMsg.includes('Violation des règles') || 
                              errorMsg.includes('Stock insuffisant') || 
                              errorMsg.includes('ARTICLE_INTROUVABLE');
      if (isBusinessError) {
        toast.error(`Erreur d'inventaire : ${errorMsg}`);
        throw err;
      }

      logger.warn('[useMovements] Save inventaire failed, queuing offline fallback', err);
      const res = await movementsService.saveInventaire(inv, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'inv_' + crypto.randomUUID();
      const payload = { intentId, type: 'saveInventaire', payload: inv };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'saveInventaire',
        payload: inv,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : inventaire enregistré localement pour synchronisation future.");
    }
  }, []);

  const approveMouvement = useCallback(async (movementId: string) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      throw new Error("Seul le SUPER_ADMIN peut approuver un bon rétroactif.");
    }
    const res = await movementsService.approveMouvement(movementId, currentUser.email);
    if (!res.success) throw new Error(res.error);
    toast.success("Mouvement approuvé avec succès et stock mis à jour !");
  }, [currentUser]);

  const rejectMouvement = useCallback(async (movementId: string) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      throw new Error("Seul le SUPER_ADMIN peut rejeter un bon rétroactif.");
    }
    const res = await movementsService.rejectMouvement(movementId, currentUser.email);
    if (!res.success) throw new Error(res.error);
    toast.success("Mouvement rejeté avec succès.");
  }, [currentUser]);

  return {
    mouvements,
    distributions,
    purchaseRequests,
    anomalyReports,
    inventaires,
    addMouvement,
    calculatePriceUpdates, // Preserve function reference
    addPurchaseRequest,
    updatePRStatus,
    saveInventaire,
    approveMouvement,
    rejectMouvement,
  };
}
export default useMovements;
