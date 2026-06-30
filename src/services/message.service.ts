import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Message, InboxItem, MessageDraft } from '../types';

export const messagingService = {
  // 1. Send a message to one or more recipients
  async sendMessage(payload: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'replyCount'>): Promise<string> {
    const newId = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      // Create the main message document in /messages
      const messageRef = doc(db, 'messages', newId);
      const newMessage: Message = {
        ...payload,
        id: newId,
        replyCount: 0,
        createdAt: nowStr,
        updatedAt: nowStr,
      } as Message;

      transaction.set(messageRef, newMessage);

      // Create an inbox item for each recipient in /userInbox/{userId}/messages/{newId}
      if (payload.recipients && Array.isArray(payload.recipients)) {
        for (const recipient of payload.recipients) {
          const inboxRef = doc(db, 'userInbox', recipient.userId, 'messages', newId);
          const bodyText = payload.body || '';
          const truncatedBody = bodyText.length > 500 ? bodyText.slice(0, 500) + '...' : bodyText;

          const inboxItem: InboxItem = {
            id: newId, // = messageId
            userId: recipient.userId,
            messageId: newId,
            senderId: payload.senderId,
            senderName: payload.senderName,
            senderRole: payload.senderRole,
            senderSite: payload.senderSite,
            subject: payload.subject,
            body: truncatedBody,
            priority: payload.priority,
            threadId: payload.threadId,
            parentId: payload.parentId,
            hasAttachments: !!(payload.attachments && payload.attachments.length > 0),
            attachmentCount: payload.attachments ? payload.attachments.length : 0,
            status: 'UNREAD',
            createdAt: nowStr,
            updatedAt: nowStr,
          };

          transaction.set(inboxRef, inboxItem);
        }
      }
    });

    return newId;
  },

  // 2. Reply to a message thread
  async replyToMessage(
    parentId: string,
    threadId: string,
    payload: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'replyCount'>
  ): Promise<string> {
    const newId = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      // Fetch and update the parent message reply count
      const parentRef = doc(db, 'messages', parentId);
      const parentSnap = await transaction.get(parentRef);

      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const currentReplyCount = parentData.replyCount || 0;
        transaction.update(parentRef, {
          replyCount: currentReplyCount + 1,
          updatedAt: nowStr
        });
      }

      // Create the reply message document in /messages
      const messageRef = doc(db, 'messages', newId);
      const newMessage: Message = {
        ...payload,
        id: newId,
        parentId,
        threadId,
        replyCount: 0,
        createdAt: nowStr,
        updatedAt: nowStr,
      } as Message;

      transaction.set(messageRef, newMessage);

      // Create an inbox item for each recipient in /userInbox/{userId}/messages/{newId}
      if (payload.recipients && Array.isArray(payload.recipients)) {
        for (const recipient of payload.recipients) {
          const inboxRef = doc(db, 'userInbox', recipient.userId, 'messages', newId);
          const bodyText = payload.body || '';
          const truncatedBody = bodyText.length > 500 ? bodyText.slice(0, 500) + '...' : bodyText;

          const inboxItem: InboxItem = {
            id: newId, // = messageId
            userId: recipient.userId,
            messageId: newId,
            senderId: payload.senderId,
            senderName: payload.senderName,
            senderRole: payload.senderRole,
            senderSite: payload.senderSite,
            subject: payload.subject,
            body: truncatedBody,
            priority: payload.priority,
            threadId,
            parentId,
            hasAttachments: !!(payload.attachments && payload.attachments.length > 0),
            attachmentCount: payload.attachments ? payload.attachments.length : 0,
            status: 'UNREAD',
            createdAt: nowStr,
            updatedAt: nowStr,
          };

          transaction.set(inboxRef, inboxItem);
        }
      }
    });

    return newId;
  },

  // 3. Mark inbox item as read
  async markAsRead(userId: string, itemId: string, timeSpentSeconds?: number): Promise<void> {
    const inboxRef = doc(db, 'userInbox', userId, 'messages', itemId);
    const updates: Record<string, any> = {
      status: 'READ',
      readAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (timeSpentSeconds !== undefined) {
      updates.timeSpentSeconds = timeSpentSeconds;
    }
    await updateDoc(inboxRef, updates);
  },

  // 4. Archive an inbox item
  async archiveMessage(userId: string, itemId: string): Promise<void> {
    const inboxRef = doc(db, 'userInbox', userId, 'messages', itemId);
    await updateDoc(inboxRef, {
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString()
    });
  },

  // 5. Delete message from sender's view (logical delete)
  async deleteMessageAsSender(messageId: string): Promise<void> {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      status: 'DELETED_BY_SENDER',
      updatedAt: new Date().toISOString()
    });
  },

  // 6. Save or update a draft message
  async saveDraft(draft: Omit<MessageDraft, 'id' | 'createdAt'> & { id?: string }): Promise<string> {
    const nowStr = new Date().toISOString();
    if (draft.id) {
      const draftRef = doc(db, 'messageDrafts', draft.id);
      await updateDoc(draftRef, {
        ...draft,
        lastSavedAt: nowStr
      } as any);
      return draft.id;
    } else {
      const draftCol = collection(db, 'messageDrafts');
      const docRef = await addDoc(draftCol, {
        ...draft,
        createdAt: nowStr,
        lastSavedAt: nowStr
      });
      return docRef.id;
    }
  },

  // 7. Delete a draft
  async deleteDraft(draftId: string): Promise<void> {
    const draftRef = doc(db, 'messageDrafts', draftId);
    await deleteDoc(draftRef);
  },

  // 8. Retrieve unread messages count for a user
  async getUnreadCount(userId: string): Promise<number> {
    const inboxCol = collection(db, 'userInbox', userId, 'messages');
    const q = query(inboxCol, where('status', '==', 'UNREAD'));
    const snap = await getDocs(q);
    return snap.size;
  },

  // 9. Subscribe to user inbox real-time changes
  subscribeToInbox(userId: string, callback: (items: InboxItem[]) => void, onError?: (err: any) => void): () => void {
    const inboxCol = collection(db, 'userInbox', userId, 'messages');
    const q = query(inboxCol, orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const items: InboxItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as InboxItem);
      });
      callback(items);
    }, (error) => {
      console.error("[messagingService subscribeToInbox error]:", error);
      if (onError) onError(error);
    });
  },

  // 10. Subscribe to thread messages
  subscribeToThread(threadId: string, callback: (messages: Message[]) => void, onError?: (err: any) => void): () => void {
    const messagesCol = collection(db, 'messages');
    const q = query(messagesCol, where('threadId', '==', threadId), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });
      callback(messages);
    }, (error) => {
      console.error("[messagingService subscribeToThread error]:", error);
      if (onError) onError(error);
    });
  },

  // 11. Subscribe to drafts
  subscribeToDrafts(senderId: string, callback: (drafts: MessageDraft[]) => void, onError?: (err: any) => void): () => void {
    const draftsCol = collection(db, 'messageDrafts');
    const q = query(draftsCol, where('senderId', '==', senderId), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const drafts: MessageDraft[] = [];
      snapshot.forEach((doc) => {
        drafts.push({ id: doc.id, ...doc.data() } as MessageDraft);
      });
      callback(drafts);
    }, (error) => {
      console.error("[messagingService subscribeToDrafts error]:", error);
      if (onError) onError(error);
    });
  }
};
