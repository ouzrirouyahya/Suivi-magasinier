import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Search, 
  Archive, 
  Trash2, 
  AlertCircle, 
  Megaphone, 
  Clock, 
  Check, 
  CheckCheck, 
  CornerDownRight, 
  Plus, 
  SlidersHorizontal, 
  User as UserIcon, 
  Users as UsersIcon, 
  MapPin, 
  Shield, 
  FileText, 
  X, 
  ChevronRight, 
  Eye, 
  Sparkles, 
  ArrowLeft,
  ChevronDown,
  Activity,
  ThumbsUp,
  Download,
  Info
} from 'lucide-react';
import { useCommunication } from '../hooks/useCommunication';
import { useInventory } from '../context/InventoryContext';
import { 
  MessagePriority, 
  MessageTargetType, 
  RecipientStatus, 
  SiteCode, 
  UserRole, 
  SystemMessage, 
  UserInboxItem, 
  MessageDraft, 
  BannerNotification,
  MessageAttachment
} from '../types';
import { formatCurrency, generateSecureUUID } from '../lib/utils';
import { toast } from 'sonner';

export default function CommunicationPage() {
  const { currentUser, accounts, currentSite } = useInventory();
  const {
    inbox,
    sentMessages,
    drafts,
    activeBanners,
    loading,
    sendMessage,
    updateInboxStatus,
    saveDraft,
    deleteDraft,
    createBanner,
    disableBanner,
    getThreadMessages,
    trackTelemetry
  } = useCommunication();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'DRAFTS' | 'BANNERS'>('INBOX');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<MessagePriority | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RecipientStatus | 'UNREAD_ONLY' | 'ALL'>('UNREAD_ONLY');
  const [siteFilter, setSiteFilter] = useState<SiteCode | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Selected item detail view
  const [selectedInboxItem, setSelectedInboxItem] = useState<UserInboxItem | null>(null);
  const [selectedSentMessage, setSelectedSentMessage] = useState<SystemMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<SystemMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Composer State (for new messages or replies)
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerSubject, setComposerSubject] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerPriority, setComposerPriority] = useState<MessagePriority>('NORMAL');
  const [composerTargetType, setComposerTargetType] = useState<MessageTargetType>('INDIVIDUAL');
  const [composerTargetSite, setComposerTargetSite] = useState<SiteCode>('SMI');
  const [composerTargetRole, setComposerTargetRole] = useState<UserRole>('MAGASINIER');
  const [composerTargetUserId, setComposerTargetUserId] = useState('');
  const [composerAttachments, setComposerAttachments] = useState<MessageAttachment[]>([]);
  
  // Replying context
  const [replyingTo, setReplyingTo] = useState<SystemMessage | null>(null);

  // Reading duration / Scroll tracking ref
  const readingTimerRef = useRef<number | null>(null);
  const readingStartRef = useRef<number>(0);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollDepthRef = useRef<number>(0);

  // Admin Banners State
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerBody, setBannerBody] = useState('');
  const [bannerPriority, setBannerPriority] = useState<MessagePriority>('NORMAL');
  const [bannerSites, setBannerSites] = useState<(SiteCode | 'ALL')[]>(['ALL']);
  const [bannerRoles, setBannerRoles] = useState<(UserRole | 'ALL')[]>(['ALL']);
  const [bannerStartDate, setBannerStartDate] = useState(() => new Date().toISOString().substring(0, 16));
  const [bannerEndDate, setBannerEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().substring(0, 16);
  });
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerDismissible, setBannerDismissible] = useState(true);

  // Filtered Inbox items
  const filteredInbox = inbox.filter(item => {
    const matchesSearch = 
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'UNREAD_ONLY') {
      matchesStatus = item.status === 'UNREAD';
    } else if (statusFilter !== 'ALL') {
      matchesStatus = item.status === statusFilter;
    }

    const matchesSite = siteFilter === 'ALL' || item.senderSite === siteFilter;

    return matchesSearch && matchesPriority && matchesStatus && matchesSite;
  });

  // Filtered Sent messages
  const filteredSent = sentMessages.filter(msg => {
    const matchesSearch = 
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.body.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'ALL' || msg.priority === priorityFilter;
    const matchesSite = siteFilter === 'ALL' || msg.senderSite === siteFilter;

    return matchesSearch && matchesPriority && matchesSite;
  });

  // Fetch thread messages whenever an inbox item or sent message is selected
  useEffect(() => {
    const activeMessage = selectedInboxItem || selectedSentMessage;
    if (activeMessage) {
      setLoadingThread(true);
      getThreadMessages(activeMessage.threadId)
        .then((messages) => {
          if (messages) {
            setThreadMessages(messages);
          }
        })
        .finally(() => setLoadingThread(false));

      // Reset telemetry timer & reading parameters
      readingStartRef.current = Date.now();
      lastScrollDepthRef.current = 0;

      // Start scrolling telemetry listeners
      if (detailScrollRef.current) {
        detailScrollRef.current.scrollTop = 0;
      }
    } else {
      setThreadMessages([]);
    }
  }, [selectedInboxItem, selectedSentMessage, getThreadMessages]);

  // Track reading duration before closing details or switching tabs
  const recordReadingDuration = () => {
    const durationMs = Date.now() - readingStartRef.current;
    const durationSeconds = Math.round(durationMs / 1000);
    const activeItem = selectedInboxItem || selectedSentMessage;
    const activeMessageId = selectedInboxItem ? selectedInboxItem.messageId : (selectedSentMessage ? selectedSentMessage.id : '');
    
    if (activeItem && durationSeconds > 0) {
      // Mark as read inside inbox if it was unread and we read it for > 2 seconds
      if (selectedInboxItem && selectedInboxItem.status === 'UNREAD' && durationSeconds >= 2) {
        updateInboxStatus(selectedInboxItem.id, 'READ', durationSeconds);
      } else {
        // Just track telemetry event
        trackTelemetry('MESSAGE_CLOSED', activeMessageId, activeItem.threadId, {
          durationSeconds,
          lastScrollDepth: lastScrollDepthRef.current
        });
      }
    }
  };

  useEffect(() => {
    return () => recordReadingDuration();
  }, [selectedInboxItem, selectedSentMessage]);

  // Scroll depth tracker
  const handleScrollDepth = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    if (scrollHeight <= 0) return;

    const scrollPercentage = Math.round((target.scrollTop / scrollHeight) * 100);
    const roundedDepth = Math.floor(scrollPercentage / 25) * 25; // 25%, 50%, 75%, 100%

    const activeItem = selectedInboxItem || selectedSentMessage;
    const activeMessageId = selectedInboxItem ? selectedInboxItem.messageId : (selectedSentMessage ? selectedSentMessage.id : '');

    if (activeItem && roundedDepth > lastScrollDepthRef.current) {
      lastScrollDepthRef.current = roundedDepth;
      trackTelemetry('MESSAGE_SCROLLED', activeMessageId, activeItem.threadId, {
        scrollDepthPercent: roundedDepth
      });
    }
  };

  // Compose Reply Handler
  const handleInitiateReply = (msg: SystemMessage) => {
    setReplyingTo(msg);
    setComposerSubject(`Re: ${msg.subject}`);
    setComposerPriority(msg.priority);
    setComposerTargetType('INDIVIDUAL');
    setComposerTargetUserId(msg.senderId);
    setComposerBody(`\n\n--- Message d'origine de ${msg.senderName} (${msg.senderRole}) du ${new Date(msg.createdAt).toLocaleString()} ---\n> ${msg.body.split('\n').join('\n> ')}`);
    setComposerAttachments([]);
    setIsComposerOpen(true);

    trackTelemetry('REPLY_STARTED', msg.id, msg.threadId);
  };

  // Send composer submission
  const handleSendComposer = async () => {
    if (!composerSubject.trim()) {
      toast.error("Veuillez saisir un sujet.");
      return;
    }
    if (!composerBody.trim()) {
      toast.error("Le message est vide.");
      return;
    }
    if (composerTargetType === 'INDIVIDUAL' && !composerTargetUserId) {
      toast.error("Veuillez sélectionner un destinataire.");
      return;
    }

    try {
      await sendMessage(
        composerSubject,
        composerBody,
        composerPriority,
        composerTargetType,
        {
          site: composerTargetSite,
          role: composerTargetRole,
          userId: composerTargetUserId
        },
        composerAttachments,
        replyingTo?.id,
        replyingTo?.threadId
      );

      // Reset
      setIsComposerOpen(false);
      setComposerSubject('');
      setComposerBody('');
      setComposerAttachments([]);
      setReplyingTo(null);

      // Refresh details thread if selected message was active
      const activeItem = selectedInboxItem || selectedSentMessage;
      if (activeItem) {
        const msgs = await getThreadMessages(activeItem.threadId);
        if (msgs) setThreadMessages(msgs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add mock / simulated attachment helper
  const handleAddSimulatedAttachment = () => {
    const fileNames = [
      "Rapport_Chantier_ST7.pdf",
      "Photos_EPI_Conforme.zip",
      "Consommation_Gazole_SMI.xlsx",
      "Ordre_Maintenance_Oumejrane.docx",
      "Alerte_Stock_Min_Imiter.pdf"
    ];
    const pickedName = fileNames[Math.floor(Math.random() * fileNames.length)];
    const extension = pickedName.split('.').pop() || 'pdf';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      zip: 'application/zip',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const originalSize = Math.floor(Math.random() * 5000000 + 500000); // 500kb - 5.5mb
    const compressedSize = Math.floor(originalSize * 0.15); // 85% compression

    const newAttachment: MessageAttachment = {
      id: generateSecureUUID(),
      fileName: pickedName,
      originalUrl: `https://firebasestorage.googleapis.com/v0/b/hydro-mines/o/${pickedName}`,
      compressedUrl: `https://firebasestorage.googleapis.com/v0/b/hydro-mines/o/compressed_${pickedName}`,
      mimeType: mimeTypes[extension] || 'application/octet-stream',
      sizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.email || 'SYSTEM'
    };

    setComposerAttachments(prev => [...prev, newAttachment]);
    toast.success(`📎 Pièce jointe "${pickedName}" attachée et compressée de 85% !`);
  };

  // Create Banner Publication submission
  const handleCreateBanner = async () => {
    if (!bannerTitle.trim() || !bannerBody.trim()) {
      toast.error("Titre et contenu obligatoires pour la publication.");
      return;
    }

    try {
      await createBanner(
        bannerTitle,
        bannerBody,
        bannerPriority,
        bannerSites,
        bannerRoles,
        new Date(bannerStartDate).toISOString(),
        new Date(bannerEndDate).toISOString(),
        bannerImageUrl || undefined,
        bannerDismissible
      );

      // Reset
      setBannerTitle('');
      setBannerBody('');
      setBannerImageUrl('');
    } catch (e) {
      console.error(e);
    }
  };

  // Priority color map helper
  const getPriorityBadge = (p: MessagePriority) => {
    const styles = {
      LOW: 'bg-slate-100 text-slate-700 border-slate-200/50',
      NORMAL: 'bg-sky-50 text-sky-700 border-sky-100',
      HIGH: 'bg-amber-50 text-amber-700 border-amber-100',
      URGENT: 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${styles[p]}`}>
        {p}
      </span>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header with statistics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-500" /> Messagerie & Communications
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Système interne d'échange sécurisé de chantier Hydromines (Offline-First)
          </p>
        </div>
        
        <button
          onClick={() => {
            setReplyingTo(null);
            setComposerSubject('');
            setComposerBody('');
            setComposerAttachments([]);
            setIsComposerOpen(true);
          }}
          className="py-2.5 px-4 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(14,165,233,0.15)] select-none"
        >
          <Plus className="w-4 h-4" /> Nouveau Message
        </button>
      </div>

      {/* 2. Top Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Reçus</div>
            <div className="text-lg font-black text-slate-900">{inbox.length}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Non Lus</div>
            <div className="text-lg font-black text-slate-900">{inbox.filter(i => i.status === 'UNREAD').length}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Megaphone className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Annonces Actives</div>
            <div className="text-lg font-black text-slate-900">{activeBanners.length}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Brouillons cloud</div>
            <div className="text-lg font-black text-slate-900">{drafts.length}</div>
          </div>
        </div>
      </div>

      {/* 3. Main layout with navigation tabs */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left pane: navigation & list (4 cols) */}
        <div className="lg:col-span-5 border-r border-slate-100 flex flex-col h-full bg-slate-50/30">
          {/* Tab switches */}
          <div className="flex border-b border-slate-100 bg-white">
            <button
              onClick={() => { recordReadingDuration(); setSelectedInboxItem(null); setSelectedSentMessage(null); setActiveTab('INBOX'); }}
              className={`flex-1 py-3.5 text-center font-black text-[11px] uppercase tracking-wider border-b-2 transition-all ${activeTab === 'INBOX' ? 'border-sky-500 text-sky-500 bg-sky-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Inbox ({inbox.filter(i => i.status === 'UNREAD').length})
            </button>
            <button
              onClick={() => { recordReadingDuration(); setSelectedInboxItem(null); setSelectedSentMessage(null); setActiveTab('SENT'); }}
              className={`flex-1 py-3.5 text-center font-black text-[11px] uppercase tracking-wider border-b-2 transition-all ${activeTab === 'SENT' ? 'border-sky-500 text-sky-500 bg-sky-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Envoyés
            </button>
            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
              <button
                onClick={() => { recordReadingDuration(); setSelectedInboxItem(null); setSelectedSentMessage(null); setActiveTab('BANNERS'); }}
                className={`flex-1 py-3.5 text-center font-black text-[11px] uppercase tracking-wider border-b-2 transition-all ${activeTab === 'BANNERS' ? 'border-sky-500 text-sky-500 bg-sky-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Bannières (Admin)
              </button>
            )}
          </div>

          {/* Search, Filter bar */}
          <div className="p-4 bg-white space-y-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher sujet, contenu, expéditeur..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 rounded-xl text-xs font-bold"
              />
            </div>

            {/* Collapsible filters triggers */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-sky-500 transition-colors flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> {showFilters ? "Masquer Filtres" : "Afficher Filtres"}
              </button>
              {(priorityFilter !== 'ALL' || statusFilter !== 'UNREAD_ONLY' || siteFilter !== 'ALL') && (
                <button
                  onClick={() => { setPriorityFilter('ALL'); setStatusFilter('UNREAD_ONLY'); setSiteFilter('ALL'); }}
                  className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Filter controls */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Priorité</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold"
                  >
                    <option value="ALL">Toutes</option>
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold"
                  >
                    <option value="UNREAD_ONLY">Non lus</option>
                    <option value="ALL">Tous</option>
                    <option value="READ">Lus</option>
                    <option value="ARCHIVED">Archivés</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Site</label>
                  <select
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold"
                  >
                    <option value="ALL">Tous</option>
                    <option value="SMI">SMI</option>
                    <option value="OUMEJRANE">OUMEJRANE</option>
                    <option value="KOUDIA">KOUDIA</option>
                    <option value="BOU-AZZER">BOU-AZZER</option>
                    <option value="OUANSIMI">OUANSIMI</option>
                  </select>
                </div>
              </motion.div>
            )}
          </div>

          {/* Content Lists */}
          <div className="flex-grow overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">Chargement...</div>
            ) : activeTab === 'INBOX' ? (
              filteredInbox.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="text-slate-300 flex justify-center"><Check className="w-8 h-8" /></div>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Aucun message correspondant</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredInbox.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        recordReadingDuration();
                        setSelectedSentMessage(null);
                        setSelectedInboxItem(item);
                      }}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50 relative ${selectedInboxItem?.id === item.id ? 'bg-sky-50/40 border-l-4 border-sky-500' : ''}`}
                    >
                      {item.status === 'UNREAD' && (
                        <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      )}
                      
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[120px]">
                            {item.senderName}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {item.senderSite}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate mb-1">
                        {item.subject}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mb-2">
                        {item.body}
                      </p>

                      <div className="flex items-center justify-between">
                        {getPriorityBadge(item.priority)}
                        {item.hasAttachments && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> {item.attachmentCount} files
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'SENT' ? (
              filteredSent.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Aucun message envoyé</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSent.map(msg => (
                    <div
                      key={msg.id}
                      onClick={() => {
                        recordReadingDuration();
                        setSelectedInboxItem(null);
                        setSelectedSentMessage(msg);
                      }}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50 relative ${selectedSentMessage?.id === msg.id ? 'bg-sky-50/40 border-l-4 border-sky-500' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-800 uppercase truncate">
                            À: {msg.targetType} {msg.targetSite || msg.targetRole || msg.targetUserId}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate mb-1">
                        {msg.subject}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mb-2">
                        {msg.body}
                      </p>

                      <div className="flex items-center justify-between">
                        {getPriorityBadge(msg.priority)}
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-0.5">
                            <CheckCheck className="w-3.5 h-3.5" /> 
                            {msg.recipients.filter(r => r.status === 'READ').length}/{msg.recipients.length} lus
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Admin Banners list view */
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Bannières Actives / Planifiées
                  </h3>
                </div>

                {activeBanners.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold uppercase text-center p-6">
                    Aucune bannière active en ce moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeBanners.map(banner => (
                      <div key={banner.id} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3.5 space-y-2 relative">
                        <button
                          onClick={() => disableBanner(banner.id)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Désactiver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(banner.priority)}
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-200/70 text-slate-600 rounded uppercase">
                            Admin
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 uppercase">{banner.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{banner.body}</p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                          <span>Fin: {new Date(banner.endDate).toLocaleDateString()}</span>
                          <span>Sites: {banner.targetSites.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: message detail / banner publisher form (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white relative">
          {activeTab === 'BANNERS' && !selectedInboxItem && !selectedSentMessage ? (
            /* Admin Banners Publisher Form Panel */
            <div className="p-6 space-y-6 overflow-y-auto max-h-[600px]">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-500" /> Publier une Annonce Bannière de Chantier
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Publiez un message d'information général (AID, fêtes, urgence stock) affiché en haut de l'écran des terminaux ciblés.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Titre de la Bannière</label>
                    <input
                      type="text"
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                      placeholder="Ex: 🎉 Bonne Fête du Travail ! / ⚠️ Alerte Gazole SMI"
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500 rounded-xl py-2 px-3 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Niveau de Priorité</label>
                    <div className="flex gap-2">
                      {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as MessagePriority[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBannerPriority(p)}
                          className={`flex-1 py-2 text-[10px] font-black rounded-xl uppercase border tracking-wider transition-all ${bannerPriority === p ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contenu du Message</label>
                  <textarea
                    rows={4}
                    value={bannerBody}
                    onChange={(e) => setBannerBody(e.target.value)}
                    placeholder="Saisissez ici le texte d'annonce clair et précis..."
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500 rounded-2xl py-2 px-3 text-xs font-bold resize-none"
                  />
                </div>

                {/* Date ranges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date de Début d'Affichage</label>
                    <input
                      type="datetime-local"
                      value={bannerStartDate}
                      onChange={(e) => setBannerStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500 rounded-xl py-2 px-3 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date d'Expiration</label>
                    <input
                      type="datetime-local"
                      value={bannerEndDate}
                      onChange={(e) => setBannerEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500 rounded-xl py-2 px-3 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Advanced targeting (Multi selects or Simple arrays) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sites Ciblés</label>
                    <select
                      multiple
                      value={bannerSites}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value as SiteCode);
                        setBannerSites(selected);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500 rounded-xl py-2 px-3 text-xs font-bold h-24"
                    >
                      <option value="ALL">ALL (Tous les chantiers)</option>
                      <option value="SMI">SMI</option>
                      <option value="OUMEJRANE">OUMEJRANE</option>
                      <option value="KOUDIA">KOUDIA</option>
                      <option value="BOU-AZZER">BOU-AZZER</option>
                      <option value="OUANSIMI">OUANSIMI</option>
                    </select>
                    <span className="text-[9px] text-slate-400 font-bold block">Maintenez Ctrl/Cmd pour sélections multiples</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rôles Ciblés</label>
                    <select
                      multiple
                      value={bannerRoles}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value as UserRole);
                        setBannerRoles(selected);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-500 rounded-xl py-2 px-3 text-xs font-bold h-24"
                    >
                      <option value="ALL">ALL (Tous les utilisateurs)</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MAGASINIER">MAGASINIER</option>
                      <option value="RESPONSABLE_CHANTIER">RESPONSABLE_CHANTIER</option>
                    </select>
                  </div>
                </div>

                {/* Behaviours */}
                <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <input
                    type="checkbox"
                    id="dismissible-check"
                    checked={bannerDismissible}
                    onChange={(e) => setBannerDismissible(e.target.checked)}
                    className="w-4 h-4 text-amber-500 focus:ring-amber-400 rounded"
                  />
                  <label htmlFor="dismissible-check" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Autoriser l'utilisateur à fermer/masquer cette bannière (Dismissible)
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleCreateBanner}
                    className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <Megaphone className="w-4 h-4" /> Publier l'Annonce
                  </button>
                </div>
              </div>
            </div>
          ) : (selectedInboxItem || selectedSentMessage) ? (
            /* Active message detail pane with nested thread list */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSelectedInboxItem(null); setSelectedSentMessage(null); }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 block lg:hidden"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Visualisation de la Conversation
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      ID Thread: {(selectedInboxItem || selectedSentMessage)?.threadId.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedInboxItem && (
                    <button
                      onClick={() => {
                        updateInboxStatus(selectedInboxItem.id, 'ARCHIVED');
                        setSelectedInboxItem(null);
                        toast.success("Message archivé !");
                      }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                      title="Archiver"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message scroll list (displays main message + replies timeline) */}
              <div 
                ref={detailScrollRef}
                onScroll={handleScrollDepth}
                className="flex-grow p-6 overflow-y-auto space-y-6 bg-slate-50/20"
              >
                {/* Subject & Main Topic */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      {getPriorityBadge((selectedInboxItem || selectedSentMessage)!.priority)}
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mt-2">
                        {(selectedInboxItem || selectedSentMessage)!.subject}
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {new Date((selectedInboxItem || selectedSentMessage)!.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Sender Profile card */}
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-sky-500 text-white font-black text-xs flex items-center justify-center uppercase shadow-sm">
                      {(selectedInboxItem || selectedSentMessage)!.senderName.substring(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black text-slate-900 uppercase">
                        {(selectedInboxItem || selectedSentMessage)!.senderName}
                      </div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        {(selectedInboxItem || selectedSentMessage)!.senderRole} • Chantier: {(selectedInboxItem || selectedSentMessage)!.senderSite}
                      </div>
                    </div>
                  </div>

                  {/* Body Text */}
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white rounded-2xl border border-slate-50/50 p-1">
                    {(selectedInboxItem || selectedSentMessage)!.body}
                  </p>

                  {/* Attachments rendering */}
                  {((selectedInboxItem || selectedSentMessage) as any).attachments?.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Pièces Jointes Compressées
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {((selectedInboxItem || selectedSentMessage) as any).attachments.map((file: MessageAttachment) => (
                          <div key={file.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:bg-slate-100/50 transition-all">
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="p-2 bg-sky-500/10 text-sky-500 rounded-lg">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <div className="text-[10px] font-black text-slate-800 uppercase truncate">
                                  {file.fileName}
                                </div>
                                <div className="text-[9px] font-bold text-slate-400">
                                  {formatBytes(file.compressedSizeBytes || file.sizeBytes)} 
                                  {file.compressedSizeBytes && <span className="text-emerald-500"> (-85%)</span>}
                                </div>
                              </div>
                            </div>
                            <a
                              href={file.compressedUrl || file.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-sky-500 transition-colors shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Reply Trigger */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleInitiateReply((selectedInboxItem || selectedSentMessage) as any)}
                      className="py-2 px-4 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" /> Répondre au message
                    </button>
                  </div>
                </div>

                {/* Replies Thread / Follow-up list */}
                {loadingThread ? (
                  <div className="text-center p-4 text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                    Chargement des réponses...
                  </div>
                ) : (
                  threadMessages.length > 1 && (
                    <div className="space-y-4 relative pl-4 border-l-2 border-slate-200">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Chronologie de la Discussion ({threadMessages.length - 1} réponses)
                      </h4>
                      
                      {threadMessages.filter(m => {
                        const activeMessageId = selectedInboxItem ? selectedInboxItem.messageId : (selectedSentMessage ? selectedSentMessage.id : '');
                        return m.id !== activeMessageId && m.id !== (selectedInboxItem || selectedSentMessage)!.id;
                      }).map((reply, index) => (
                        <div key={reply.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 relative">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                            <span className="font-black text-slate-800 uppercase flex items-center gap-1">
                              <CornerDownRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              {reply.senderName} ({reply.senderRole})
                            </span>
                            <span>{new Date(reply.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed pl-4">
                            {reply.body}
                          </p>

                          {reply.attachments && reply.attachments.length > 0 && (
                            <div className="pl-4 pt-2 flex flex-wrap gap-1.5">
                              {reply.attachments.map(file => (
                                <div key={file.id} className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 px-2.5 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                  <FileText className="w-3.5 h-3.5 text-sky-500" />
                                  <span className="truncate max-w-[150px]">{file.fileName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            /* Clean Empty placeholder */
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-50/10">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                Aucune Conversation Sélectionnée
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1 max-w-sm">
                Sélectionnez un message dans la liste de gauche pour consulter son contenu et participer à la discussion.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Composer Overlay Modal (Write & Reply) */}
      <AnimatePresence>
        {isComposerOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-sky-500" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    {replyingTo ? "Rédiger une Réponse" : "Nouveau Message Interne"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsComposerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal scroll area */}
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Recipients and targeting */}
                {!replyingTo && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ciblage Destinataires</label>
                        <select
                          value={composerTargetType}
                          onChange={(e) => setComposerTargetType(e.target.value as MessageTargetType)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold"
                        >
                          <option value="INDIVIDUAL">INDIVIDUEL (Utilisateur spécifique)</option>
                          <option value="SITE">PAR CHANTIER (Tous les membres d'un site)</option>
                          <option value="ROLE">PAR RÔLE (Ex: Tous les magasiniers)</option>
                          <option value="ALL">TOUS (Diffuser à tout Hydromines)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end">
                        {composerTargetType === 'SITE' && (
                          <>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chantier Visé</label>
                            <select
                              value={composerTargetSite}
                              onChange={(e) => setComposerTargetSite(e.target.value as SiteCode)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold"
                            >
                              <option value="SMI">SMI</option>
                              <option value="OUMEJRANE">OUMEJRANE</option>
                              <option value="KOUDIA">KOUDIA</option>
                              <option value="BOU-AZZER">BOU-AZZER</option>
                              <option value="OUANSIMI">OUANSIMI</option>
                            </select>
                          </>
                        )}

                        {composerTargetType === 'ROLE' && (
                          <>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rôle Visé</label>
                            <select
                              value={composerTargetRole}
                              onChange={(e) => setComposerTargetRole(e.target.value as UserRole)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold"
                            >
                              <option value="MAGASINIER">MAGASINIER</option>
                              <option value="RESPONSABLE_CHANTIER">RESPONSABLE_CHANTIER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </select>
                          </>
                        )}

                        {composerTargetType === 'INDIVIDUAL' && (
                          <>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sélectionner l'Utilisateur</label>
                            <select
                              value={composerTargetUserId}
                              onChange={(e) => setComposerTargetUserId(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold"
                            >
                              <option value="">-- Choisissez un destinataire --</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.email}>
                                  {acc.name} ({acc.role} - {acc.assignedSite || 'ALL'})
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subject & priority */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sujet du Message</label>
                    <input
                      type="text"
                      value={composerSubject}
                      onChange={(e) => setComposerSubject(e.target.value)}
                      disabled={!!replyingTo}
                      placeholder="Ex: Demande de transfert Urgent / Rappel Inventaire SMI"
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 rounded-xl py-2 px-3 text-xs font-bold"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priorité</label>
                    <select
                      value={composerPriority}
                      onChange={(e) => setComposerPriority(e.target.value as MessagePriority)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 rounded-xl py-2 px-3 text-xs font-bold"
                    >
                      <option value="LOW">LOW (Basse)</option>
                      <option value="NORMAL">NORMAL (Standard)</option>
                      <option value="HIGH">HIGH (Haute)</option>
                      <option value="URGENT">URGENT (Immédiat)</option>
                    </select>
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Corps de Message</label>
                  <textarea
                    rows={8}
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    placeholder="Saisissez ici votre message de manière détaillée..."
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 rounded-2xl py-2.5 px-3.5 text-xs font-bold font-sans"
                  />
                </div>

                {/* Attachments panel */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Pièces Jointes Compressées ({composerAttachments.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSimulatedAttachment}
                      className="text-[9px] font-black uppercase tracking-widest text-sky-500 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Attacher un fichier de Chantier
                    </button>
                  </div>

                  {composerAttachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {composerAttachments.map(file => (
                        <div key={file.id} className="bg-white border border-slate-150 rounded-xl p-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                            <div className="truncate text-[10px] font-bold text-slate-700">
                              {file.fileName}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setComposerAttachments(prev => prev.filter(f => f.id !== file.id))}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                  <Shield className="w-3.5 h-3.5" /> Connexion sécurisée
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveDraft(
                        composerSubject,
                        composerBody,
                        composerTargetType,
                        {
                          site: composerTargetSite,
                          role: composerTargetRole,
                          userId: composerTargetUserId
                        },
                        composerAttachments,
                        undefined,
                        replyingTo?.id,
                        replyingTo?.threadId
                      );
                      setIsComposerOpen(false);
                      toast.success("Brouillon sauvegardé dans le cloud !");
                    }}
                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Enregistrer Brouillon
                  </button>
                  <button
                    type="button"
                    onClick={handleSendComposer}
                    className="py-2.5 px-5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Envoyer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
