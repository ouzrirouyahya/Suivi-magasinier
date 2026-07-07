import { doc, getDoc, setDoc, writeBatch, db } from '../../lib/db';
import { AppNotification } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useNotificationsStore } from './notifications.store';
import { generateSecureUUID, cleanObject } from '../../lib/utils';

export class NotificationsService {
  /**
   * Post a new warning message or notification
   */
  async addNotification(notif: Partial<AppNotification>, isSimulation: boolean = false): Promise<void> {
    if (!notif.siteId) {
      console.error('siteId manquant');
      return;
    }
    const id = notif.id || generateSecureUUID();
    const notification: AppNotification = {
      id,
      siteId: notif.siteId,
      category: notif.category || 'SYSTEM',
      message: notif.message || '',
      timestamp: notif.timestamp || new Date().toISOString(),
      isRead: false,
      severity: notif.severity || 'INFO',
      actionRoute: notif.actionRoute || ''
    };

    if (isSimulation) {
      useNotificationsStore.getState().addNotificationLocal(notification);
      return;
    }

    await firestoreRepository.write('notifications', id, cleanObject(notification));
    useNotificationsStore.getState().addNotificationLocal(notification);
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(id: string, isSimulation: boolean = false): Promise<void> {
    if (isSimulation) {
      useNotificationsStore.getState().markReadLocal(id);
      return;
    }

    await firestoreRepository.update('notifications', id, { isRead: true });
    useNotificationsStore.getState().markReadLocal(id);
  }

  /**
   * Mark all notifications of a site or system-wide as read in a single batch
   */
  async markAllNotificationsAsRead(siteId: string, isSimulation: boolean = false): Promise<void> {
    if (isSimulation) {
      useNotificationsStore.getState().markAllReadLocal(siteId);
      return;
    }

    const { notifications } = useNotificationsStore.getState();
    const unread = notifications.filter(notif => !notif.isRead && (siteId === 'ALL' || notif.siteId === siteId));

    if (unread.length === 0) return;

    const batch = firestoreRepository.createBatch();
    unread.forEach(notif => {
      const ref = doc(db, 'notifications', notif.id);
      batch.update(ref, { isRead: true });
    });
    await batch.commit();

    useNotificationsStore.getState().markAllReadLocal(siteId);
  }
}

export const notificationsService = new NotificationsService();
