import { useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSystemStore } from '../stores/system.store';
import { auditService } from '../services/audit.service';
import { AuditLog } from '../types';
import { serializeFirestoreData } from '../lib/utils';
import { useAuthStore } from '../stores/auth.store';

export function useAudit() {
  const { auditLogs, setAuditLogs } = useSystemStore();
  const { currentUser } = useAuthStore();

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AuditLog);
      setAuditLogs(list);
    });
    return unsub;
  }, [setAuditLogs]);

  return {
    auditLogs,
    logAction: async (action: string, details: string, site: any, amount: number = 0) => {
      await auditService.logAction(action, details, site, currentUser?.role || 'MAGASINIER', amount);
    },
    logActionTx: auditService.logActionTx
  };
}
export default useAudit;
