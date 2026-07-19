import React, { useState, useEffect, useCallback } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { useAuthStore } from '../../stores/auth.store';
import { SITE_CODES } from '../../lib/constants';
import { bannerService } from '../../services/banner.service';
import { messagingService } from '../../services/message.service';
import MessageComposer from './MessageComposer';
import TelemetryDashboard from './TelemetryDashboard';
import { InboxItem, MessageDraft, Message, SiteCode, UserRole, MessageRecipient } from '../../types';
import { logger } from '../../lib/utils';
import { 
  MessageSquare, 
  Inbox, 
  Archive, 
  FileText, 
  PlusCircle, 
  Trash2, 
  Paperclip, 
  Send, 
  ShieldAlert, 
  ChevronRight, 
  Sparkles,
  AlertTriangle,
  Clock,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineQueue } from '../../lib/offlineQueue';
import { useSystemStore } from '../../stores/system.store';

export default function MessagingPage() {
  const { currentUser, accounts, currentSite } = useAuthStore();
  const {
    inbox,
    drafts,
    activeThread,
    unreadCount,
    isLoading: isMessagingLoading,
    error: messagingError,
    openMessage,
    closeMessage,
    sendMessage,
    archiveMessage,
    loadThread
  } = useMessages();

  // Selected tab (INBOX, DRAFTS, ARCHIVED)
  const [activeTab, setActiveTab] = useState<'INBOX' | 'DRAFTS' | 'ARCHIVED'>('INBOX');
  
  // View mode for Admins ('MESSAGES' | 'TELEMETRY')
  const [activeView, setActiveView] = useState<'MESSAGES' | 'TELEMETRY'>('MESSAGES');
  
  // Selection states
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<MessageDraft | null>(null);
  
  // Composer mode ('VIEW' | 'COMPOSE_NEW' | 'EDIT_DRAFT' | 'REPLY')
  const [composerMode, setComposerMode] = useState<'VIEW' | 'COMPOSE_NEW'>('VIEW');

  // Quick reply input
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Administrative Banner creation state
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerBody, setBannerBody] = useState('');
  const [bannerSites, setBannerSites] = useState<string[]>(['ALL']);
  const [bannerRoles, setBannerRoles] = useState<string[]>(['ALL']);
  const [bannerStart, setBannerStart] = useState(new Date().toISOString().split('T')[0]);
  const [bannerEnd, setBannerEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [bannerPriority, setBannerPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [bannerDismissible, setBannerDismissible] = useState(true);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);

  // Load thread live if an item is selected
  useEffect(() => {
    if (selectedItem?.threadId) {
      const unsub = loadThread(selectedItem.threadId);
      openMessage(selectedItem).catch(logger.error);
      return () => {
        unsub();
        closeMessage(selectedItem).catch(logger.error);
      };
    }
  }, [selectedItem, loadThread, openMessage, closeMessage]);

  const handleComposeNew = () => {
    setSelectedItem(null);
    setSelectedDraft(null);
    setComposerMode('COMPOSE_NEW');
  };

  const selectInboxItem = (item: InboxItem) => {
    setSelectedItem(item);
    setSelectedDraft(null);
    setComposerMode('VIEW');
  };

  const selectDraftItem = (draft: MessageDraft) => {
    setSelectedDraft(draft);
    setSelectedItem(null);
    setComposerMode('COMPOSE_NEW'); // Editing draft opens composer
  };

  // Quick reply action in the thread pane
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      // Look up participants in original message thread to keep everyone in CC
      const originalRecipients: MessageRecipient[] = selectedItem.senderId ? [{
        userId: selectedItem.senderId,
        userName: selectedItem.senderName,
        userRole: selectedItem.senderRole,
        site: selectedItem.senderSite,
        status: 'UNREAD'
      }] : [];

      const messagePayload = {
        threadId: selectedItem.threadId,
        parentId: selectedItem.messageId,
        senderId: currentUser?.email || 'system',
        senderName: currentUser?.name || 'Système',
        senderRole: currentUser?.role || 'RESPONSABLE_CHANTIER',
        senderSite: currentUser?.assignedSite || SITE_CODES[0],
        targetType: 'INDIVIDUAL' as const,
        targetUserId: selectedItem.senderId,
        subject: selectedItem.subject.startsWith('RE:') ? selectedItem.subject : `RE: ${selectedItem.subject}`,
        body: replyText,
        priority: selectedItem.priority,
        recipientIds: [selectedItem.senderId],
        recipients: originalRecipients,
        attachments: [],
        status: 'ACTIVE' as const,
        createdBy: currentUser?.email || 'system'
      };

      const isOnline = navigator.onLine;
      if (!isOnline) {
        const intentId = 'msg_' + crypto.randomUUID();
        const payload = {
          parentId: selectedItem.messageId,
          threadId: selectedItem.threadId,
          message: messagePayload
        };

        await offlineQueue.add({ intentId, type: 'replyToMessage', payload });

        const { retryQueue, setRetryQueue } = useSystemStore.getState();
        setRetryQueue([
          ...retryQueue,
          {
            intentId,
            type: 'replyToMessage',
            payload,
            retryCount: 0,
            maxRetries: 3
          }
        ]);

        toast.info("Mode hors-ligne : réponse mise en attente, elle sera envoyée dès le retour du réseau.");
        setReplyText('');
        setIsSendingReply(false);
        return;
      }

      await messagingService.replyToMessage(
        selectedItem.messageId, // parentId
        selectedItem.threadId,   // threadId
        messagePayload
      );

      toast.success('Réponse envoyée');
      setReplyText('');
    } catch (err: any) {
      toast.error(`Erreur de réponse: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Create a brand new broadcast Banner
  const handlePublishBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerBody.trim()) {
      toast.error('Veuillez remplir le titre et le corps de la bannière');
      return;
    }

    setIsCreatingBanner(true);
    try {
      await bannerService.createBanner({
        title: bannerTitle,
        body: bannerBody,
        priority: bannerPriority,
        targetSites: bannerSites as any[],
        targetRoles: bannerRoles as any[],
        startDate: new Date(bannerStart).toISOString(),
        endDate: new Date(bannerEnd).toISOString(),
        dismissible: bannerDismissible,
        status: 'ACTIVE',
        createdBy: currentUser?.email || 'admin@hydromines.com'
      });
      toast.success('Bannière de notification publiée avec succès !');
      // Reset banner form
      setBannerTitle('');
      setBannerBody('');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsCreatingBanner(false);
    }
  };

  // Helper formatting dates in French
  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return "À l'instant";
    if (diffSecs < 60) return `Il y a ${diffSecs}s`;
    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Priority layout mappings
  const priorityColors = {
    LOW: 'bg-slate-100 text-slate-600 border border-slate-200',
    NORMAL: 'bg-blue-50 text-blue-700 border border-blue-200',
    HIGH: 'bg-amber-50 text-amber-800 border border-[#d4af37]/30',
    URGENT: 'bg-red-50 text-red-800 border border-red-200 animate-pulse'
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { bg: 'bg-[#d4af37]/20 text-[#8c7017] border border-[#d4af37]/30', label: 'Super Admin' };
      case 'ADMIN':
        return { bg: 'bg-red-50 text-red-700 border border-red-100', label: 'Admin' };
      case 'MAGASINIER':
        return { bg: 'bg-yellow-50 text-yellow-800 border border-yellow-100', label: 'Magasinier' };
      case 'RESPONSABLE_CHANTIER':
        return { bg: 'bg-orange-50 text-orange-800 border border-orange-100', label: 'Resp. Chantier' };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border border-slate-200', label: 'Opérateur' };
    }
  };

  // Filtered inbox list depending on active tab
  const filteredInbox = inbox.filter(item => {
    if (activeTab === 'ARCHIVED') return item.status === 'ARCHIVED';
    return item.status !== 'ARCHIVED'; // INBOX filters
  });

  const isUserAdmin = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN');

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 py-6 px-4 md:px-8" id="messaging-page-root">
      {/* Top Navigation & Branding Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#d4af37]" />
            Centre de Communication Mine
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Flux opérationnels, consignes de sécurité, bannières et analyses de site</p>
        </div>

        {isUserAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveView('MESSAGES')}
              className={`px-4 py-2 rounded-md transition ${
                activeView === 'MESSAGES' 
                  ? 'bg-[#d4af37] text-slate-950 font-bold shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Boîte de Réception ✉️
            </button>
            <button
              onClick={() => setActiveView('TELEMETRY')}
              className={`px-4 py-2 rounded-md transition flex items-center gap-1.5 ${
                activeView === 'TELEMETRY' 
                  ? 'bg-[#d4af37] text-slate-950 font-bold shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Télémétrie &amp; Analyses 📊
            </button>
          </div>
        )}
      </div>

      {activeView === 'TELEMETRY' && isUserAdmin ? (
        <div className="max-w-7xl mx-auto">
          <TelemetryDashboard />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COL 1 (Sidebar list panel) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[750px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-lg font-extrabold text-slate-900">Messagerie</h2>
              {unreadCount > 0 && (
                <span className="bg-[#d4af37] text-slate-950 text-xs font-black px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            <button
              onClick={handleComposeNew}
              className="p-1.5 bg-[#d4af37] hover:bg-[#bfa032] text-slate-950 rounded-lg transition duration-200 cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Composer un nouveau message"
              id="new-msg-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nouveau</span>
            </button>
          </div>

          {/* Navigation tabs inside the sidebar */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('INBOX'); setComposerMode('VIEW'); }}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === 'INBOX' ? 'border-[#d4af37] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Inbox className="w-3.5 h-3.5" />
                <span>Inbox</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab('DRAFTS'); setComposerMode('VIEW'); }}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === 'DRAFTS' ? 'border-[#d4af37] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Brouillons ({drafts.length})</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab('ARCHIVED'); setComposerMode('VIEW'); }}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === 'ARCHIVED' ? 'border-[#d4af37] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                <span>Archives</span>
              </div>
            </button>
          </div>

          {/* List panel body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 bg-white">
            {isMessagingLoading ? (
              // Skeleton loaders
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 animate-pulse space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-1/3 bg-slate-200 rounded" />
                    <div className="h-3 w-1/12 bg-slate-200 rounded" />
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                </div>
              ))
            ) : activeTab === 'DRAFTS' ? (
              drafts.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">Aucun brouillon enregistré.</div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => selectDraftItem(draft)}
                    className={`p-3 rounded-lg cursor-pointer transition flex flex-col gap-1.5 ${
                      selectedDraft?.id === draft.id ? 'bg-amber-50/75 border-l-2 border-[#d4af37]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Brouillon</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#d4af37]" />
                        {formatRelativeTime(draft.lastSavedAt)}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">
                      {draft.subject || '(Sans objet)'}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {draft.body || '(Pas de contenu)'}
                    </p>
                  </div>
                ))
              )
            ) : filteredInbox.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">Boîte de réception vide.</div>
            ) : (
              filteredInbox.map((item) => {
                const roleStyle = getRoleBadgeStyle(item.senderRole);
                const isUnread = item.status === 'UNREAD';
                return (
                  <div
                    key={item.id}
                    onClick={() => selectInboxItem(item)}
                    className={`p-3 rounded-lg cursor-pointer transition flex gap-3 ${
                      selectedItem?.id === item.id ? 'bg-amber-50/75 border-l-2 border-[#d4af37]' : 'hover:bg-slate-50'
                    }`}
                    id={`inbox-item-${item.id}`}
                  >
                    {/* Role initials avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 uppercase ${roleStyle.bg}`}>
                      {(item.senderName || 'CO').slice(0, 2)}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className={`truncate ${isUnread ? 'text-[#8c7017] font-black' : 'text-slate-500'}`}>
                          {item.senderName} ({roleStyle.label})
                        </span>
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>

                      <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {item.subject}
                      </h4>

                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.body}</p>

                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${priorityColors[item.priority]}`}>
                          {item.priority}
                        </span>

                        {isUnread && (
                          <span className="w-2.5 h-2.5 bg-[#d4af37] rounded-full" title="Non lu" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COL 2 & COL 3 (Central workspace pane) */}
        <div className="lg:col-span-8 flex flex-col h-[750px] gap-6">
          {composerMode === 'COMPOSE_NEW' ? (
            <div className="flex-1 overflow-y-auto">
              <MessageComposer
                accounts={accounts}
                replyTo={selectedItem || undefined}
                initialDraft={selectedDraft || undefined}
                onSend={async (payload) => {
                  await sendMessage(payload);
                  if (selectedDraft?.id) {
                    await messagingService.deleteDraft(selectedDraft.id);
                  }
                  setComposerMode('VIEW');
                }}
                onSaveDraft={async (draft) => {
                  return await messagingService.saveDraft(draft);
                }}
              />
            </div>
          ) : selectedItem ? (
            // Discussion thread display
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
              
              {/* Message Details Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">{selectedItem.subject}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${priorityColors[selectedItem.priority]}`}>
                      {selectedItem.priority}
                    </span>
                    {selectedItem.status !== 'ARCHIVED' && (
                      <button
                        onClick={async () => {
                          await archiveMessage(selectedItem.id);
                          toast.success('Message archivé');
                          setSelectedItem(null);
                        }}
                        className="text-xs px-2.5 py-1 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-700 rounded border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-sm"
                        id="archive-btn"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archiver</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    De : <strong className="text-slate-800">{selectedItem.senderName}</strong> ({selectedItem.senderRole})
                  </span>
                  <span>•</span>
                  <span>Site : {selectedItem.senderSite}</span>
                  <span>•</span>
                  <span>Date : {new Date(selectedItem.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>

              {/* Live thread dialogue loop */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {activeThread.length === 0 ? (
                  // Single original message view
                  <div className="bg-slate-100/60 border border-slate-200 rounded-xl p-4 shadow-sm max-w-3xl">
                    <div className="text-xs font-bold text-slate-500 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span>Message Initial</span>
                      <span>{selectedItem.senderName}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{selectedItem.body}</p>
                  </div>
                ) : (
                  activeThread.map((msg, index) => {
                    const isMe = msg.createdBy === currentUser?.email;
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-3xl ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className="text-[10px] text-slate-500 mb-1 px-1 flex items-center gap-1">
                          <strong className="text-slate-700">{msg.senderName}</strong>
                          <span>({msg.senderRole})</span>
                          <span>•</span>
                          <span>{formatRelativeTime(msg.createdAt)}</span>
                        </div>

                        <div className={`p-4 rounded-xl shadow-sm border text-sm leading-relaxed whitespace-pre-wrap ${
                          isMe 
                            ? 'bg-amber-50 border-amber-200 text-slate-900' 
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          {msg.body}

                          {/* Render Attachments if present */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pièces Jointes</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {msg.attachments.map((att: any, attIdx: number) => {
                                  const isImg = att.mimeType && att.mimeType.startsWith('image/');
                                  return (
                                    <div key={attIdx} className="flex flex-col bg-slate-50 border border-slate-200 p-2 rounded-lg max-w-xs shadow-xs">
                                      {isImg && (
                                        <img
                                          src={att.originalUrl}
                                          alt={att.fileName || 'Image'}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-32 object-cover rounded-md mb-1.5 border border-slate-200 shadow-sm max-w-[200px] select-none"
                                        />
                                      )}
                                      <a
                                        href={att.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#8c7017] hover:underline flex items-center gap-1.5 font-semibold break-all"
                                      >
                                        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{att.fileName || 'Fichier'}</span>
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {isMe && msg.recipients && msg.recipients.length > 0 && (
                          <ReadReceiptBadge recipients={msg.recipients} formatRelativeTime={formatRelativeTime} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply field footer */}
              <form onSubmit={handleSendReply} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 items-end">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Écrivez une réponse rapide..."
                  rows={2}
                  className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#d4af37]"
                  required
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="p-2 bg-[#d4af37] hover:bg-[#bfa032] text-slate-950 rounded-lg transition duration-200 cursor-pointer disabled:opacity-50 flex-shrink-0 font-bold"
                  title="Répondre"
                  id="reply-send-btn"
                >
                  {isSendingReply ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>

            </div>
          ) : (
            // Empty view screen
            <div className="flex-1 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center h-full">
              <MessageSquare className="w-12 h-12 text-[#d4af37]/40 mb-3 animate-bounce" />
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Espace de Communication</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Sélectionnez un fil de discussion à gauche ou composez un nouveau message ciblé pour diffuser des consignes.
              </p>
              
              {isUserAdmin && (
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left mt-4" id="banner-admin-panel">
                  <h4 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Créer une Bannière Générale d'Alerte
                  </h4>
                  <form onSubmit={handlePublishBanner} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Titre Alerte</label>
                        <input
                          type="text"
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="Ex: Tempête de sable SMI"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#d4af37]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Priorité</label>
                        <select
                          value={bannerPriority}
                          onChange={(e) => setBannerPriority(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="LOW">Basse (LOW)</option>
                          <option value="NORMAL">Normale (NORMAL)</option>
                          <option value="HIGH">Haute (HIGH)</option>
                          <option value="URGENT">Urgente (URGENT)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Détail Consignes</label>
                      <textarea
                        value={bannerBody}
                        onChange={(e) => setBannerBody(e.target.value)}
                        placeholder="Consignes de sécurité opérationnelles..."
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#d4af37]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Sites ciblés</label>
                        <select
                          multiple
                          value={bannerSites}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setBannerSites(values);
                          }}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 h-16 focus:outline-none"
                        >
                          <option value="ALL">Tous les chantiers (ALL)</option>
                          <option value="SMI">SMI</option>
                          <option value="ST2D">ST2D</option>
                          <option value="ST2G">ST2G</option>
                          <option value="ST7">ST7</option>
                          <option value="T23">T23</option>
                          <option value="T28">T28</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Rôles ciblés</label>
                        <select
                          multiple
                          value={bannerRoles}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setBannerRoles(values);
                          }}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 h-16 focus:outline-none"
                        >
                          <option value="ALL">Tous les grades (ALL)</option>
                          <option value="SUPER_ADMIN">Super Administrateur</option>
                          <option value="ADMIN">Administrateur</option>
                          <option value="MAGASINIER">Magasinier</option>
                          <option value="RESPONSABLE_CHANTIER">Responsable Chantier</option>
                          <option value="AGREE_FORAGE">Agréé Forage</option>
                          <option value="OPERATEUR">Opérateur</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Date Début</label>
                        <input
                          type="date"
                          value={bannerStart}
                          onChange={(e) => setBannerStart(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Date Fin</label>
                        <input
                          type="date"
                          value={bannerEnd}
                          onChange={(e) => setBannerEnd(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="banner-dismiss-cb"
                          checked={bannerDismissible}
                          onChange={(e) => setBannerDismissible(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#d4af37]"
                        />
                        <label htmlFor="banner-dismiss-cb" className="ml-1.5 text-[10px] text-slate-500 cursor-pointer">
                          Fermable par l'agent
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingBanner}
                        className="bg-[#d4af37] hover:bg-[#bfa032] text-slate-950 text-xs font-bold py-1.5 px-4 rounded transition cursor-pointer flex items-center gap-1"
                        id="publish-banner-submit-btn"
                      >
                        {isCreatingBanner ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Diffuser la Bannière</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        </div>
      )}
    </div>
  );
}

function ReadReceiptBadge({ recipients, formatRelativeTime }: { recipients: MessageRecipient[]; formatRelativeTime: (iso?: string) => string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!recipients || recipients.length === 0) return null;

  const formatReceiptTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return `à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return formatRelativeTime(isoString);
  };

  if (recipients.length === 1) {
    const single = recipients[0];
    if (single.status === 'READ') {
      return (
        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1 select-none">
          <span className="font-semibold">✓✓</span> Lu {formatReceiptTime(single.readAt)}
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1 select-none">
        <span>✓</span> Envoyé
      </span>
    );
  }

  // Diffusion (multiple recipients)
  const readCount = recipients.filter(r => r.status === 'READ').length;
  const sortedRecipients = [...recipients].sort((a, b) => {
    if (a.status === 'READ' && b.status !== 'READ') return -1;
    if (a.status !== 'READ' && b.status === 'READ') return 1;
    if (a.readAt && b.readAt) return new Date(b.readAt).getTime() - new Date(a.readAt).getTime();
    return 0;
  });

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 font-semibold flex items-center gap-1 transition cursor-pointer select-none"
      >
        <span>✓✓ Lu par {readCount}/{recipients.length}</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay to close the popover */}
          <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 bottom-full mb-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 z-20 space-y-1.5 max-h-48 overflow-y-auto">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
              Destinataires ({recipients.length})
            </div>
            {sortedRecipients.map((r, i) => (
              <div key={i} className="flex justify-between items-center text-xs text-slate-700 py-0.5">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-semibold truncate">{r.userName || r.userId.split('@')[0]}</span>
                  <span className="text-[9px] text-slate-400 truncate">{r.userId}</span>
                </div>
                <div className="flex-shrink-0 text-right">
                  {r.status === 'READ' ? (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Lu {formatReceiptTime(r.readAt)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
                      Non lu
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
