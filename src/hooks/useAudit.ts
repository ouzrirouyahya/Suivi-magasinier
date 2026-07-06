import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, startAfter, getDocs, DocumentSnapshot, db } from '../lib/db';
import { useSystemStore } from '../stores/system.store';
import { auditService } from '../services/audit.service';
import { AuditLog } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType } from '../lib/utils';
import { useAuthStore } from '../stores/auth.store';

const getTimestampString = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw.toDate === 'function') return raw.toDate().toISOString();
  if (typeof raw.seconds === 'number') return new Date(raw.seconds * 1000).toISOString();
  return String(raw);
};

export function useAudit() {
  const { auditLogs, setAuditLogs } = useSystemStore();
  const { currentUser, currentSite } = useAuthStore();
  const [dateFilter, setDateFilter] = useState<string>('30'); // jours
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 100;

  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(dateFilter));

    const q = currentSite === 'ALL'
      ? query(
          collection(db, 'auditLogs'),
          where('timestamp', '>=', startDate.toISOString()),
          orderBy('timestamp', 'desc'),
          limit(PAGE_SIZE)
        )
      : query(
          collection(db, 'auditLogs'),
          where('site', '==', currentSite)
        );

    const unsub = onSnapshot(q, (snap) => {
      let list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AuditLog);
      if (currentSite !== 'ALL') {
        list = list
          .filter(log => getTimestampString(log.timestamp) >= startDate.toISOString())
          .sort((a, b) => getTimestampString(b.timestamp).localeCompare(getTimestampString(a.timestamp)));
        setAuditLogs(list.slice(0, PAGE_SIZE));
        setLastDoc(null);
        setHasMore(false);
      } else {
        setAuditLogs(list);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    });

    return unsub;
  }, [currentUser, currentSite, dateFilter, setAuditLogs]);

  const loadMoreAuditLogs = async () => {
    if (!lastDoc || !hasMore || currentSite !== 'ALL') return;
    try {
      const q = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const more = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as AuditLog);
      const currentLogs = useSystemStore.getState().auditLogs;
      setAuditLogs([...currentLogs, ...more]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  };

  return {
    auditLogs,
    dateFilter,
    setDateFilter,
    loadMoreAuditLogs,
    hasMore,
    logAction: async (action: string, details: string, site: any, amount: number = 0) => {
      await auditService.logAction(action, details, site, currentUser?.role || 'MAGASINIER', amount);
    },
    logActionTx: auditService.logActionTx
  };
}
export default useAudit;
