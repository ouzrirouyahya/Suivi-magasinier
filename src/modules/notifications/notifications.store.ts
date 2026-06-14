import { create } from 'zustand';
import { AppNotification } from '../../types';

interface NotificationsState {
  notifications: AppNotification[];
  setNotifications: (notifications: AppNotification[] | ((prev: AppNotification[]) => AppNotification[])) => void;
  addNotificationLocal: (notif: AppNotification) => void;
  markReadLocal: (id: string) => void;
  markAllReadLocal: (siteId: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  setNotifications: (arg) => set((state) => ({
    notifications: typeof arg === 'function' ? (arg as Function)(state.notifications) : arg
  })),
  
  addNotificationLocal: (notif) => set((state) => ({
    notifications: [notif, ...state.notifications]
  })),

  markReadLocal: (id) => set((state) => ({
    notifications: state.notifications.map(notif => 
      notif.id === id ? { ...notif, isRead: true, status: 'read' as const } : notif
    )
  })),

  markAllReadLocal: (siteId) => set((state) => ({
    notifications: state.notifications.map(notif => 
      (siteId === 'ALL' || notif.siteId === siteId) 
        ? { ...notif, isRead: true, status: 'read' as const } 
        : notif
    )
  }))
}));
