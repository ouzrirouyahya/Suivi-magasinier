import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, db, query, where } from '../lib/db';
import { useMaintenanceStore } from '../stores/maintenance.store';
import { maintenanceService } from '../services/maintenance.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { useAuthStore } from '../stores/auth.store';
import { MaintenanceLog, EnginMaster, PerfoMaster, AgentMaster } from '../types';
import { serializeFirestoreData, cleanObject, handleFirestoreError, OperationType } from '../lib/utils';

export function useMaintenance() {
  const currentUser = useAuthStore(s => s.currentUser);
  const currentSite = useAuthStore(s => s.currentSite);
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
    if (!currentUser || !currentUser.active || !currentSite) return;
    setMaintenanceLogs([]);

    const q = currentSite === 'ALL'
      ? query(collection(db, 'maintenanceLogs'))
      : query(collection(db, 'maintenanceLogs'), where('site', '==', currentSite));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as MaintenanceLog);
      setMaintenanceLogs(list);
      offlineService.saveCollection('maintenanceLogs', list)
        .then(() => snapshotManager.markCollectionSaved('maintenanceLogs'))
        .catch(err => console.warn('[IDB] maintenanceLogs save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maintenanceLogs');
    });
    return unsub;
  }, [setMaintenanceLogs, currentUser, currentSite]);

  // Subscribe to engins
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    setEngins([]);

    const q = currentSite === 'ALL'
      ? query(collection(db, 'engins'))
      : query(collection(db, 'engins'), where('site', '==', currentSite));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as EnginMaster)
        .filter(e => !(e as any).deleted);
      setEngins(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'engins');
    });
    return unsub;
  }, [setEngins, currentUser, currentSite]);

  // Subscribe to perfos
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    setPerfos([]);

    const q = currentSite === 'ALL'
      ? query(collection(db, 'perfos'))
      : query(collection(db, 'perfos'), where('site', '==', currentSite));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as PerfoMaster)
        .filter(p => !(p as any).deleted);
      setPerfos(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'perfos');
    });
    return unsub;
  }, [setPerfos, currentUser, currentSite]);

  // Subscribe to agents
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;
    setAgents([]);

    const q = currentSite === 'ALL'
      ? query(collection(db, 'agents'))
      : query(collection(db, 'agents'), where('site', '==', currentSite));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AgentMaster)
        .filter(a => !(a as any).deleted);
      setAgents(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'agents');
    });
    return unsub;
  }, [setAgents, currentUser, currentSite]);

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
