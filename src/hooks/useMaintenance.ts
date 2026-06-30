import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMaintenanceStore } from '../stores/maintenance.store';
import { maintenanceService } from '../services/maintenance.service';
import { useAuthStore } from '../stores/auth.store';
import { MaintenanceLog, EnginMaster, PerfoMaster, AgentMaster } from '../types';
import { serializeFirestoreData, cleanObject, handleFirestoreError, OperationType } from '../lib/utils';

export function useMaintenance() {
  const currentUser = useAuthStore(s => s.currentUser);
  const {
    maintenanceLogs,
    engins,
    perfos,
    agents,
    setMaintenanceLogs,
    setEngins,
    setPerfos,
    setAgents,
  } = useMaintenanceStore();

  // Subscribe to maintenance logs
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const unsub = onSnapshot(collection(db, 'maintenanceLogs'), (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as MaintenanceLog);
      setMaintenanceLogs(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maintenanceLogs');
    });
    return unsub;
  }, [setMaintenanceLogs, currentUser]);

  // Subscribe to engins
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const unsub = onSnapshot(collection(db, 'engins'), (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as EnginMaster)
        .filter(e => !(e as any).deleted);
      setEngins(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'engins');
    });
    return unsub;
  }, [setEngins, currentUser]);

  // Subscribe to perfos
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const unsub = onSnapshot(collection(db, 'perfos'), (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as PerfoMaster)
        .filter(p => !(p as any).deleted);
      setPerfos(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'perfos');
    });
    return unsub;
  }, [setPerfos, currentUser]);

  // Subscribe to agents
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const unsub = onSnapshot(collection(db, 'agents'), (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AgentMaster)
        .filter(a => !(a as any).deleted);
      setAgents(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'agents');
    });
    return unsub;
  }, [setAgents, currentUser]);

  const addMaintenanceLog = useCallback(async (log: MaintenanceLog) => {
    await maintenanceService.addMaintenanceLog(log);
  }, []);

  const setEngin = useCallback(async (id: string, data: any) => {
    if (!data) {
      await setDoc(doc(db, 'engins', id), { deleted: true }, { merge: true });
    } else {
      await setDoc(doc(db, 'engins', id), cleanObject({ ...data, id }), { merge: true });
    }
  }, []);

  const setPerfo = useCallback(async (id: string, data: any) => {
    if (!data) {
      await setDoc(doc(db, 'perfos', id), { deleted: true }, { merge: true });
    } else {
      await setDoc(doc(db, 'perfos', id), cleanObject({ ...data, id }), { merge: true });
    }
  }, []);

  const setAgent = useCallback(async (id: string, data: any) => {
    if (!data) {
      await setDoc(doc(db, 'agents', id), { deleted: true }, { merge: true });
    } else {
      await setDoc(doc(db, 'agents', id), cleanObject({ ...data, id }), { merge: true });
    }
  }, []);

  return {
    maintenanceLogs,
    engins,
    perfos,
    agents,
    addMaintenanceLog,
    setEngin,
    setPerfo,
    setAgent,
  };
}
export default useMaintenance;
