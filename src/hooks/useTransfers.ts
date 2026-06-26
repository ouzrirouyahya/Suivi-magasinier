import { useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTransfersStore } from '../stores/transfer.store';
import { transfersService } from '../services/transfer.service';
import { Transfert, MouvementItem } from '../types';
import { serializeFirestoreData } from '../lib/utils';

export function useTransfers() {
  const { transferts, setTransferts } = useTransfersStore();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'transferts'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as Transfert);
      setTransferts(list);
    });
    return unsub;
  }, [setTransferts]);

  const addTransfert = useCallback(async (t: Transfert) => {
    await transfersService.addTransfert(t);
  }, []);

  const completeTransfert = useCallback(async (
    id: string,
    recepteur: string,
    receivedItems?: MouvementItem[],
    disputeReason?: string
  ) => {
    await transfersService.completeTransfert(id, recepteur, receivedItems, disputeReason);
  }, []);

  const approveTransfert = useCallback(async (id: string, approver: string) => {
    await transfersService.approveTransfert(id, approver);
  }, []);

  const closeTransfert = useCallback(async (id: string, reason: string) => {
    await transfersService.closeTransfert(id, reason);
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
