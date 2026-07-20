import { useState, useEffect, useCallback, useRef } from 'react';
import { messagingService } from '../services/message.service';
import { useAuthStore } from '../stores/auth.store';
import { InboxItem, Message, MessageDraft, MessageTelemetryEvent } from '../types';
import { telemetryService } from '../services/telemetry.service';
import { generateSecureUUID } from '../lib/utils';

export function useMessages() {
  const { currentUser, currentSite } = useAuthStore();
  const [sessionId] = useState(() => generateSecureUUID());
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [activeThread, setActiveThread] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedAtRef = useRef<number | null>(null);

  // S'abonner à l'inbox
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentUser.email) return;
    const userId = currentUser.email;

    const unsub = messagingService.subscribeToInbox(userId, (items) => {
      setInbox(items);
      setUnreadCount(items.filter(i => i.status === 'UNREAD').length);
    }, (error) => {
      setError(error.message || String(error));
    });
    return unsub;
  }, [currentUser]);

  // S'abonner aux brouillons
  useEffect(() => {
    if (!currentUser || !currentUser.active || !currentUser.email) return;
    const userId = currentUser.email;

    const unsub = messagingService.subscribeToDrafts(userId, (items) => {
      setDrafts(items);
    }, (error) => {
      setError(error.message || String(error));
    });
    return unsub;
  }, [currentUser]);

  // Ouvrir un message - marquer comme lu + enregistrer temps
  const openMessage = useCallback(async (item: InboxItem) => {
    openedAtRef.current = Date.now();
    const userId = currentUser?.email;
    if (item.status === 'UNREAD' && userId) {
      await messagingService.markAsRead(userId, item.id);
      if (currentUser) {
        telemetryService.record({
          messageId: item.messageId,
          threadId: item.threadId,
          userId: currentUser.email,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSite: currentSite || 'SMI',
          eventType: 'MESSAGE_OPENED',
          timestamp: new Date().toISOString(),
          sessionId
        }).catch(() => {});
      }
    }
  }, [currentUser, currentSite, sessionId]);

  // Fermer un message - enregistrer temps passé
  const closeMessage = useCallback(async (item: InboxItem) => {
    const userId = currentUser?.email;
    if (openedAtRef.current && userId) {
      const seconds = Math.round((Date.now() - openedAtRef.current) / 1000);
      await messagingService.markAsRead(userId, item.id, seconds);
      openedAtRef.current = null;
    }
  }, [currentUser]);

  const sendMessage = useCallback(async (payload: any) => {
    setIsLoading(true);
    setError(null);
    try {
      return await messagingService.sendMessage(payload);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const archiveMessage = useCallback(async (itemId: string) => {
    const userId = currentUser?.email;
    if (!userId) return;
    await messagingService.archiveMessage(userId, itemId);
  }, [currentUser]);

  const loadThread = useCallback((threadId: string) => {
    const unsub = messagingService.subscribeToThread(threadId, setActiveThread);
    return unsub;
  }, []);

  return {
    inbox,
    drafts,
    activeThread,
    unreadCount,
    isLoading,
    error,
    openMessage,
    closeMessage,
    sendMessage,
    archiveMessage,
    loadThread
  };
}
