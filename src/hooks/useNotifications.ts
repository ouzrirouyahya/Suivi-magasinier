import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNotificationsStore } from '../stores/notification.store';
import { notificationsService } from '../services/notification.service';
import { AppNotification } from '../types';
import { serializeFirestoreData } from '../lib/utils';

export function useNotifications() {
  const { notifications, setNotifications } = useNotificationsStore();

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(100));
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
    });
    return unsub;
  }, [setNotifications]);

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
