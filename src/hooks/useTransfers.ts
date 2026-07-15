import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, or, db, doc, deleteDoc } from '../lib/db';
import { useTransfersStore } from '../stores/transfer.store';
import { useAuthStore } from '../stores/auth.store';
import { useArticlesStore } from '../modules/articles/articles.store';
import { transfersService } from '../services/transfer.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { Transfert, MouvementItem } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType, logger } from '../lib/utils';
import { migrateDocument } from '../lib/migrations';
import { offlineQueue } from '../lib/offlineQueue';
import { useSystemStore } from '../stores/system.store';
import { toast } from 'sonner';

export function useTransfers() {
  const { transferts, setTransferts } = useTransfersStore();
  const currentSite = useAuthStore(s => s.currentSite);
  const currentUser = useAuthStore(s => s.currentUser);

  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    setTransferts([]);

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
      const list = snap.docs.map(doc => migrateDocument('transferts', serializeFirestoreData({ id: doc.id, ...doc.data() })) as Transfert);
      setTransferts(list);
      offlineService.saveCollection('transferts', list)
        .then(() => snapshotManager.markCollectionSaved('transferts'))
        .catch(err => logger.warn('[IDB] transferts save error:', err));
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
      const errorMsg = err.message || String(err);
      const isBusinessError = errorMsg.includes('PERIODE_CLOTUREE') || 
                              errorMsg.includes('Violation des règles') || 
                              errorMsg.includes('TRANSFERT_DEJA') || 
                              errorMsg.includes('Stock insuffisant') || 
                              errorMsg.includes('ARTICLE_INTROUVABLE');
      if (isBusinessError) {
        toast.error(`Erreur de transfert : ${errorMsg}`);
        throw err;
      }

      logger.warn('[useTransfers] Add Transfert failed, queuing offline fallback', err);
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
      const errorMsg = err.message || String(err);
      const isBusinessError = errorMsg.includes('PERIODE_CLOTUREE') || 
                              errorMsg.includes('Violation des règles') || 
                              errorMsg.includes('TRANSFERT_DEJA') || 
                              errorMsg.includes('Stock insuffisant') || 
                              errorMsg.includes('ARTICLE_INTROUVABLE');
      if (isBusinessError) {
        toast.error(`Erreur de réception : ${errorMsg}`);
        throw err;
      }

      logger.warn('[useTransfers] Complete Transfert failed, queuing offline fallback', err);
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

  const approveTransfert = useCallback(async (id: string, approver: string, comment?: string) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await transfersService.approveTransfert(id, approver, comment, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'app_' + crypto.randomUUID();
      const payload = { intentId, type: 'approveTransfert', payload: { id, approver, comment } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'approveTransfert',
        payload: { id, approver, comment },
        retryCount: 0,
        maxRetries: 3
      }]);
      toast.info("Mode hors-ligne : approbation enregistrée localement.");
      return;
    }

    try {
      const res = await transfersService.approveTransfert(id, approver, comment);
      if (!res.success) throw new Error(res.error);
      toast.success("Transfert approuvé avec succès.");
    } catch (err: any) {
      toast.error(`Erreur d'approbation : ${err.message}`);
    }
  }, []);

  const expedierTransfert = useCallback(async (id: string, expediteur: string, comment?: string) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await transfersService.expedierTransfert(id, expediteur, comment, true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'exp_' + crypto.randomUUID();
      const payload = { intentId, type: 'expedierTransfert', payload: { id, expediteur, comment } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'expedierTransfert',
        payload: { id, expediteur, comment },
        retryCount: 0,
        maxRetries: 3
      }]);
      toast.info("Mode hors-ligne : expédition enregistrée localement.");
      return;
    }

    try {
      const res = await transfersService.expedierTransfert(id, expediteur, comment);
      if (!res.success) throw new Error(res.error);
      toast.success("Transfert expédié avec succès.");
    } catch (err: any) {
      toast.error(`Erreur d'expédition : ${err.message}`);
    }
  }, []);

  const receptionnerTransfert = useCallback(async (
    id: string,
    recepteur: string,
    receivedItems?: MouvementItem[],
    disputeReason?: string,
    comment?: string
  ) => {
    await completeTransfert(id, recepteur, receivedItems, disputeReason);
  }, [completeTransfert]);

  const accepterEtCloturerTransfert = useCallback(async (id: string, accountant: string, comment?: string) => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const res = await transfersService.closeTransfert(id, comment || 'Clôture du transfert', true);
      if (!res.success) throw new Error(res.error);
      
      const intentId = 'cls_' + crypto.randomUUID();
      const payload = { intentId, type: 'closeTransfert', payload: { id, comment: comment || 'Clôture' } };
      await offlineQueue.add(payload);
      
      const { retryQueue, setRetryQueue } = useSystemStore.getState();
      setRetryQueue([...retryQueue, {
        intentId,
        type: 'closeTransfert',
        payload: { id, comment: comment || 'Clôture' },
        retryCount: 0,
        maxRetries: 3
      }]);
      toast.info("Mode hors-ligne : clôture enregistrée localement.");
      return;
    }

    try {
      const res = await transfersService.closeTransfert(id, comment || 'Clôture du transfert');
      if (!res.success) throw new Error(res.error);
      toast.success("Transfert clôturé avec succès.");
    } catch (err: any) {
      toast.error(`Erreur de clôture : ${err.message}`);
    }
  }, []);

  const deleteTransfert = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transferts', id));
      setTransferts(transferts.filter(t => t.id !== id));
      toast.success("Bordereau de transfert supprimé.");
    } catch (err: any) {
      toast.error(`Erreur de suppression : ${err.message}`);
    }
  }, [transferts, setTransferts]);

  const getArticleTransitQty = useCallback((articleRef: string, site: string) => {
    let transitQty = 0;
    const { articles } = useArticlesStore.getState();
    transferts.forEach(t => {
      const isInTransit = t.status === 'IN_TRANSIT' || t.status === 'EN_TRANSIT' || t.status === 'EXPEDIE';
      if (isInTransit && t.targetSite === site) {
        t.items.forEach(item => {
          let ref = item.articleRef;
          if (!ref) {
            const art = articles.find(a => a.id === item.articleId);
            if (art) {
              ref = art.ref;
            }
          }
          if (ref === articleRef) {
            transitQty += item.quantity;
          }
        });
      }
    });
    return transitQty;
  }, [transferts]);

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
    expedierTransfert,
    receptionnerTransfert,
    accepterEtCloturerTransfert,
    deleteTransfert,
    getArticleTransitQty,
  };
}
export default useTransfers;
