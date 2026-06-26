import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMovementsStore } from '../stores/movement.store';
import { movementsService } from '../services/movement.service';
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

  // Subscribe to movements (limit to last 500 for low network payload)
  useEffect(() => {
    const q = query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Mouvement);
      setMouvements(list);
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
    await movementsService.addMouvement(mouvement);
  }, []);

  return {
    mouvements,
    distributions,
    purchaseRequests,
    anomalyReports,
    addMouvement,
    calculatePriceUpdates, // Preserve function reference
    addPurchaseRequest: movementsService.addPurchaseRequest,
    updatePRStatus: movementsService.updatePRStatus,
  };
}
export default useMovements;
