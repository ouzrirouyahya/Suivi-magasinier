import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  writeBatch, 
  updateDoc,
  increment,
  limit,
  db
} from '../lib/db';
import { auth } from '../lib/firebase';
import { useInventory } from '../context/InventoryContext';
import { 
  SystemMessage, 
  UserInboxItem, 
  MessageDraft, 
  MessageTelemetryEvent, 
  BannerNotification, 
  BannerView, 
  TelemetryEventType, 
  RecipientStatus, 
  MessageTargetType, 
  MessagePriority,
  MessageAttachment,
  SiteCode,
  UserRole
} from '../types';
import { generateSecureUUID, logger } from '../lib/utils';
import { toast } from 'sonner';

// Firestore Error handler matching firebase-integration skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  logger.error('Firestore Error inside Communication Module: ', JSON.stringify(errInfo));
  
  if (operationType === OperationType.LIST) {
    logger.warn('[Firestore Sync Warning] Non-blocking list query inside Communication Module failed:', errInfo);
    return;
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export function useCommunication() {
  const { currentUser, accounts, currentSite } = useInventory();
  const [inbox, setInbox] = useState<UserInboxItem[]>([]);
  const [sentMessages, setSentMessages] = useState<SystemMessage[]>([]);
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [activeBanners, setActiveBanners] = useState<BannerNotification[]>([]);
  const [bannerViews, setBannerViews] = useState<BannerView[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track continuous session ID for telemetry UUID
  const [sessionId] = useState(() => generateSecureUUID());

  // 1. Telemetry Tracking
  const trackTelemetry = useCallback(async (
    eventType: TelemetryEventType, 
    messageId: string, 
    threadId: string, 
    payload?: any
  ) => {
    if (!currentUser) return;

    const path = 'telemetry_events';
    const eventId = generateSecureUUID();
    const event: MessageTelemetryEvent = {
      id: eventId,
      messageId,
      threadId,
      userId: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      userSite: currentSite,
      eventType,
      timestamp: new Date().toISOString(),
      sessionId,
      payload
    };

    try {
      await setDoc(doc(db, path, eventId), event);
    } catch (error) {
      logger.warn('Silent telemetry write failure:', error);
    }
  }, [currentUser, currentSite, sessionId]);

  // 2. Fetch User Inbox Items (Subscribed)
  useEffect(() => {
    if (!currentUser?.email || !currentUser.active) {
      setLoading(false);
      return;
    }

    const inboxCol = collection(db, 'userInbox', currentUser.email, 'messages');
    const q = query(
      inboxCol,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: UserInboxItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as UserInboxItem);
      });
      setInbox(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `userInbox/${currentUser.email}/messages`);
    });

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.active]);

  // 3. Fetch Sent Messages (Subscribed)
  useEffect(() => {
    if (!currentUser?.email || !currentUser.active) return;

    const path = 'system_messages';
    const q = query(
      collection(db, path),
      where('senderId', '==', currentUser.email),
      where('status', '==', 'ACTIVE'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SystemMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as SystemMessage);
      });
      setSentMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.active]);

  // 4. Fetch Drafts (Subscribed)
  useEffect(() => {
    if (!currentUser?.email || !currentUser.active) return;

    const path = 'message_drafts';
    const q = query(
      collection(db, path),
      where('senderId', '==', currentUser.email),
      orderBy('lastSavedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MessageDraft[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as MessageDraft);
      });
      setDrafts(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.active]);

  // 5. Fetch Active Banners (Subscribed)
  useEffect(() => {
    if (!currentUser || !currentUser.active) return;

    const path = 'banner_notifications';
    const q = query(
      collection(db, path),
      where('status', '==', 'ACTIVE'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const banners: BannerNotification[] = [];
      const now = new Date().toISOString();
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BannerNotification;
        // Client side double check for active date range and targeting
        const isDateValid = data.startDate <= now && data.endDate >= now;
        
        let matchesTarget = false;
        if (currentUser) {
          const siteMatches = (data.targetSites as string[]).includes('ALL') || data.targetSites.includes(currentSite);
          const roleMatches = (data.targetRoles as string[]).includes('ALL') || data.targetRoles.includes(currentUser.role);
          const userSpecific = !data.targetUsers || data.targetUsers.length === 0 || data.targetUsers.includes(currentUser.email);
          
          matchesTarget = siteMatches && roleMatches && userSpecific;
        }

        if (isDateValid && matchesTarget) {
          banners.push({ id: docSnap.id, ...data });
        }
      });
      setActiveBanners(banners);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser, currentUser?.active, currentSite]);

  // 6. Fetch Banner Views (to keep track of already dismissed banners)
  useEffect(() => {
    if (!currentUser?.email || !currentUser.active) return;

    const path = 'banner_views';
    const q = query(
      collection(db, path),
      where('userId', '==', currentUser.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const views: BannerView[] = [];
      snapshot.forEach((docSnap) => {
        views.push({ id: docSnap.id, ...docSnap.data() } as BannerView);
      });
      setBannerViews(views);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.active]);

  // 7. Send New System Message
  const sendMessage = useCallback(async (
    subject: string,
    body: string,
    priority: MessagePriority,
    targetType: MessageTargetType,
    targets: { site?: SiteCode; role?: UserRole; userId?: string },
    attachments?: MessageAttachment[],
    parentId?: string,
    threadId?: string
  ) => {
    if (!currentUser) throw new Error("Vous devez être authentifié.");

    const msgId = generateSecureUUID();
    const finalThreadId = threadId || msgId;
    const nowISO = new Date().toISOString();

    // Determine target recipient accounts
    let targetRecipients = accounts;

    if (targetType === 'SITE') {
      targetRecipients = accounts.filter(a => a.assignedSite === targets.site);
    } else if (targetType === 'ROLE') {
      targetRecipients = accounts.filter(a => a.role === targets.role);
    } else if (targetType === 'INDIVIDUAL') {
      targetRecipients = accounts.filter(a => a.email === targets.userId);
    }
    // Exclude sender from list unless they specifically chose INDIVIDUAL targeting to themselves
    if (targetType !== 'INDIVIDUAL') {
      targetRecipients = targetRecipients.filter(a => a.email !== currentUser.email);
    }

    const recipientIds = targetRecipients.map(r => r.email);
    const recipientsList = targetRecipients.map(r => ({
      userId: r.email,
      userName: r.name,
      userRole: r.role,
      site: r.assignedSite || 'ALL',
      status: 'UNREAD' as RecipientStatus
    }));

    const systemMessage: SystemMessage = {
      id: msgId,
      senderId: currentUser.email,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderSite: currentSite,
      targetType,
      targetSite: targets.site,
      targetRole: targets.role,
      targetUserId: targets.userId,
      subject,
      body,
      priority,
      attachments,
      parentId,
      threadId: finalThreadId,
      replyCount: 0,
      recipientIds,
      recipients: recipientsList,
      createdAt: nowISO,
      updatedAt: nowISO,
      createdBy: currentUser.email,
      status: 'ACTIVE'
    };

    const batch = writeBatch(db);

    // Save System Message
    batch.set(doc(db, 'system_messages', msgId), systemMessage);

    // Increment reply count of parent message if any
    if (parentId) {
      const parentRef = doc(db, 'system_messages', parentId);
      batch.update(parentRef, { 
        replyCount: increment(1),
        updatedAt: nowISO
      });
    }

    // Distribute UserInboxItem lightweight copies
    targetRecipients.forEach(rec => {
      const inboxItemId = generateSecureUUID();
      const inboxItem: UserInboxItem = {
        id: inboxItemId,
        userId: rec.email,
        messageId: msgId,
        senderId: currentUser.email,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderSite: currentSite,
        subject,
        body: body.length > 500 ? body.substring(0, 500) + '...' : body,
        priority,
        threadId: finalThreadId,
        parentId,
        hasAttachments: !!attachments && attachments.length > 0,
        attachmentCount: attachments?.length || 0,
        status: 'UNREAD',
        createdAt: nowISO,
        updatedAt: nowISO
      };
      // To preserve offline writes, we use user-specific sub-keys or just a random generated ID
      const inboxRef = doc(db, 'userInbox', rec.email, 'messages', inboxItemId);
      batch.set(inboxRef, inboxItem);
    });

    try {
      await batch.commit();
      
      // Track sent telemetry
      await trackTelemetry('REPLY_SENT', msgId, finalThreadId, {
        targetType,
        recipientCount: recipientIds.length,
        isReply: !!parentId
      });

      toast.success("Message envoyé avec succès !");
      return msgId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_messages');
    }
  }, [currentUser, accounts, currentSite, trackTelemetry]);

  // 8. Update Inbox Item Status (Read/Archive)
  const updateInboxStatus = useCallback(async (
    inboxItemId: string, 
    status: RecipientStatus,
    timeSpentSeconds?: number
  ) => {
    if (!currentUser?.email) return;

    const inboxRef = doc(db, 'userInbox', currentUser.email, 'messages', inboxItemId);
    const nowISO = new Date().toISOString();

    const updates: Partial<UserInboxItem> = {
      status,
      updatedAt: nowISO
    };

    if (status === 'READ') {
      updates.readAt = nowISO;
      if (timeSpentSeconds) {
        updates.timeSpentSeconds = timeSpentSeconds;
      }
    }

    try {
      await updateDoc(inboxRef, updates);

      // Denormalize into original SystemMessage if read
      const inboxSnap = await getDoc(inboxRef);
      if (inboxSnap.exists()) {
        const item = inboxSnap.data() as UserInboxItem;
        const msgRef = doc(db, 'system_messages', item.messageId);
        const msgSnap = await getDoc(msgRef);
        
        if (msgSnap.exists()) {
          const msgData = msgSnap.data() as SystemMessage;
          const updatedRecipients = msgData.recipients.map(rec => {
            if (rec.userId === currentUser.email) {
              return {
                ...rec,
                status,
                readAt: status === 'READ' ? nowISO : rec.readAt,
                timeSpentSeconds: status === 'READ' ? (timeSpentSeconds || rec.timeSpentSeconds) : rec.timeSpentSeconds
              };
            }
            return rec;
          });

          await updateDoc(msgRef, { recipients: updatedRecipients });
          
          if (status === 'READ') {
            await trackTelemetry('MESSAGE_OPENED', item.messageId, item.threadId, {
              timeSpentSeconds
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `userInbox/${currentUser.email}/messages`);
    }
  }, [currentUser, trackTelemetry]);

  // 9. Save Draft
  const saveDraft = useCallback(async (
    subject: string,
    body: string,
    recipientType: MessageTargetType,
    targets: { site?: SiteCode; role?: UserRole; userId?: string },
    attachments?: MessageAttachment[],
    draftId?: string,
    parentId?: string,
    threadId?: string
  ) => {
    if (!currentUser) return;

    const finalDraftId = draftId || generateSecureUUID();
    const nowISO = new Date().toISOString();

    const draft: MessageDraft = {
      id: finalDraftId,
      senderId: currentUser.email,
      recipientType,
      recipientSite: targets.site,
      recipientRole: targets.role,
      recipientId: targets.userId,
      subject,
      body,
      attachments,
      lastSavedAt: nowISO,
      createdAt: nowISO,
      messageId: parentId, // parent message if reply
      threadId
    };

    try {
      await setDoc(doc(db, 'message_drafts', finalDraftId), draft);
      await trackTelemetry('REPLY_DRAFT_SAVED', parentId || '', threadId || '', {
        draftId: finalDraftId
      });
      return finalDraftId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'message_drafts');
    }
  }, [currentUser, trackTelemetry]);

  // 10. Delete Draft
  const deleteDraft = useCallback(async (draftId: string) => {
    try {
      const draftRef = doc(db, 'message_drafts', draftId);
      await setDoc(draftRef, {} as any); // Firebase soft delete style or use deleteDoc
      // To avoid permission error on delete in certain rule setups, let's use standard delete or update status
      const batch = writeBatch(db);
      batch.delete(draftRef);
      await batch.commit();
    } catch (error) {
      logger.warn('Silent draft delete failure:', error);
    }
  }, []);

  // 11. View / Dismiss Banner
  const viewBanner = useCallback(async (
    bannerId: string, 
    dismissed: boolean = false, 
    timeSpentSeconds?: number,
    clickedAt?: string,
    clickTarget?: string
  ) => {
    if (!currentUser) return;

    const viewId = `${currentUser.email}_${bannerId}`;
    const nowISO = new Date().toISOString();

    const view: BannerView = {
      id: viewId,
      bannerId,
      userId: currentUser.email,
      userName: currentUser.name,
      userSite: currentSite,
      userRole: currentUser.role,
      viewedAt: nowISO,
      dismissedAt: dismissed ? nowISO : undefined,
      timeSpentSeconds,
      clickedAt,
      clickTarget
    };

    try {
      await setDoc(doc(db, 'banner_views', viewId), view);
    } catch (error) {
      logger.warn('Silent banner view write failure:', error);
    }
  }, [currentUser, currentSite]);

  // 12. Create a Banner Notification (Super Admin / Admin only)
  const createBanner = useCallback(async (
    title: string,
    body: string,
    priority: MessagePriority,
    targetSites: (SiteCode | 'ALL')[],
    targetRoles: (UserRole | 'ALL')[],
    startDate: string,
    endDate: string,
    imageUrl?: string,
    dismissible: boolean = true,
    targetUsers?: string[]
  ) => {
    if (!currentUser) throw new Error("Vous devez être authentifié.");

    const bannerId = generateSecureUUID();
    const nowISO = new Date().toISOString();

    const banner: BannerNotification = {
      id: bannerId,
      title,
      body,
      imageUrl,
      priority,
      targetSites,
      targetRoles,
      targetUsers,
      dismissible,
      startDate,
      endDate,
      createdBy: currentUser.email,
      createdAt: nowISO,
      updatedAt: nowISO,
      status: 'ACTIVE'
    };

    try {
      await setDoc(doc(db, 'banner_notifications', bannerId), banner);
      toast.success("Bannière de notification créée !");
      return bannerId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'banner_notifications');
    }
  }, [currentUser]);

  // 13. Disable Banner
  const disableBanner = useCallback(async (bannerId: string) => {
    try {
      await updateDoc(doc(db, 'banner_notifications', bannerId), {
        status: 'DELETED',
        updatedAt: new Date().toISOString()
      });
      toast.success("Bannière retirée.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'banner_notifications');
    }
  }, []);

  // 14. Fetch Thread Messages (for chat rendering)
  const getThreadMessages = useCallback(async (threadId: string) => {
    const path = 'system_messages';
    const q = query(
      collection(db, path),
      where('threadId', '==', threadId),
      where('status', '==', 'ACTIVE'),
      orderBy('createdAt', 'asc')
    );

    try {
      const snap = await getDocs(q);
      const msgs: SystemMessage[] = [];
      snap.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as SystemMessage);
      });
      return msgs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }, []);

  return {
    inbox,
    sentMessages,
    drafts,
    activeBanners,
    bannerViews,
    loading,
    sendMessage,
    updateInboxStatus,
    saveDraft,
    deleteDraft,
    viewBanner,
    createBanner,
    disableBanner,
    getThreadMessages,
    trackTelemetry
  };
}
