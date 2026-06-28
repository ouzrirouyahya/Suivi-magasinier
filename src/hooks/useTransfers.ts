import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTransfersStore } from '../stores/transfer.store';
import { useAuthStore } from '../stores/auth.store';
import { transfersService } from '../services/transfer.service';
import { Transfert, MouvementItem } from '../types';
import { serializeFirestoreData } from '../lib/utils';

export function useTransfers() {
  const { transferts, setTransferts } = useTransfersStore();
  const currentSite = useAuthStore(s => s.currentSite);

  useEffect(() => {
    if (!currentSite) return;

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
    });
    return unsub;
  }, [setTransferts, currentSite]);

  const addTransfert = useCallback(async (t: Transfert) => {
    const res = await transfersService.addTransfert(t);
    if (!res.success) {
      throw new Error(res.error);
    }
  }, []);

  const completeTransfert = useCallback(async (
    id: string,
    recepteur: string,
    receivedItems?: MouvementItem[],
    disputeReason?: string
  ) => {
    const res = await transfersService.completeTransfert(id, recepteur, receivedItems, disputeReason);
    if (!res.success) {
      throw new Error(res.error);
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
