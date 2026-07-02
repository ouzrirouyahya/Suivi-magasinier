import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTransfersStore } from '../stores/transfer.store';
import { useAuthStore } from '../stores/auth.store';
import { transfersService } from '../services/transfer.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { Transfert, MouvementItem } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType } from '../lib/utils';
import { offlineQueue } from '../lib/offlineQueue';
import { useSystemStore } from '../stores/system.store';
import { toast } from 'sonner';

export function useTransfers() {
  const { transferts, setTransferts } = useTransfersStore();
  const currentSite = useAuthStore(s => s.currentSite);
  const currentUser = useAuthStore(s => s.currentUser);

  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    const q = currentSite === 'ALL'
      ? query(collection(db, 'transferts'))
      : query(
          collection(db, 'transferts'),
          or(
            where('sourceSite', '==', currentSite),
            where('targetSite', '==', currentSite)
          )
        );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Transfert);
      setTransferts(list);
      offlineService.saveCollection('transferts', list)
        .then(() => snapshotManager.markCollectionSaved('transferts'))
        .catch(err => console.warn('[IDB] transferts save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transferts');
    });
    return unsub;
  }, [setTransferts, currentSite, currentUser]);

  const addTransfert = useCallback(async (t: Transfert) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await transfersService.addTransfert(t, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'tx_' + crypto.randomUUID();
      const payload = { intentId, type: 'addTransfert', payload: t };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'addTransfert',
        payload: t,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : bon de transfert enregistré localement.");
      return;
    }

    try {
      const res = await transfersService.addTransfert(t);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      console.warn('[useTransfers] Add Transfert failed, queuing offline fallback', err);
      const res = await transfersService.addTransfert(t, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'tx_' + crypto.randomUUID();
      const payload = { intentId, type: 'addTransfert', payload: t };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'addTransfert',
        payload: t,
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : bon de transfert enregistré localement.");
    }
  }, []);

  const completeTransfert = useCallback(async (
    id: string,
    recepteur: string,
    receivedItems?: MouvementItem[],
    disputeReason?: string
  ) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await transfersService.completeTransfert(id, recepteur, receivedItems, disputeReason, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'ctx_' + crypto.randomUUID();
      const payload = { intentId, type: 'completeTransfert', payload: { id, recepteur, receivedItems, disputeReason } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'completeTransfert',
        payload: { id, recepteur, receivedItems, disputeReason },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.info("Mode hors-ligne : réception enregistrée localement.");
      return;
    }

    try {
      const res = await transfersService.completeTransfert(id, recepteur, receivedItems, disputeReason);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      console.warn('[useTransfers] Complete Transfert failed, queuing offline fallback', err);
      const res = await transfersService.completeTransfert(id, recepteur, receivedItems, disputeReason, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'ctx_' + crypto.randomUUID();
      const payload = { intentId, type: 'completeTransfert', payload: { id, recepteur, receivedItems, disputeReason } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'completeTransfert',
        payload: { id, recepteur, receivedItems, disputeReason },
        retryCount: 0,
        maxRetries: 3
      }]);
      
      toast.warning("Échec réseau : réception enregistrée localement.");
    }
  }, []);

  const approveTransfert = useCallback(async (id: string, approver: string) => {
    const res = await transfersService.approveTransfert(id, approver);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  const closeTransfert = useCallback(async (id: string, reason: string) => {
    const res = await transfersService.closeTransfert(id, reason);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  return {
    transferts,
    addTransfert,
    completeTransfert,
    approveTransfert,
    closeTransfert,
  };
}
export default useTransfers;
