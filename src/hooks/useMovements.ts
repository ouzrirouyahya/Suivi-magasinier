import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMovementsStore } from '../stores/movement.store';
import { useAuthStore } from '../stores/auth.store';
import { movementsService } from '../services/movement.service';
import { offlineService } from '../services/offline.service';
import { Mouvement, DistributionEPI, PurchaseRequest, AnomalyReport, Article } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType } from '../lib/utils';
import { calculatePriceUpdates } from '../context/InventoryContext';

export function useMovements() {
  const currentSite = useAuthStore(s => s.currentSite);
  const currentUser = useAuthStore(s => s.currentUser);
  const {
    mouvements,
    distributions,
    purchaseRequests,
    anomalyReports,
    setMouvements,
    setDistributions,
    setPurchaseRequests,
    setAnomalyReports,
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
    };
    hydrate();
  }, [setMouvements]);

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
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Mouvement);
      setMouvements(list);
      offlineService.saveCollection('mouvements', list).catch(err => {
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'anomalyReports');
    });
    return unsub;
  }, [setAnomalyReports, currentSite, currentUser]);

  const addMouvement = useCallback(async (mouvement: Mouvement) => {
    const res = await movementsService.addMouvement(mouvement);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  const addPurchaseRequest = useCallback(async (pr: PurchaseRequest) => {
    const res = await movementsService.addPurchaseRequest(pr);
    if (!res.success) {
      throw new Error(res.error);
    }
    return res;
  }, []);

  const updatePRStatus = useCallback(async (id: string, status: any) => {
    const res = await movementsService.updatePRStatus(id, status);
    if (!res.success) {
      throw new Error(res.error);
    }
    return res;
  }, []);

  return {
    mouvements,
    distributions,
    purchaseRequests,
    anomalyReports,
    addMouvement,
    calculatePriceUpdates, // Preserve function reference
    addPurchaseRequest,
    updatePRStatus,
  };
}
export default useMovements;
