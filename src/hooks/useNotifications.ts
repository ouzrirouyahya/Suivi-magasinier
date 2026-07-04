import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, db } from '../lib/db';
import { useNotificationsStore } from '../stores/notification.store';
import { useAuthStore } from '../stores/auth.store';
import { notificationsService } from '../services/notification.service';
import { offlineService } from '../services/offline.service';
import { snapshotManager } from '../lib/snapshotManager';
import { AppNotification } from '../types';
import { serializeFirestoreData, handleFirestoreError, OperationType } from '../lib/utils';

export function useNotifications() {
  const { notifications, setNotifications } = useNotificationsStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const currentSite = useAuthStore(s => s.currentSite);

  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentSite) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const q = currentSite === 'ALL'
      ? query(
          collection(db, 'notifications'),
          where('timestamp', '>=', thirtyDaysAgo.toISOString()),
          orderBy('timestamp', 'desc'),
          limit(500)
        )
      : query(
          collection(db, 'notifications'),
          where('siteId', '==', currentSite),
          where('timestamp', '>=', thirtyDaysAgo.toISOString()),
          orderBy('timestamp', 'desc'),
          limit(500)
        );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => {
        const serialized = serializeFirestoreData({ id: doc.id, ...doc.data() }) as AppNotification;
        return {
          ...serialized,
          severity: serialized.severity || serialized.type || 'INFO',
          status: serialized.status || (serialized.isRead ? 'read' : 'unread')
        };
      });
      setNotifications(list);
      offlineService.saveCollection('notifications', list)
        .then(() => snapshotManager.markCollectionSaved('notifications'))
        .catch(err => console.warn('[IDB] notifications save error:', err));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return unsub;
  }, [setNotifications, currentUser, currentSite]);

  const addNotification = useCallback(async (notif: Partial<AppNotification>) => {
    await notificationsService.addNotification(notif);
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    await notificationsService.markNotificationAsRead(id);
  }, []);

  const markAllNotificationsAsRead = useCallback(async (siteId: string) => {
    await notificationsService.markAllNotificationsAsRead(siteId);
  }, []);

  return {
    notifications,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };
}
export default useNotifications;
