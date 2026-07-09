import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp, db } from '../lib/db';
import { useMovementsStore } from '../stores/movement.store';
import { useAuthStore } from '../stores/auth.store';
import { movementsService } from '../services/movement.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { Mouvement, DistributionEPI, PurchaseRequest, AnomalyReport, Article, Inventaire } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType } from '../lib/utils';
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
      try {
        const cachedMouvements = await offlineService.getCollection<Mouvement>('mouvements');
        if (cachedMouvements && cachedMouvements.length > 0 && mouvements.length === 0) {
          setMouvements(cachedMouvements);
        }
      } catch (err) {
        console.warn('Error hydrating movements from IndexedDB:', err);
      }
      try {
        const cachedInventaires = await offlineService.getCollection<Inventaire>('inventaires');
        if (cachedInventaires && cachedInventaires.length > 0 && inventaires.length === 0) {
          setInventaires(cachedInventaires);
        }
      } catch (err) {
        console.warn('Error hydrating inventaires from IndexedDB:', err);
      }
    };
    hydrate();
  }, [setMouvements, setInventaires]);

  // Subscribe to movements (filter by site and last 90 days for better performance & accuracy)
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Note: This query requires a composite index in Firestore on the 'mouvements' collection:
    // fields: site (Ascending), date (Descending)
    const q = currentSite === 'ALL'
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

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => migrateDocument('mouvements', serializeFirestoreData({ id: doc.id, ...doc.data() })) as Mouvement);
      setMouvements(list);
      offlineService.saveCollection('mouvements', list)
        .then(() => snapshotManager.markCollectionSaved('mouvements'))
        .catch(err => {
          console.warn('Error saving movements to IndexedDB:', err);
        });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mouvements');
    });
    return unsub;
  }, [setMouvements, currentSite, currentUser]);

  // Subscribe to distributions
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    const q = currentSite === 'ALL'
      ? query(collection(db, 'distributions'))
      : query(collection(db, 'distributions'), where('site', '==', currentSite));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as DistributionEPI);
      setDistributions(list);
      offlineService.saveCollection('distributions', list)
        .then(() => snapshotManager.markCollectionSaved('distributions'))
        .catch(err => console.warn('[IDB] distributions save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'distributions');
    });
    return unsub;
  }, [setDistributions, currentSite, currentUser]);

  // Subscribe to purchase requests
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    const q = currentSite === 'ALL'
      ? query(collection(db, 'purchaseRequests'))
      : query(collection(db, 'purchaseRequests'), where('site', '==', currentSite));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as PurchaseRequest);
      setPurchaseRequests(list);
      offlineService.saveCollection('purchaseRequests', list)
        .then(() => snapshotManager.markCollectionSaved('purchaseRequests'))
        .catch(err => console.warn('[IDB] purchaseRequests save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchaseRequests');
    });
    return unsub;
  }, [setPurchaseRequests, currentSite, currentUser]);

  // Subscribe to anomaly reports
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    const q = currentSite === 'ALL'
      ? query(collection(db, 'anomalyReports'))
      : query(collection(db, 'anomalyReports'), where('site', '==', currentSite));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AnomalyReport);
      setAnomalyReports(list);
      offlineService.saveCollection('anomalyReports', list)
        .then(() => snapshotManager.markCollectionSaved('anomalyReports'))
        .catch(err => console.warn('[IDB] anomalyReports save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'anomalyReports');
    });
    return unsub;
  }, [setAnomalyReports, currentSite, currentUser]);

  // Subscribe to inventaires
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    const q = currentSite === 'ALL'
      ? query(collection(db, 'inventaires'))
      : query(collection(db, 'inventaires'), where('site', '==', currentSite));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Inventaire);
      setInventaires(list);
      offlineService.saveCollection('inventaires', list)
        .then(() => snapshotManager.markCollectionSaved('inventaires'))
        .catch(err => console.warn('[IDB] inventaires save error:', err));
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
      console.warn('[useMovements] Transaction failed, queuing offline fallback', err);
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
      console.warn('[useMovements] Add PR failed, queuing offline fallback', err);
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
      console.warn('[useMovements] Update PR status failed, queuing offline fallback', err);
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
      console.warn('[useMovements] Save inventaire failed, queuing offline fallback', err);
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
  };
}
export default useMovements;
