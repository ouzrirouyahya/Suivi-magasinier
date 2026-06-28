import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMovementsStore } from '../stores/movement.store';
import { movementsService } from '../services/movement.service';
import { offlineService } from '../services/offline.service';
import { Mouvement, DistributionEPI, PurchaseRequest, AnomalyReport, Article } from '../types';
import { serializeFirestoreData } from '../lib/utils';
import { calculatePriceUpdates } from '../context/InventoryContext';

export function useMovements() {
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

  // Subscribe to movements (limit to last 500 for low network payload)
  useEffect(() => {
    const q = query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Mouvement);
      setMouvements(list);
      offlineService.saveCollection('mouvements', list).catch(err => {
        console.warn('Error saving movements to IndexedDB:', err);
      });
    });
    return unsub;
  }, [setMouvements]);

  // Subscribe to distributions
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'distributions'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as DistributionEPI);
      setDistributions(list);
    });
    return unsub;
  }, [setDistributions]);

  // Subscribe to purchase requests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'purchaseRequests'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as PurchaseRequest);
      setPurchaseRequests(list);
    });
    return unsub;
  }, [setPurchaseRequests]);

  // Subscribe to anomaly reports
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'anomalyReports'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AnomalyReport);
      setAnomalyReports(list);
    });
    return unsub;
  }, [setAnomalyReports]);

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
