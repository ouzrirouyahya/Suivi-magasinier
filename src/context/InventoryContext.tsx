import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../modules/auth/auth.store';
import { useArticlesStore } from '../modules/articles/articles.store';
import { useMovementsStore } from '../modules/movements/movements.store';
import { useTransfersStore } from '../modules/transfers/transfers.store';
import { useNotificationsStore } from '../modules/notifications/notifications.store';
import { useMaintenanceStore } from '../modules/maintenance/maintenance.store';
import { useSystemStore } from '../modules/system/system.store';

import { articlesService } from '../modules/articles/articles.service';
import { movementsService } from '../modules/movements/movements.service';
import { transfersService } from '../modules/transfers/transfers.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { maintenanceService } from '../modules/maintenance/maintenance.service';
import { 
  Article, 
  Mouvement, 
  MouvementItem,
  DistributionEPI, 
  AuditLog, 
  UserAccount, 
  Transfert, 
  Inventaire, 
  EnginMaster, 
  PerfoMaster, 
  AgentMaster, 
  CatalogItem, 
  PurchaseRequest, 
  AnomalyReport,
  MaintenanceLog,
  SiteCode,
  AppNotification,
  DeletionRequest
} from '../types';
import { INITIAL_ARTICLES, INITIAL_MOUVEMENTS, INITIAL_ENGINS, INITIAL_PERFOS, INITIAL_AGENTS } from '../demoData';
import { MASTER_CATALOG, CATALOG_VERSION } from '../catalogData';
import { generateId, handleFirestoreError, OperationType, cleanObject, serializeFirestoreData, generateSecureUUID } from '../lib/utils';
import { RefreshCcw } from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  doc, 
  runTransaction,
  writeBatch,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  getDocs,
  getDoc,
  Transaction,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { offlineQueue } from '../lib/offlineQueue';

const FSM_resolvers: Record<string, (payload: any, intentId: string) => Promise<any>> = {};
let isProcessingQueue = false;

const RetryQueueFSM = {
  getQueue: () => {
    try {
      const items = offlineQueue.load();
      return items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        type: item.payload?.type,
        payload: item.payload?.payload,
        intentId: item.payload?.intentId,
        siteId: item.payload?.siteId
      }));
    } catch (err) {
      console.error("Error reading queue: ", err);
      return [];
    }
  },

  registerResolver: (type: string, resolver: (payload: any, intentId: string) => Promise<any>) => {
    FSM_resolvers[type] = resolver;
  },

  enqueue: async (type: string, payload: any, intentId: string, siteId?: string) => {
    try {
      const current = offlineQueue.load();
      if (current.some(it => it.payload?.intentId === intentId)) {
        return;
      }
      offlineQueue.add({
        type,
        payload,
        intentId,
        siteId
      });
      RetryQueueFSM.triggerProcessing();
    } catch (err) {
      console.error("Error enqueuing to FSM: ", err);
    }
  },

  reconcilePendingQueueWithAuthority: async (database: any) => {
    try {
      const queue = offlineQueue.load();
      if (queue.length === 0) return;

      for (const item of queue) {
        if (!item.payload) continue;
        const { type, payload, intentId } = item.payload;
        let alreadyCommitted = false;

        try {
          if (type === 'MOUVEMENT') {
            const docSnap = await getDoc(doc(database, 'mouvements', payload.id));
            if (docSnap.exists()) alreadyCommitted = true;
          } else if (type === 'MAINTENANCE') {
            const docSnap = await getDoc(doc(database, 'maintenanceLogs', payload.id));
            if (docSnap.exists()) alreadyCommitted = true;
          } else if (type === 'TRANSFERT') {
            const docSnap = await getDoc(doc(database, 'transferts', payload.id));
            if (docSnap.exists()) alreadyCommitted = true;
          } else if (type === 'APPROVE_TRANSFERT' || type === 'COMPLETE_TRANSFERT' || type === 'CLOSE_TRANSFERT') {
            const docSnap = await getDoc(doc(database, 'transferts', payload.id));
            if (docSnap.exists()) {
              const txData = docSnap.data();
              if (type === 'APPROVE_TRANSFERT' && txData?.status !== 'PENDING_APPROVAL') {
                alreadyCommitted = true;
              }
              if (type === 'COMPLETE_TRANSFERT' && (txData?.status === 'RECEIVED' || txData?.status === 'DISPUTED' || txData?.status === 'CLOSED')) {
                alreadyCommitted = true;
              }
              if (type === 'CLOSE_TRANSFERT' && txData?.status === 'CLOSED') {
                alreadyCommitted = true;
              }
            }
          }
        } catch (err) {
          console.warn(`Could not check authority for ${intentId}`, err);
        }

        if (alreadyCommitted) {
          offlineQueue.remove(item.id);
        }
      }
    } catch (err) {
      console.error("Error in reconcilePendingQueueWithAuthority: ", err);
    }
  },

  triggerProcessing: async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    try {
      let queue = offlineQueue.load();
      while (queue.length > 0) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          break;
        }

        const item = queue[0];
        if (!item.payload) {
          offlineQueue.remove(item.id);
          queue = offlineQueue.load();
          continue;
        }

        const { type, payload, intentId } = item.payload;
        const resolver = FSM_resolvers[type];

        if (!resolver) {
          console.warn(`No resolver registered for type ${type}`);
          offlineQueue.remove(item.id);
          queue = offlineQueue.load();
          continue;
        }

        try {
          await resolver(payload, intentId);
          offlineQueue.remove(item.id);
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isNetErr = errMsg.toLowerCase().includes('network') || 
                          errMsg.toLowerCase().includes('offline') || 
                          errMsg.toLowerCase().includes('failed-precondition') || 
                          errMsg.toLowerCase().includes('unavailable') || 
                          errMsg.toLowerCase().includes('timeout') ||
                          errMsg.toLowerCase().includes('internet');
                          
          if (isNetErr) {
            break;
          } else {
            // Business error. Move to DLQ structure.
            const dlqItem = {
              id: 'dlq_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
              intentId,
              timestamp: new Date().toISOString(),
              type,
              payload,
              error: errMsg,
              status: 'PENDING'
            };

            let dlqList: any[] = [];
            try {
              const cached = localStorage.getItem('hydromines_dlq');
              dlqList = cached ? JSON.parse(cached) : [];
            } catch {}

            dlqList.push(dlqItem);
            localStorage.setItem('hydromines_dlq', JSON.stringify(dlqList));

            try {
              toast.error(`Erreur de synchronisation métier sur ${type}: ${errMsg}`);
            } catch {}

            offlineQueue.remove(item.id);
          }
        }

        queue = offlineQueue.load();
      }
    } catch (err) {
      console.error("Error in triggerProcessing: ", err);
    } finally {
      isProcessingQueue = false;
    }
  }
};

const getDLQEntries = () => {
  try {
    const cached = localStorage.getItem('hydromines_dlq');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

import { IndexedDBStorage } from '../core/indexedDBStorage';
import { getOrCreateIntent, isAlreadyCommittedInLocalRegistry } from '../core/operationIntent';
import {
  validateMouvementInvariants,
  validateMaintenanceInvariants,
  validateTransferInvariants,
  validateCompleteTransferInvariants
} from '../core/BusinessStateValidator';

type InventoryContextType = {
  articles: Article[];
  mouvements: Mouvement[];
  distributions: DistributionEPI[];
  auditLogs: AuditLog[];
  transferts: Transfert[];
  inventaires: Inventaire[];
  engins: EnginMaster[];
  perfos: PerfoMaster[];
  agents: AgentMaster[];
  catalog: CatalogItem[];
  accounts: UserAccount[];
  purchaseRequests: PurchaseRequest[];
  currentSite: SiteCode;
  setCurrentSite: React.Dispatch<React.SetStateAction<SiteCode>>;
  anomalyReports: AnomalyReport[];
  maintenanceLogs: MaintenanceLog[];
  currentUser: UserAccount | null;
  isLoaded: boolean;
  isViewer: boolean;
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (siteId: SiteCode) => Promise<void>;
  addMouvement: (m: Mouvement) => Promise<void>;
  addMaintenanceLog: (log: MaintenanceLog) => Promise<void>;
  addTransfert: (t: Transfert) => Promise<void>;
  completeTransfert: (id: string, recepteur: string, receivedItems?: MouvementItem[], disputeReason?: string) => Promise<void>;
  approveTransfert: (id: string, approuvePar: string) => Promise<void>;
  closeTransfert: (id: string, motifCloture: string) => Promise<void>;
  saveInventaire: (i: Inventaire) => Promise<void>;
  saveArticle: (a: Article) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  deleteArticles: (ids: string[]) => Promise<void>;
  importAllCatalogToArticles: (targetSite: SiteCode, excludeCostly?: boolean | number) => Promise<{ imported: number, skipped: number }>;
  importSpecificCatalogItems: (targetSite: SiteCode, items: CatalogItem[]) => Promise<{ imported: number, skipped: number }>;
  approveDeletionRequest: (requestId: string) => Promise<void>;
  rejectDeletionRequest: (requestId: string) => Promise<void>;
  deletionRequests: DeletionRequest[];
  toggleUser: (id: string) => Promise<void>;
  setUserRole: (id: string, role: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER') => Promise<void>;
  setUserAssignedSite: (id: string, site: SiteCode | '') => Promise<void>;
  setEngin: (id: string, data: Partial<EnginMaster> | null) => Promise<void>;
  setPerfo: (id: string, data: Partial<PerfoMaster> | null) => Promise<void>;
  setAgent: (id: string, data: Partial<AgentMaster> | null) => Promise<void>;
  saveCatalogItem: (item: CatalogItem) => Promise<void>;
  deleteCatalogItem: (id: string) => Promise<void>;
  addPurchaseRequest: (pr: PurchaseRequest) => Promise<void>;
  updatePRStatus: (id: string, status: any) => Promise<void>;
  loadMoreMouvements?: (lastVisibleDoc: any) => Promise<any>;

  networkQuality: 'ONLINE' | 'HIGH_LATENCY' | 'INTERMITTENT' | 'OFFLINE' | 'RECOVERING';
  isSafeMode: boolean;
  rcglResult: {
    isHighlyStale: boolean;
    hasCollectionVersionSkew: boolean;
    isGloballyConsistent: boolean;
    skewDescription?: string;
    freshnessGapMs: number;
    confidenceScore: number;
    mode: 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED';
    classification: 'NETWORK_DRIFT' | 'STATE_INCONSISTENCY' | 'TRANSACTION_CONFLICT' | 'VALID';
  };
  lastSnapshotTimestamp: number;
  setLastSnapshotTimestamp: React.Dispatch<React.SetStateAction<number>>;

  // Mode Protected Maintenance
  maintenanceMode: boolean;
  maintenanceReason: string;
  toggleMaintenanceLock: (enabled: boolean, reason?: string) => Promise<void>;

  // Observability & Industrial systems
  techLogs: { id: string; timestamp: string; type: 'INFO' | 'WARN' | 'ERROR'; message: string; duration?: number }[];
  retryQueue: any[];
  dlq: any[];
  avgTxDuration: number;
  txStats: { total: number; success: number; failed: number; contentions: number };
  isDegradedNetwork: boolean;
  setDegradedNetwork: React.Dispatch<React.SetStateAction<boolean>>;
  forceRunQueue: () => Promise<void>;
  clearDLQ: () => void;
  simulateRuleFailure: () => Promise<void>;
  simulateConcurrentConflicts: () => Promise<void>;
  collectSystemMetrics: () => any;
  exportForensic: () => string;


};

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  // --- Backing Zustand selectors to replace manual React states ---
  const rawArticles = useArticlesStore(s => s.articles);
  const setRawArticles = useArticlesStore(s => s.setArticles) as unknown as React.Dispatch<React.SetStateAction<Article[]>>;

  const rawMouvements = useMovementsStore(s => s.mouvements);
  const setRawMouvements = useMovementsStore(s => s.setMouvements) as unknown as React.Dispatch<React.SetStateAction<Mouvement[]>>;

  const distributions = useMovementsStore(s => s.distributions);
  const setDistributions = useMovementsStore(s => s.setDistributions) as unknown as React.Dispatch<React.SetStateAction<DistributionEPI[]>>;

  const rawTransferts = useTransfersStore(s => s.transferts);
  const setRawTransferts = useTransfersStore(s => s.setTransferts) as unknown as React.Dispatch<React.SetStateAction<Transfert[]>>;

  const purchaseRequests = useMovementsStore(s => s.purchaseRequests);
  const setPurchaseRequests = useMovementsStore(s => s.setPurchaseRequests) as unknown as React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;

  const anomalyReports = useMovementsStore(s => s.anomalyReports);
  const setAnomalyReports = useMovementsStore(s => s.setAnomalyReports) as unknown as React.Dispatch<React.SetStateAction<AnomalyReport[]>>;

  const rawMaintenanceLogs = useMaintenanceStore(s => s.maintenanceLogs);
  const setRawMaintenanceLogs = useMaintenanceStore(s => s.setMaintenanceLogs) as unknown as React.Dispatch<React.SetStateAction<MaintenanceLog[]>>;

  const engins = useMaintenanceStore(s => s.engins);
  const setEngins = useMaintenanceStore(s => s.setEngins) as unknown as React.Dispatch<React.SetStateAction<EnginMaster[]>>;

  const perfos = useMaintenanceStore(s => s.perfos);
  const setPerfos = useMaintenanceStore(s => s.setPerfos) as unknown as React.Dispatch<React.SetStateAction<PerfoMaster[]>>;

  const agents = useMaintenanceStore(s => s.agents);
  const setAgents = useMaintenanceStore(s => s.setAgents) as unknown as React.Dispatch<React.SetStateAction<AgentMaster[]>>;

  const catalog = useArticlesStore(s => s.catalog);
  const setCatalog = useArticlesStore(s => s.setCatalog) as unknown as React.Dispatch<React.SetStateAction<CatalogItem[]>>;

  const deletionRequests = useArticlesStore(s => s.deletionRequests);
  const setDeletionRequests = useArticlesStore(s => s.setDeletionRequests) as unknown as React.Dispatch<React.SetStateAction<DeletionRequest[]>>;

  const notifications = useNotificationsStore(s => s.notifications);
  const setNotifications = useNotificationsStore(s => s.setNotifications) as unknown as React.Dispatch<React.SetStateAction<AppNotification[]>>;

  const accounts = useAuthStore(s => s.accounts);
  const setAccounts = useAuthStore(s => s.setAccounts) as unknown as React.Dispatch<React.SetStateAction<UserAccount[]>>;

  const [inventaires, setInventaires] = useState<Inventaire[]>([]);

  // Auth & Roles
  const currentUser = useAuthStore(s => s.currentUser) as any;
  const setCurrentUser = useAuthStore(s => s.setCurrentUser);

  const currentSite = useAuthStore(s => s.currentSite);
  const setCurrentSite = useAuthStore(s => s.setCurrentSite);

  const isLoaded = useAuthStore(s => s.isLoaded);
  const setIsLoaded = useAuthStore(s => s.setIsLoaded);

  const [authStateReady, setAuthStateReady] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [recentlyCreatedArticles, setRecentlyCreatedArticles] = useState<Article[]>([]);
  const hasSetInitialSite = useRef(false);

  const addNotification = React.useCallback(async (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead' | 'severity' | 'status'> & { severity?: any; status?: any }) => {
    const id = generateSecureUUID();
    const typeVal = notif.type || 'INFO';
    const severityVal = notif.severity || (typeVal as any);
    const statusVal = notif.status || 'unread';

    const newNotif: AppNotification = {
      ...notif,
      id,
      timestamp: new Date().toISOString(),
      isRead: false,
      severity: severityVal,
      status: statusVal
    };
    try {
      await setDoc(doc(db, 'notifications', id), cleanObject(newNotif));
    } catch (err) {
      console.warn("Failed to write notification to Firestore, saving in local state", err);
      setNotifications(prev => [newNotif, ...prev]);
    }
  }, []);

  const markNotificationAsRead = React.useCallback(async (id: string) => {
    try {
      await setDoc(doc(db, 'notifications', id), { isRead: true, status: 'read' }, { merge: true });
    } catch (err) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, status: 'read' as any } : n));
    }
  }, []);

  const markAllNotificationsAsRead = React.useCallback(async (siteId: SiteCode) => {
    const unread = notifications.filter(n => n.siteId === siteId && !n.isRead);
    for (const notif of unread) {
      try {
        await setDoc(doc(db, 'notifications', notif.id), { isRead: true, status: 'read' }, { merge: true });
      } catch (err) {
        setNotifications(prev => prev.map(n => n.siteId === siteId ? { ...n, isRead: true, status: 'read' as any } : n));
      }
    }
  }, [notifications]);

  // Mode Protected Maintenance SRE States
  const maintenanceMode = useSystemStore(s => s.maintenanceMode);
  const setMaintenanceMode = useSystemStore(s => s.setMaintenanceMode);

  const maintenanceReason = useSystemStore(s => s.maintenanceReason);
  const setMaintenanceReason = useSystemStore(s => s.setMaintenanceReason);



  const isViewer = React.useMemo(() => {
    return !currentUser || currentUser.role === 'LECTURE_SEULE';
  }, [currentUser]);

  const isViewerRef = React.useRef(isViewer);
  React.useEffect(() => {
    isViewerRef.current = isViewer;
  }, [isViewer]);

  const checkWritePermission = () => {
    // Write permissions are checked in firestore rules or simulated
  };

  const isSimulationMode = () => {
    return isViewerRef.current;
  };

  const checkMaintenanceLock = () => {
    if (maintenanceMode && currentUser?.role !== 'ADMIN') {
      const msg = `PROTECTED_MAINTENANCE_LOCK: Toutes les opérations d'écriture sont temporairement verrouillées pour maintenance de sécurité. Raison: ${maintenanceReason || 'Lock global de sécurité'}`;
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // --- INDUSTRIAL OBSERVABILITY & SECURE QUEUE STATES ---
  const techLogs = useSystemStore(s => s.techLogs) as any;
  const setTechLogs = useSystemStore(s => s.addTechLog) as any;

  const retryQueue = useSystemStore(s => s.retryQueue);
  const setRetryQueue = useSystemStore(s => s.setRetryQueue);

  const dlq = useSystemStore(s => s.dlq);
  const setDlq = useSystemStore(s => s.setDLQ);

  // Dynamic status check synchronizer
  const refreshFSMStates = () => {
    setRetryQueue(RetryQueueFSM.getQueue());
    setDlq(getDLQEntries());
  };

  // --- STATE RECONCILIATION & CONSENSUS MERGE ENGINE (Rule 1) ---
  const articles = React.useMemo(() => {
    const mergedMap = new Map<string, Article>(rawArticles.map(a => [a.id, { ...a }]));
    
    // Merge recently created articles that might not have synced via Firestore snapshot yet
    for (const a of recentlyCreatedArticles) {
      if (!mergedMap.has(a.id)) {
        mergedMap.set(a.id, { ...a });
      }
    }

    const pendingItems = RetryQueueFSM.getQueue();
    const dlqExclusionIntents = new Set(getDLQEntries().map(d => d.intentId));

    for (const op of pendingItems) {
      if (isAlreadyCommittedInLocalRegistry(op.intentId) || dlqExclusionIntents.has(op.intentId)) {
        continue;
      }
      if (op.type === 'MOUVEMENT') {
        const mv = op.payload as Mouvement;
        const isAddition = mv.type === 'ENTREE' || mv.type === 'TRANSFERT_IN' || mv.type === 'RETOUR';
        for (const item of mv.items) {
          const art = mergedMap.get(item.articleId);
          if (art) {
            art.quantity = isAddition ? art.quantity + item.quantity : art.quantity - item.quantity;
          }
        }
      } else if (op.type === 'MAINTENANCE') {
        const log = op.payload as MaintenanceLog;
        if (log.partsUsed) {
          for (const part of log.partsUsed) {
            const art = mergedMap.get(part.articleId);
            if (art) {
              art.quantity = art.quantity - part.quantity;
            }
          }
        }
      }
    }
    return Array.from(mergedMap.values());
  }, [rawArticles, recentlyCreatedArticles, retryQueue, dlq]);

  // Clean up recentlyCreatedArticles once they appear in rawArticles
  useEffect(() => {
    if (rawArticles.length > 0 && recentlyCreatedArticles.length > 0) {
      setRecentlyCreatedArticles(prev => prev.filter(req => !rawArticles.some(a => a.id === req.id)));
    }
  }, [rawArticles, recentlyCreatedArticles.length]);



  const mouvements = React.useMemo(() => {
    const list = [...rawMouvements];
    const pendingItems = RetryQueueFSM.getQueue();
    const dlqExclusionIntents = new Set(getDLQEntries().map(d => d.intentId));

    for (const op of pendingItems) {
      if (op.type === 'MOUVEMENT') {
        if (isAlreadyCommittedInLocalRegistry(op.intentId) || dlqExclusionIntents.has(op.intentId)) {
          continue;
        }
        if (!list.some(m => m.id === op.payload.id)) {
          list.unshift({
            ...op.payload,
            isSyncing: true
          });
        }
      }
    }
    return list;
  }, [rawMouvements, retryQueue, dlq]);

  const transferts = React.useMemo(() => {
    const list = [...rawTransferts];
    const pendingItems = RetryQueueFSM.getQueue();
    const dlqExclusionIntents = new Set(getDLQEntries().map(d => d.intentId));

    for (const op of pendingItems) {
      if (op.type === 'TRANSFERT') {
        if (isAlreadyCommittedInLocalRegistry(op.intentId) || dlqExclusionIntents.has(op.intentId)) {
          continue;
        }
        if (!list.some(t => t.id === op.payload.id)) {
          list.unshift({
            ...op.payload,
            isSyncing: true
          });
        }
      }
    }
    return list;
  }, [rawTransferts, retryQueue, dlq]);

  const maintenanceLogs = React.useMemo(() => {
    const list = [...rawMaintenanceLogs];
    const pendingItems = RetryQueueFSM.getQueue();
    const dlqExclusionIntents = new Set(getDLQEntries().map(d => d.intentId));

    for (const op of pendingItems) {
      if (op.type === 'MAINTENANCE') {
        if (isAlreadyCommittedInLocalRegistry(op.intentId) || dlqExclusionIntents.has(op.intentId)) {
          continue;
        }
        if (!list.some(l => l.id === op.payload.id)) {
          list.unshift({
            ...op.payload,
            isSyncing: true
          });
        }
      }
    }
    return list;
  }, [rawMaintenanceLogs, retryQueue, dlq]);
  const [lastSnapshotTimestamp, setLastSnapshotTimestamp] = useState<number>(Date.now());
  const rcglResult = {
    isHighlyStale: false,
    hasCollectionVersionSkew: false,
    isGloballyConsistent: true,
    skewDescription: undefined as string | undefined,
    freshnessGapMs: 0,
    confidenceScore: 1.0,
    mode: 'NORMAL' as 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED',
    classification: 'VALID' as 'NETWORK_DRIFT' | 'STATE_INCONSISTENCY' | 'TRANSACTION_CONFLICT' | 'VALID'
  };

  const isSafeMode = false;

  const [avgTxDuration, setAvgTxDuration] = useState<number>(145);
  const [txStats, setTxStats] = useState({ total: 0, success: 0, failed: 0, contentions: 0 });
  const [isDegradedNetwork, setDegradedNetwork] = useState(false);
  const activeTxCount = useRef(0);

  const addTechLog = (type: 'INFO' | 'WARN' | 'ERROR', message: string, duration?: number) => {
    const log = {
      id: generateSecureUUID(),
      timestamp: new Date().toISOString(),
      type,
      message,
      duration
    };
    setTechLogs(prev => [log, ...prev].slice(0, 300));
  };

  const updateAvgTxDuration = (duration: number) => {
    setAvgTxDuration(prev => Math.round(0.15 * duration + 0.85 * prev));
  };

  const isNetworkError = (msgMsg: string, errorCode?: string): boolean => {
    const msg = msgMsg.toLowerCase();
    
    // Codes Firestore qui indiquent une VRAIE coupure réseau
    const networkCodes = ['unavailable', 'deadline-exceeded'];
    if (errorCode && networkCodes.includes(errorCode)) {
      return true;
    }
    
    // Vérification textuelle stricte (mots-clés réseau uniquement,
    // SANS 'failed-precondition' qui est une erreur de règles/logique)
    const networkKeywords = [
      'network error', 'net::err', 'offline', 'no internet', 
      'connexion internet', 'délai d\'attente dépassé', 'fetch failed'
    ];
    return networkKeywords.some(kw => msg.includes(kw));
  };

  // Automatic FSM Queue background retry processor & startup Self-Healing (Rule 4)
  useEffect(() => {
    // 1. Register transaction resolvers with central FIFO FSM
    RetryQueueFSM.registerResolver('MOUVEMENT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM MOUVEMENT démarrée : ${intentId}`);
      await executeMouvementDirect(payload);
      addNotification({
        siteId: payload.site || 'SMI',
        type: 'INFO',
        category: 'SYNC',
        message: `Idempotence & Synchro Cloud OK pour mouvement ${intentId.slice(0, 8)}...`,
        actionRoute: 'TRACEABILITY'
      });
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('MAINTENANCE', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM MAINTENANCE démarrée : ${intentId}`);
      await executeMaintenanceLogDirect(payload);
      addNotification({
        siteId: currentUser?.site || 'SMI',
        type: 'INFO',
        category: 'SYNC',
        message: `Rapport de maintenance FSM synchronisé pour machine : ${payload.machineId}`,
        actionRoute: 'MAINTENANCE'
      });
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM TRANSFERT démarrée : ${intentId}`);
      await executeTransfertDirect(payload);
      addNotification({
        siteId: payload.sourceSite || 'SMI',
        type: 'INFO',
        category: 'SYNC',
        message: `Envoi de transfert synchronisé vers ${payload.targetSite}`,
        actionRoute: 'TRANSFERS_RETURNS'
      });
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('COMPLETE_TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM COMPLETE_TRANSFERT démarrée : ${intentId}`);
      await executeCompleteTransfertDirect(payload.id, payload.recepteur, payload.receivedItems, payload.disputeReason);
      addNotification({
        siteId: currentUser?.site || 'SMI',
        type: 'INFO',
        category: 'SYNC',
        message: `Réception de transfert synchronisée (ID: ${payload.id.slice(0, 8)})`,
        actionRoute: 'TRANSFERS_RETURNS'
      });
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('APPROVE_TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM APPROVE_TRANSFERT démarrée : ${intentId}`);
      await executeApproveTransfertDirect(payload.id, payload.approuvePar);
      addNotification({
        siteId: currentUser?.site || 'SMI',
        type: 'INFO',
        category: 'SYNC',
        message: `Approbation de transfert synchronisée avec succès.`,
        actionRoute: 'TRANSFERS_RETURNS'
      });
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('CLOSE_TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM CLOSE_TRANSFERT démarrée : ${intentId}`);
      await executeCloseTransfertDirect(payload.id, payload.motifCloture);
      addNotification({
        siteId: currentUser?.site || 'SMI',
        type: 'INFO',
        category: 'SYNC',
        message: `Clôture de transfert synchronisée avec succès.`,
        actionRoute: 'TRANSFERS_RETURNS'
      });
      return { status: 'SUCCESS_ACK' };
    });

    // 2. Refresh FSM state on react side periodically
    const interval = setInterval(() => {
      refreshFSMStates();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // On App Boot when loaded and connected, trigger automated Self-Healing Queue Reconciliation (Rule 4)
  useEffect(() => {
    const handleSelfHealingReconciliation = async () => {
      addTechLog('INFO', 'Démarrage de la réconciliation de sécurité sur l\'autorité Firestore...');
      try {
        await RetryQueueFSM.reconcilePendingQueueWithAuthority(db);
        refreshFSMStates();
        addTechLog('INFO', 'Réconciliation terminée. File d\'attente purifiée.');
        
        // Trigger queue retry loop
        RetryQueueFSM.triggerProcessing();
      } catch (err) {
        addTechLog('WARN', 'Échec temporaire de la réconciliation autonome (hors-ligne).');
      }
    };

    if (isLoaded && auth.currentUser) {
      handleSelfHealingReconciliation();
    }
  }, [isLoaded, authStateReady]);

  // Window online automatic trigger listener
  useEffect(() => {
    const handleOnline = async () => {
      addTechLog('INFO', 'Connexion réseau rétablie détectée. Lancement de la synchronisation...');
      toast.success("Connexion réseau rétablie. Lancement de la synchronisation de vos opérations...");
      try {
        await RetryQueueFSM.reconcilePendingQueueWithAuthority(db);
        await RetryQueueFSM.triggerProcessing();
        refreshFSMStates();
      } catch (err) {
        console.warn("Error reconciling on online event: ", err);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isLoaded]);

  // Anti-replay and cross-session pending operations tracking
  const [pendingOperations, setPendingOperations] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('hydromines_pending_ops');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const activePromisesRef = useRef<Record<string, Promise<any>>>({});

  const registerPendingOp = (id: string) => {
    setPendingOperations(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('hydromines_pending_ops', JSON.stringify(next));
      return next;
    });
  };

  const unregisterPendingOp = (id: string) => {
    setPendingOperations(prev => {
      const next = prev.filter(x => x !== id);
      localStorage.setItem('hydromines_pending_ops', JSON.stringify(next));
      return next;
    });
  };

  // Persistent Cache for Offline Support
  useEffect(() => {
    if (articles.length > 0) IndexedDBStorage.saveCollection('articles', articles);
    if (catalog.length > 0) IndexedDBStorage.saveCollection('catalog', catalog);
    if (mouvements.length > 0) IndexedDBStorage.saveCollection('mouvements', mouvements);
    if (maintenanceLogs.length > 0) IndexedDBStorage.saveCollection('maintenanceLogs', maintenanceLogs);
    if (transferts.length > 0) IndexedDBStorage.saveCollection('transferts', transferts);
  }, [articles, catalog, mouvements, maintenanceLogs, transferts]);

  // Load cache if offline or slow
  useEffect(() => {
    const loadHardenCaches = async () => {
      try {
        const articlesCached = await IndexedDBStorage.getCollection<Article>('articles');
        if (articlesCached.length > 0 && rawArticles.length === 0) setRawArticles(articlesCached);

        const catalogCached = await IndexedDBStorage.getCollection<CatalogItem>('catalog');
        if (catalogCached.length > 0 && catalog.length === 0) setCatalog(catalogCached);

        const movementsCached = await IndexedDBStorage.getCollection<Mouvement>('mouvements');
        if (movementsCached.length > 0 && rawMouvements.length === 0) setRawMouvements(movementsCached);

        const maintenanceCached = await IndexedDBStorage.getCollection<MaintenanceLog>('maintenanceLogs');
        if (maintenanceCached.length > 0 && rawMaintenanceLogs.length === 0) setRawMaintenanceLogs(maintenanceCached);

        const transfertsCached = await IndexedDBStorage.getCollection<Transfert>('transferts');
        if (transfertsCached.length > 0 && rawTransferts.length === 0) setRawTransferts(transfertsCached);
      } catch (err) {
        addTechLog('WARN', 'Échec du chargement initial de la base de stockage endurcie.');
      }
    };
    loadHardenCaches();
  }, []);

  // Low Stock Detection
  useEffect(() => {
    if (!isLoaded || articles.length === 0) return;
    
    const lowStockArticles = articles.filter(a => a.quantity <= a.minStock && a.quantity > 0);
    const criticalArticles = articles.filter(a => a.quantity === 0);

    const newNotifications: any[] = [];
    
    if (criticalArticles.length > 0) {
      newNotifications.push({
        id: `rupture-${Date.now()}`,
        type: 'CRITICAL',
        message: `${criticalArticles.length} articles en rupture totale de stock !`,
        timestamp: new Date().toISOString()
      });
    }

    if (lowStockArticles.length > 0) {
      newNotifications.push({
        id: `low-${Date.now()}`,
        type: 'WARNING',
        message: `${lowStockArticles.length} articles ont atteint le seuil critique.`,
        timestamp: new Date().toISOString()
      });
    }

    setNotifications(newNotifications);
  }, [articles, isLoaded]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthStateReady(true);
    });
  }, []);

  // Sync Logic (Migrated from useStorage hook for central management)
  useEffect(() => {
    if (!authStateReady) return;

    if (!auth.currentUser) {
      setCurrentUser(null);
      hasSetInitialSite.current = false;
      setIsLoaded(true);
      return;
    }

    const uid = auth.currentUser.uid;
    const unsubUser = onSnapshot(doc(db, 'accounts', uid), async (snap) => {
      if (snap.exists()) {
        const userData = serializeFirestoreData({ id: snap.id, ...snap.data() }) as UserAccount;
        if (auth.currentUser?.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
          userData.role = 'SUPER_ADMIN';
          userData.active = true;
        }
        if (userData.assignedSite && !hasSetInitialSite.current) {
          setCurrentSite(userData.assignedSite);
          hasSetInitialSite.current = true;
        }
        setCurrentUser(userData);
        setIsLoaded(true);
      } else {
        // Le compte n'existe pas encore en base — ne PAS le créer ici 
        // automatiquement avec active: true. La création se fait désormais 
        // exclusivement via l'écran de demande d'accès dans LoginPage.tsx 
        // (Partie 2), avec active: false et status: 'PENDING'.
        // On définit un currentUser temporaire minimal pour qu'App.tsx 
        // puisse détecter ce cas et afficher l'écran d'attente (Partie 4).
        
        if (auth.currentUser?.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
          // Exception : le compte super-admin racine garde son comportement 
          // actuel (toujours actif, jamais bloqué)
          const newUser: UserAccount = {
            id: uid,
            email: auth.currentUser?.email || '',
            name: auth.currentUser?.displayName || 'Utilisateur',
            role: 'SUPER_ADMIN',
            active: true,
            status: 'APPROVED',
            createdAt: new Date().toISOString()
          };
          setCurrentUser(newUser);
          setDoc(doc(db, 'accounts', uid), cleanObject(newUser))
            .then(() => setIsLoaded(true))
            .catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `accounts/${uid}`);
              setIsLoaded(true);
            });
        } else {
          // Compte pas encore créé du tout : LoginPage.tsx s'occupe de la 
          // création via l'écran de demande. En attendant, on ne définit 
          // pas currentUser (reste null), ce qui affichera naturellement 
          // l'écran de connexion/attente.
          setCurrentUser(null);
          setIsLoaded(true);
        }
      }
    }, () => setIsLoaded(true));

    return () => unsubUser();
  }, [authStateReady]);

  // Sync Notification Logic
  useEffect(() => {
    if (isLoaded && articles.length > 0 && authStateReady && currentUser) {
      const hasNotified = sessionStorage.getItem('hydromines_sync_notified');
      if (!hasNotified) {
        toast.success('Données synchronisées avec le Cloud Hydromines', {
          description: 'Flux temps réel activé.',
          icon: <RefreshCcw className="w-4 h-4 text-emerald-500 animate-spin" />,
          duration: 3000
        });
        sessionStorage.setItem('hydromines_sync_notified', 'true');
      }
    }
  }, [isLoaded, articles.length, authStateReady, currentUser]);

  useEffect(() => {
    if (!isLoaded || !currentUser || !currentUser.active || !auth.currentUser) return;

    const unsubs: (() => void)[] = [];

    const setupDataListeners = async () => {
      const loadStaticCollection = async (
        colName: string, 
        setter: (data: any[]) => void
      ) => {
        try {
          const cached = await IndexedDBStorage.getCollection<any>(colName);
          if (cached && cached.length > 0) {
            setter(cached);
          }
          const snap = await getDocs(collection(db, colName));
          const data = snap.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data())
          })).filter((item: any) => !item.deleted);
          setter(data);
          await IndexedDBStorage.saveCollection(colName, data);
        } catch (err: any) {
          console.error(`Error loading static collection ${colName}:`, err);
          if (err.code !== 'permission-denied') {
            handleFirestoreError(err, OperationType.LIST, colName);
          }
        }
      };

      const safeOnSnapshot = (ref: any, setter: any, path: string) => {
        return onSnapshot(ref, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => {
            const raw = { id: doc.id, ...doc.data() };
            const serialized = serializeFirestoreData(raw);
            if (path === 'notifications') {
              return {
                ...serialized,
                severity: serialized.severity || serialized.type || 'INFO',
                status: serialized.status || (serialized.isRead ? 'read' : 'unread')
              };
            }
            return serialized;
          });
          
          setter((prev: any[]) => {
            const merged = data.filter((item: any) => !item.deleted);
            
            // Handle specific sorting if needed:
            if (path === 'mouvements' || path === 'maintenanceLogs' || path === 'auditLogs' || path === 'notifications') {
              const dateField = path === 'auditLogs' || path === 'notifications' ? 'timestamp' : 'date';
              const getSafeTime = (val: any): number => {
                if (!val) return Date.now();
                if (typeof val === 'string') {
                  const parsed = Date.parse(val);
                  return isNaN(parsed) ? 0 : parsed;
                }
                if (val && typeof val === 'object') {
                  if (typeof val.toDate === 'function') {
                    try {
                      return val.toDate().getTime();
                    } catch (e) {}
                  }
                  if (typeof val.seconds === 'number') {
                    return val.seconds * 1000;
                  }
                  if (val.toDateString) {
                    try {
                      return new Date(val).getTime();
                    } catch (e) {}
                  }
                }
                try {
                  const t = new Date(val).getTime();
                  return isNaN(t) ? 0 : t;
                } catch (e) {
                  return 0;
                }
              };
              return merged.sort((a, b) => getSafeTime(b[dateField]) - getSafeTime(a[dateField]));
            }
            return merged;
          });

          setLastSnapshotTimestamp(Date.now());
        }, (err) => {
          if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, path);
        });
      };

      // Seeding & Version-based migration logic (Articles, Catalog, Engins, etc.)
      const runSeedingAndMigrations = async () => {
        try {
          // Check Catalog Version
          const metaRef = doc(db, 'metadata', 'catalog_version');
          const metaSnap = await getDoc(metaRef);
          const currentVer = metaSnap.exists() ? metaSnap.data().version : null;

          if (currentVer !== CATALOG_VERSION) {
            console.log(`[Catalog Migration] Upgrading catalog from ${currentVer || 'none'} to ${CATALOG_VERSION}...`);
            
            // Step 1: Retrieve and delete old catalog documents
            const oldCatalogSnap = await getDocs(collection(db, 'catalog'));
            const deleteBatch = writeBatch(db);
            let delCount = 0;
            
            oldCatalogSnap.docs.forEach(docSnap => {
              deleteBatch.delete(docSnap.ref);
              delCount++;
            });
            
            if (delCount > 0) {
              await deleteBatch.commit();
              console.log(`[Catalog Migration] Deleted ${delCount} old catalog documents.`);
            }

            // Step 2: Seed new MASTER_CATALOG in chunks of 450 to avoid Firestore limits
            const chunkSize = 450;
            for (let i = 0; i < MASTER_CATALOG.length; i += chunkSize) {
              const chunk = MASTER_CATALOG.slice(i, i + chunkSize);
              const insertBatch = writeBatch(db);
              chunk.forEach((item: any) => {
                insertBatch.set(doc(db, 'catalog', item.id || generateId()), cleanObject(item));
              });
              await insertBatch.commit();
            }
            console.log(`[Catalog Migration] Successfully seeded ${MASTER_CATALOG.length} new MASTER_CATALOG items.`);

            // Step 3: Write new version document to Firestore metadata to avoid repeated runs
            await setDoc(metaRef, { version: CATALOG_VERSION });
          } else {
            // General Fallback Seeding (just in case catalog collection is empty)
            const snap = await getDocs(query(collection(db, 'catalog'), limit(1)));
            if (snap.empty) {
              const chunkSize = 450;
              for (let i = 0; i < MASTER_CATALOG.length; i += chunkSize) {
                const chunk = MASTER_CATALOG.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(item => batch.set(doc(db, 'catalog', item.id || generateId()), cleanObject(item)));
                await batch.commit();
              }
            }
          }

          // Articles & Missing High-Frequency Maintenance Parts Auto-Injection System
          const articlesSnap = await getDocs(collection(db, 'articles'));
          const existingMap = new Set<string>();
          articlesSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.site && data.ref) {
              existingMap.add(`${data.site.toUpperCase()}_${data.ref.trim().toLowerCase()}`);
            }
          });

          if (articlesSnap.empty) {
            const batch = writeBatch(db);
            INITIAL_ARTICLES.forEach(item => {
              const itemWithId = { ...item, id: item.id || generateId() };
              batch.set(doc(db, 'articles', itemWithId.id), cleanObject(itemWithId));
              if (itemWithId.site && itemWithId.ref) {
                existingMap.add(`${itemWithId.site.toUpperCase()}_${itemWithId.ref.trim().toLowerCase()}`);
              }
            });
            await batch.commit();
          }

          // Automatically inject the highly requested V6.0 maintenance parts (under 25,000 MAD)
          // so they are available inside stock sheets (fiches articles) instantly without manual import clicks!
          const sites: SiteCode[] = ['SMI', 'OUMEJRANE', 'KOUDIA', 'BOU-AZZER', 'OUANSIMI'];
          const hfReferences = [
            "3115 1254 00", // Piston d'amortissement COP 1838
            "5580 1450 88", // Accouplement cannelé
            "5580 9100 12", // Pistolet pneumatique de graissage
            "5580 0012 34", // Kit flexibles de flèche ST2
            "5580 0760 11", // Axe et bagues d'articulation centrale
            "5580 1204 99", // Électrovanne Parker 24V
            "3128 3004 55", // Patins Ertalon glissière
            "3115 0262 00", // Accumulateur d'impact HP
            "3115 0001 99", // Mallette de gonflage azote
            "3115 5012 80", // Joints toriques de rinçage d'eau
            "3115 9942 10", // Raccord d'eau tournant en bronze
            "5580 2004 01", // Bouton d'arrêt d'urgence
            "5580 8872 15", // Détecteur inductif M18
            "0423 3897 00", // Injecteur Deutz 914
            "0118 0100 24"  // Bougie de préchauffage 24V
          ];

          // Select any items from MASTER_CATALOG starting with "mine_", in hfReferences, or with price less than 25,000 MAD
          const itemsToAutoSeed = MASTER_CATALOG.filter(item => 
            (item.price || 0) < 25000 || hfReferences.includes(item.reference) || (item.id && item.id.toLowerCase().startsWith("mine_"))
          );

          const toCreate: Article[] = [];
          for (const siteCode of sites) {
            for (const item of itemsToAutoSeed) {
              const refKey = `${siteCode.toUpperCase()}_${item.reference.trim().toLowerCase()}`;
              if (!existingMap.has(refKey)) {
                // Ensure unique ID based on site + item.id
                const artId = `${siteCode.toLowerCase()}_${item.id || generateId()}`;
                const art: Article = {
                  id: artId,
                  site: siteCode,
                  ref: item.reference,
                  designation: item.designation,
                  type: item.suggestedType || 'CONSOMMABLES',
                  category: item.functionalCategory || 'Consommables',
                  functionalCategory: item.functionalCategory,
                  subCategory: item.subCategory,
                  component: item.component,
                  subComponent: item.subComponent,
                  compatibility: item.compatibility,
                  criticality: item.criticality || 'HAUTE',
                  unit: 'Pcs',
                  quantity: 0, // initially empty, ready for entry/movement
                  minStock: 2,
                  location: siteCode === 'SMI' ? 'RAY-AUTO-A' : 'M-01',
                  price: item.price || 0,
                  active: true,
                  notes: item.notes || ''
                };
                toCreate.push(art);
                existingMap.add(refKey);
              }
            }
          }

          if (toCreate.length > 0) {
            const chunkSize = 450;
            for (let i = 0; i < toCreate.length; i += chunkSize) {
              const chunk = toCreate.slice(i, i + chunkSize);
              const writeB = writeBatch(db);
              chunk.forEach(art => {
                writeB.set(doc(db, 'articles', art.id), cleanObject(art));
              });
              await writeB.commit();
            }
            console.log(`[Auto-Injection] Successfully auto-injected ${toCreate.length} missing stock fiches.`);
          }

          // Engins
          const enginsSnap = await getDocs(query(collection(db, 'engins'), limit(1)));
          if (enginsSnap.empty) {
            const batch = writeBatch(db);
            INITIAL_ENGINS.forEach(item => batch.set(doc(db, 'engins', item.id || generateId()), cleanObject(item)));
            await batch.commit();
          }

        } catch (error) {
          console.error("[Catalog Migration Error] Failed during version migration:", error);
        }
      };

      runSeedingAndMigrations();

      const articlesRef = collection(db, 'articles');
      let articlesQuery;
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
        articlesQuery = articlesRef;
      } else {
        articlesQuery = query(articlesRef, where('site', '==', currentSite));
      }
      unsubs.push(safeOnSnapshot(articlesQuery, setRawArticles, 'articles'));

      unsubs.push(safeOnSnapshot(query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(1000)), setRawMouvements, 'mouvements'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200)), setAuditLogs, 'auditLogs'));
      unsubs.push(safeOnSnapshot(collection(db, 'transferts'), setRawTransferts, 'transferts'));
      unsubs.push(safeOnSnapshot(collection(db, 'inventaires'), setInventaires, 'inventaires'));

      loadStaticCollection('catalog', setCatalog);
      loadStaticCollection('engins', setEngins);
      loadStaticCollection('perfos', setPerfos);
      loadStaticCollection('agents', setAgents);
      unsubs.push(safeOnSnapshot(collection(db, 'distributions'), setDistributions, 'distributions'));
      unsubs.push(safeOnSnapshot(collection(db, 'purchaseRequests'), setPurchaseRequests, 'purchaseRequests'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'anomalyReports')), setAnomalyReports, 'anomalyReports'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'maintenanceLogs'), orderBy('date', 'desc'), limit(1000)), setRawMaintenanceLogs, 'maintenanceLogs'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(150)), setNotifications, 'notifications'));
      unsubs.push(safeOnSnapshot(collection(db, 'deletionRequests'), setDeletionRequests, 'deletionRequests'));

      if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
        unsubs.push(safeOnSnapshot(collection(db, 'accounts'), setAccounts, 'accounts'));
      }

      // Live subscription to global system locks
      unsubs.push(onSnapshot(doc(db, 'metadata', 'system_config'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMaintenanceMode(data.maintenanceMode === true);
          setMaintenanceReason(data.lockReason || '');
        } else {
          setMaintenanceMode(false);
          setMaintenanceReason('');
        }
      }, (err) => {
        console.warn("Telemetry lock read restrictions active or document uninitialized:", err.message);
      }));
    };

    setupDataListeners();
    return () => unsubs.forEach(u => u());
  }, [isLoaded, currentUser, currentSite]);

  // Handlers (Simplified and wrapped in promises)
  const logAction = React.useCallback(async (action: string, details: string, site: any, amount: number = 0) => {
    const id = generateSecureUUID();
    const deviceInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent} (${navigator.language || 'fr'})` : 'Unknown client environment';
    await setDoc(doc(db, 'auditLogs', id), cleanObject({
      id, 
      timestamp: new Date().toISOString(), 
      userEmail: auth.currentUser?.email || 'Système',
      site, 
      action, 
      details, 
      amount,
      userId: auth.currentUser?.uid || 'system_service_account',
      userRole: currentUser?.role || 'LECTURE_SEULE',
      deviceInfo,
      sourcePlatform: 'HydroMines Web Application Core'
    }));
  }, [currentUser?.role]);

  // Transaction-bound audit logger
  const logActionTx = (transaction: Transaction, action: string, details: string, site: any, amount: number = 0) => {
    const id = generateSecureUUID();
    const deviceInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent} (${navigator.language || 'fr'})` : 'Unknown client environment';
    transaction.set(doc(db, 'auditLogs', id), cleanObject({
      id, 
      timestamp: new Date().toISOString(), 
      userEmail: auth.currentUser?.email || 'Système',
      site, 
      action, 
      details, 
      amount,
      userId: auth.currentUser?.uid || 'system_service_account',
      userRole: currentUser?.role || 'LECTURE_SEULE',
      deviceInfo,
      sourcePlatform: 'HydroMines Web Application Core'
    }));
  };

  const executeMouvementDirect = React.useCallback(async (mouvement: Mouvement) => {
    if (isSimulationMode()) {
      const movementId = mouvement.id || generateSecureUUID();
      let updatedArticles = [...rawArticles];
      for (const item of mouvement.items) {
        const index = updatedArticles.findIndex(a => a.id === item.articleId);
        if (index !== -1) {
          const article = updatedArticles[index];
          const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
          const newQty = isAddition ? article.quantity + item.quantity : article.quantity - item.quantity;
          updatedArticles[index] = { ...article, quantity: Math.max(0, newQty) };
        }
      }
      setRawArticles(updatedArticles);
      setRawMouvements(prev => [{ ...mouvement, id: movementId, date: mouvement.date || new Date().toISOString() }, ...prev]);
      return;
    }
    const movementId = mouvement.id || generateSecureUUID();
    registerPendingOp(movementId);
    try {
      console.log('[DIAGNOSTIC MOUVEMENT]', {
        currentUserEmail: currentUser?.email,
        currentUserRole: currentUser?.role,
        currentUserAssignedSite: currentUser?.assignedSite,
        currentUserActive: currentUser?.active,
        mouvementSite: mouvement.site,
        mouvementType: mouvement.type,
        mouvementItems: mouvement.items,
      });
      await runTransaction(db, async (transaction) => {
        // Idemptotency check
        const movementRef = doc(db, 'mouvements', movementId);
        const movementSnap = await transaction.get(movementRef);
        if (movementSnap.exists()) {
          throw new Error("MOUVEMENT_DEJA_TRAITE");
        }

        let totalValue = 0;
        
        // Collect article reads and handle newly created/imported local documents
        const articleDataMap = new Map<string, { ref: any; data: Article; isNew: boolean }>();
        
        // 1. All reads must occur before any writes
        for (const item of mouvement.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          
          if (articleSnap.exists()) {
            articleDataMap.set(item.articleId, {
              ref: articleRef,
              data: articleSnap.data() as Article,
              isNew: false
            });
          } else {
            // Defensive Fallback: If document does not exist on server yet, retrieve from local registry/state
            const localArt = articles.find(a => a.id === item.articleId);
            if (!localArt) {
              throw new Error("ARTICLE_INTROUVABLE");
            }
            articleDataMap.set(item.articleId, {
              ref: articleRef,
              data: { ...localArt, quantity: 0 },
              isNew: true
            });
          }
        }

        const articleUpdates: { ref: any; newQty: number; data: Article; isNew: boolean }[] = [];

        for (const item of mouvement.items) {
          const artInfo = articleDataMap.get(item.articleId)!;
          const article = artInfo.data;
          totalValue += item.quantity * (article.price || 0);
          
          const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
          const newQty = isAddition ? article.quantity + item.quantity : article.quantity - item.quantity;
          
          if (newQty < 0) {
            throw new Error("STOCK_INSUFFISANT");
          }
          articleUpdates.push({ 
            ref: artInfo.ref, 
            newQty, 
            data: { ...article, quantity: newQty }, 
            isNew: artInfo.isNew 
          });
        }

        // 2. Perform all updates or transactional creations
        for (const update of articleUpdates) {
          if (update.isNew) {
            transaction.set(update.ref, cleanObject(update.data));
          } else {
            transaction.update(update.ref, { quantity: update.newQty });
          }
        }

        // 3. Set movement document
        transaction.set(movementRef, cleanObject({
          ...mouvement,
          id: movementId,
          date: mouvement.date || new Date().toISOString()
        }));

        // 4. Record transaction-bound audit log
        logActionTx(transaction, mouvement.type, `Réf: ${mouvement.reference}`, mouvement.site, totalValue);
      });
    } finally {
      unregisterPendingOp(movementId);
    }
  }, [rawArticles, articles]);

  const addMouvement = React.useCallback(async (mouvement: Mouvement) => {
    checkWritePermission();
    checkMaintenanceLock();
    const movementId = mouvement.id || generateSecureUUID();
    mouvement.id = movementId;
    const intentId = getOrCreateIntent(`mv-${movementId}`);

    if (activePromisesRef.current[movementId]) {
      return activePromisesRef.current[movementId];
    }

    const promise = (async () => {
      const startTime = performance.now();
      setTxStats(s => ({ ...s, total: s.total + 1 }));
      activeTxCount.current += 1;
      
      if (activeTxCount.current > 1) {
        setTxStats(s => ({ ...s, contentions: s.contentions + 1 }));
        addTechLog('WARN', `Alerte de contention : Transaction simultanée active ! Niveau: ${activeTxCount.current}`);
      }

      try {
        // Guard computation against stale snapshots or split-brain skew (RCGL v1.0 Block)
        if (isSafeMode) {
          const detail = rcglResult.skewDescription || `Snapshot obsolète (${rcglResult.freshnessGapMs}ms)`;
          throw new Error(`CONSISTENCY_VIOLATION: Enregistrement rejeté par RCGL. Raison: ${detail}. Mode sécurisé activé.`);
        }

        // Simulative BSV checking of invariants (PCV v2.0 Rule)
        const validation = validateMouvementInvariants(mouvement, articles, mouvements);
        if (!validation.isValid) {
          throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
        }

        if (isDegradedNetwork) {
          await new Promise(r => setTimeout(r, 2500));
        }

        await executeMouvementDirect(mouvement);



        const duration = performance.now() - startTime;
        updateAvgTxDuration(duration);
        addTechLog('INFO', `Mouvement [${mouvement.type}] enregistré avec succès.`, duration);
        setTxStats(s => ({ ...s, success: s.success + 1 }));

        // Notification for movement validation
        const itemsMsg = mouvement.items.map(it => {
          const art = articles.find(a => a.id === it.articleId);
          return `${mouvement.type === 'ENTREE' ? '+' : '-'}${it.quantity} ${art ? art.designation : 'Article'}`;
        }).join(', ');
        
        addNotification({
          siteId: mouvement.site,
          userId: currentUser?.email || 'system',
          type: 'INFO',
          category: 'STOCK',
          message: `Mouvement [${mouvement.type}] validé : ${itemsMsg}`,
          relatedEntityId: mouvement.items[0]?.articleId,
          actionRoute: 'TRACEABILITY'
        });

        // Notifications for threshold alerts
        for (const item of mouvement.items) {
          const art = articles.find(a => a.id === item.articleId);
          if (art) {
            const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
            const futureQty = isAddition ? art.quantity + item.quantity : art.quantity - item.quantity;
            if (futureQty <= art.minStock) {
              addNotification({
                siteId: mouvement.site,
                userId: currentUser?.email || 'system',
                type: futureQty <= 0 ? 'CRITICAL' : 'WARNING',
                category: 'STOCK',
                message: futureQty <= 0 
                  ? `🔴 Rupture de stock : ${art.designation} (${art.type || 'Stock général'}) — Solde : 0 unité` 
                  : `⚠️ Stock faible : ${art.designation} (${art.type || 'Stock général'}) — ${futureQty} restant(s), seuil : ${art.minStock}`,
                relatedEntityId: art.id,
                actionRoute: 'STOCK_ENGINS'
              });
            }
          }
        }
      } catch (err: any) {
        console.error('[DIAGNOSTIC ERREUR MOUVEMENT]', {
          errorCode: err.code,
          errorMessage: err.message,
          errorFull: err,
        });
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        const errCode = err.code || '';
        
        if (isNetworkError(errMsg, errCode)) {
          addTechLog('WARN', `Panne réseau détectée. Mouvement mis en file de reprise : ${errMsg}`, duration);
          
          // Enqueue directly using SRE system-hardened RetryQueueFSM with immutable intentId
          RetryQueueFSM.enqueue('MOUVEMENT', mouvement, intentId);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Opération sauvegardée localement.");
        } else {
          addTechLog('ERROR', `Échec critique mouvement de stock : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          
          let userMessage = errMsg;
          if (errCode === 'permission-denied') {
            userMessage = "Accès refusé : vous n'avez pas les droits pour effectuer cette opération sur ce chantier. Contactez un administrateur.";
          } else if (errMsg.includes('STOCK_INSUFFISANT')) {
            userMessage = "Stock insuffisant pour cette opération.";
          } else if (errMsg.includes('ARTICLE_INTROUVABLE')) {
            userMessage = "Article introuvable. Il a peut-être été supprimé ou n'existe pas sur ce chantier.";
          }
          throw new Error(userMessage);
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[movementId];
      }
    })();

    activePromisesRef.current[movementId] = promise;
    return promise;
  }, [isSafeMode, rcglResult, articles, mouvements, isDegradedNetwork, executeMouvementDirect, addNotification, currentUser]);

  const executeMaintenanceLogDirect = React.useCallback(async (log: MaintenanceLog) => {
    if (isSimulationMode()) {
      const id = log.id || generateSecureUUID();
      let updatedArticles = [...rawArticles];
      if (log.partsUsed && log.partsUsed.length > 0) {
        log.partsUsed.forEach((part) => {
          const index = updatedArticles.findIndex(a => a.id === part.articleId);
          if (index !== -1) {
            const article = updatedArticles[index];
            updatedArticles[index] = { ...article, quantity: Math.max(0, article.quantity - part.quantity) };
          }
        });
      }
      setRawArticles(updatedArticles);
      setRawMaintenanceLogs(prev => [{ ...log, id }, ...prev]);
      return;
    }
    const id = log.id || generateSecureUUID();
    registerPendingOp(id);
    try {
      await runTransaction(db, async (transaction) => {
        // Idempotency check
        const logRef = doc(db, 'maintenanceLogs', id);
        const logSnap = await transaction.get(logRef);
        if (logSnap.exists()) {
          throw new Error("OPERATION_DEJA_EXECUTE");
        }

        const articleUpdates: { ref: any, newQty: number, price: number }[] = [];
        
        // 1. All reads first
        if (log.partsUsed && log.partsUsed.length > 0) {
          for (const part of log.partsUsed) {
            const articleRef = doc(db, 'articles', part.articleId);
            const articleSnap = await transaction.get(articleRef);
            if (!articleSnap.exists()) {
              throw new Error("ARTICLE_INTROUVABLE");
            }
            const article = articleSnap.data() as Article;
            const newQty = article.quantity - part.quantity;
            if (newQty < 0) {
              throw new Error("STOCK_INSUFFISANT");
            }
            articleUpdates.push({ ref: articleRef, newQty, price: article.price || 0 });
          }
        }

        // 2. Perform stock updates
        for (const update of articleUpdates) {
          transaction.update(update.ref, { quantity: update.newQty });
        }

        // 3. Set associated movements if parts are used
        if (log.partsUsed && log.partsUsed.length > 0) {
          log.partsUsed.forEach((part, index) => {
            const update = articleUpdates[index];
            const mId = generateSecureUUID();
            const movementRef = doc(db, 'mouvements', mId);
            
            let machineSite: SiteCode = 'SMI';
            if (log.machineType === 'ENGIN') {
              const matchedEngin = engins.find(e => e.id === log.machineId);
              if (matchedEngin) machineSite = matchedEngin.site;
            }

            transaction.set(movementRef, cleanObject({
              id: mId,
              site: machineSite,
              date: log.date || new Date().toISOString(),
              type: 'SORTIE',
              reference: `MAINT-${id}`,
              items: [{ articleId: part.articleId, quantity: part.quantity, price: update.price }],
              notes: `Utilisé pour maintenance ${log.type} sur ${log.machineId}`,
              status: 'COMPLETE'
            }));
          });
        }

        // 4. Set maintenance log record
        transaction.set(logRef, cleanObject({ ...log, id }));

        // 5. Audit log inside transaction
        logActionTx(transaction, 'MAINTENANCE', `Machine: ${log.machineId}`, 'SMI', log.cost || 0);
      });
    } finally {
      unregisterPendingOp(id);
    }
  }, [rawArticles, engins]);

  const addMaintenanceLog = React.useCallback(async (log: MaintenanceLog) => {
    checkWritePermission();
    checkMaintenanceLock();
    const id = log.id || generateSecureUUID();
    log.id = id;
    const intentId = getOrCreateIntent(`maint-${id}`);

    if (activePromisesRef.current[id]) {
      return activePromisesRef.current[id];
    }

    const promise = (async () => {
      const startTime = performance.now();
      setTxStats(s => ({ ...s, total: s.total + 1 }));
      activeTxCount.current += 1;
      
      if (activeTxCount.current > 1) {
        setTxStats(s => ({ ...s, contentions: s.contentions + 1 }));
        addTechLog('WARN', `Contention possible lors de la maintenance machine ID: ${log.machineId}.`);
      }

      try {
        // Guard computation against stale snapshots or split-brain skew (RCGL v1.0 Block)
        if (isSafeMode) {
          const detail = rcglResult.skewDescription || `Snapshot obsolète (${rcglResult.freshnessGapMs}ms)`;
          throw new Error(`CONSISTENCY_VIOLATION: Enregistrement rejeté par RCGL. Raison: ${detail}. Mode sécurisé activé.`);
        }

        // Simulative BSV checking of invariants (PCV v2.0 Rule)
        const validation = validateMaintenanceInvariants(log, articles);
        if (!validation.isValid) {
          throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
        }

        if (isDegradedNetwork) {
          await new Promise(r => setTimeout(r, 2500));
        }

        await executeMaintenanceLogDirect(log);

        const duration = performance.now() - startTime;
        updateAvgTxDuration(duration);
        addTechLog('INFO', `Rapport de maintenance enregistré pour machine [${log.machineId}].`, duration);
        setTxStats(s => ({ ...s, success: s.success + 1 }));
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        const errCode = err.code || '';
        
        if (isNetworkError(errMsg, errCode)) {
          addTechLog('WARN', `Réseau indisponible. Log de maintenance mis en file de reprise : ${errMsg}`, duration);
          
          RetryQueueFSM.enqueue('MAINTENANCE', log, intentId);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Log de maintenance sauvegardé localement.");
        } else {
          addTechLog('ERROR', `Échec du log de maintenance : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          
          let userMessage = errMsg;
          if (errCode === 'permission-denied') {
            userMessage = "Accès refusé : vous n'avez pas les droits pour effectuer cette opération sur ce chantier. Contactez un administrateur.";
          }
          throw new Error(userMessage);
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[id];
      }
    })();

    activePromisesRef.current[id] = promise;
    return promise;
  }, [isSafeMode, rcglResult, articles, isDegradedNetwork, executeMaintenanceLogDirect]);

  const executeTransfertDirect = React.useCallback(async (t: Transfert) => {
    if (isSimulationMode()) {
      const id = t.id || generateSecureUUID();
      let updatedArticles = [...rawArticles];
      if (t.status === 'IN_TRANSIT') {
        t.items.forEach((item) => {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const art = updatedArticles[index];
            updatedArticles[index] = { ...art, quantity: Math.max(0, art.quantity - item.quantity) };
          }
        });
      }
      setRawArticles(updatedArticles);
      setRawTransferts(prev => [{ ...t, id, status: t.status || 'PENDING_APPROVAL' }, ...prev]);
      return;
    }
    const id = t.id || generateSecureUUID();
    registerPendingOp(id);
    try {
      await runTransaction(db, async (transaction) => {
        // Idempotency Check
        const tRef = doc(db, 'transferts', id);
        const tSnap = await transaction.get(tRef);
        if (tSnap.exists()) {
          throw new Error("OPERATION_DEJA_EXECUTE");
        }

        // If transfer starts directly subverted or in transit, decrement stock.
        // But if it is PENDING_APPROVAL, we DO NOT decrement stock yet, just save the document!
        if (t.status === 'IN_TRANSIT') {
          let totalValue = 0;
          const articleUpdates: { ref: any, newQty: number }[] = [];

          for (const item of t.items) {
            const artRef = doc(db, 'articles', item.articleId);
            const artSnap = await transaction.get(artRef);
            if (!artSnap.exists()) {
              throw new Error("ARTICLE_INTROUVABLE");
            }
            const art = artSnap.data() as Article;
            
            if (art.quantity < item.quantity) {
              throw new Error("STOCK_INSUFFISANT");
            }

            totalValue += item.quantity * (item.price || 0);
            articleUpdates.push({ ref: artRef, newQty: art.quantity - item.quantity });
          }

          for (const update of articleUpdates) {
            transaction.update(update.ref, { quantity: update.newQty });
          }

          // Save transfer
          transaction.set(tRef, cleanObject({
            ...t,
            id,
            status: 'IN_TRANSIT'
          }));

          // Log audit inside transaction
          logActionTx(transaction, 'TRANSFERT_OUT', `Transfert d'id ${t.reference} vers ${t.targetSite} lancé`, t.sourceSite, totalValue);
        } else {
          // PENDING_APPROVAL - draft or waiting for authorization - no stock change yet
          transaction.set(tRef, cleanObject({
            ...t,
            id,
            status: t.status || 'PENDING_APPROVAL'
          }));
          logActionTx(transaction, 'TRANSFERT_DRAFT', `Brouillon de transfert ${t.reference} créé`, t.sourceSite, 0);
        }
      });
    } finally {
      unregisterPendingOp(id);
    }
  }, [rawArticles]);

  const addTransfert = React.useCallback(async (t: Transfert) => {
    checkWritePermission();
    checkMaintenanceLock();
    const id = t.id || generateSecureUUID();
    t.id = id;
    const intentId = getOrCreateIntent(`tx-${id}-${t.sourceSite}`);

    if (activePromisesRef.current[id]) {
      return activePromisesRef.current[id];
    }

    const promise = (async () => {
      const startTime = performance.now();
      setTxStats(s => ({ ...s, total: s.total + 1 }));
      activeTxCount.current += 1;
      
      if (activeTxCount.current > 1) {
        setTxStats(s => ({ ...s, contentions: s.contentions + 1 }));
        addTechLog('WARN', `Contention sur transfert d'envoi : ${id}`);
      }

      try {
        if (isSafeMode) {
          const detail = rcglResult.skewDescription || `Snapshot obsolète (${rcglResult.freshnessGapMs}ms)`;
          throw new Error(`CONSISTENCY_VIOLATION: Enregistrement rejeté par RCGL. Raison: ${detail}. Mode sécurisé activé.`);
        }

        const validation = validateTransferInvariants(t, articles);
        if (!validation.isValid) {
          throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
        }

        if (isDegradedNetwork) {
          await new Promise(r => setTimeout(r, 2500));
        }

        await executeTransfertDirect(t);

        const duration = performance.now() - startTime;
        updateAvgTxDuration(duration);
        addTechLog('INFO', `Transfert [${t.status || 'PENDING_APPROVAL'}] initialisé pour réf : ${t.reference}`, duration);
        setTxStats(s => ({ ...s, success: s.success + 1 }));

        // Trigger transfer dispatched notifications
        addNotification({
          siteId: t.sourceSite,
          userId: t.expediteur,
          type: 'INFO',
          category: 'TRANSFER',
          message: `Transfert ${t.reference} envoyé vers ${t.targetSite}. STATUS: ${t.status || 'VALIDE'}.`,
          relatedEntityId: t.id,
          actionRoute: 'TRANSFERS_RETURNS'
        });
        
        addNotification({
          siteId: t.targetSite,
          type: 'WARNING',
          category: 'TRANSFER',
          message: `Nouveau transfert ${t.reference} en attente de validation / réception depuis ${t.sourceSite}.`,
          relatedEntityId: t.id,
          actionRoute: 'TRANSFERS_RETURNS'
        });
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        const errCode = err.code || '';
        
        if (isNetworkError(errMsg, errCode)) {
          addTechLog('WARN', `Réseau déconnecté. Transfert d'envoi mis en file d'attente : ${errMsg}`, duration);
          
          RetryQueueFSM.enqueue('TRANSFERT', t, intentId, t.sourceSite);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Opération sauvegardée localement.");
        } else {
          addTechLog('ERROR', `Échec du transfert d'envoi : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          
          let userMessage = errMsg;
          if (errCode === 'permission-denied') {
            userMessage = "Accès refusé : vous n'avez pas les droits pour effectuer cette opération sur ce chantier. Contactez un administrateur.";
          }
          throw new Error(userMessage);
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[id];
      }
    })();

    activePromisesRef.current[id] = promise;
    return promise;
  }, [isSafeMode, rcglResult, articles, isDegradedNetwork, executeTransfertDirect, addNotification]);

  const executeApproveTransfertDirect = React.useCallback(async (id: string, approuvePar: string) => {
    if (isSimulationMode()) {
      let updatedTransferts = [...rawTransferts];
      const tIndex = updatedTransferts.findIndex(tx => tx.id === id);
      if (tIndex !== -1) {
        const tx = updatedTransferts[tIndex];
        updatedTransferts[tIndex] = { ...tx, status: 'IN_TRANSIT', expediteur: approuvePar, dateEnvoi: new Date().toISOString() };
        
        let updatedArticles = [...rawArticles];
        tx.items.forEach((item) => {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const art = updatedArticles[index];
            updatedArticles[index] = { ...art, quantity: Math.max(0, art.quantity - item.quantity) };
          }
        });
        setRawArticles(updatedArticles);
      }
      setRawTransferts(updatedTransferts);
      return;
    }
    registerPendingOp(id);
    try {
      await runTransaction(db, async (transaction) => {
        const tRef = doc(db, 'transferts', id);
        const tSnap = await transaction.get(tRef);
        if (!tSnap.exists()) {
          throw new Error("TRANSFERT_INTROUVABLE");
        }
        const t = tSnap.data() as Transfert;

        if (t.status !== 'PENDING_APPROVAL') {
          throw new Error("TRANSFERT_DEJA_LANCE_OU_RECEP");
        }

        let totalValue = 0;
        const articleUpdates: { ref: any, newQty: number }[] = [];

        for (const item of t.items) {
          const artRef = doc(db, 'articles', item.articleId);
          const artSnap = await transaction.get(artRef);
          if (!artSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          const art = artSnap.data() as Article;
          
          if (art.quantity < item.quantity) {
            throw new Error("STOCK_INSUFFISANT");
          }

          totalValue += item.quantity * (item.price || 0);
          articleUpdates.push({ ref: artRef, newQty: art.quantity - item.quantity });
        }

        for (const update of articleUpdates) {
          transaction.update(update.ref, { quantity: update.newQty });
        }

        transaction.update(tRef, {
          status: 'IN_TRANSIT',
          expediteur: approuvePar,
          dateEnvoi: new Date().toISOString()
        });

        logActionTx(transaction, 'TRANSFERT_OUT', `Transfert ${t.reference} approuvé et lancé vers ${t.targetSite}`, t.sourceSite, totalValue);
      });
    } finally {
      unregisterPendingOp(id);
    }
  }, [rawArticles, rawTransferts]);

  const approveTransfert = React.useCallback(async (id: string, approuvePar: string) => {
    checkWritePermission();
    checkMaintenanceLock();
    const sourceT = transferts.find(t => t.id === id);
    const intentId = getOrCreateIntent(`approve-tx-${id}-${sourceT?.sourceSite || 'SMI'}`);
    
    if (activePromisesRef.current[`approve-${id}`]) {
      return activePromisesRef.current[`approve-${id}`];
    }

    const promise = (async () => {
      const startTime = performance.now();
      setTxStats(s => ({ ...s, total: s.total + 1 }));
      activeTxCount.current += 1;
      
      try {
        if (isSafeMode) {
          const detail = rcglResult.skewDescription || `Snapshot obsolète (${rcglResult.freshnessGapMs}ms)`;
          throw new Error(`CONSISTENCY_VIOLATION: Approbation rejetée par RCGL. Raison: ${detail}.`);
        }

        if (isDegradedNetwork) {
          await new Promise(r => setTimeout(r, 2500));
        }

        await executeApproveTransfertDirect(id, approuvePar);

        const duration = performance.now() - startTime;
        updateAvgTxDuration(duration);
        addTechLog('INFO', `Transfert ID: ${id} approuvé par ${approuvePar}`, duration);
        setTxStats(s => ({ ...s, success: s.success + 1 }));
        toast.success("Transfert approuvé et convoi lancé !");
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        const errCode = err.code || '';
        
        if (isNetworkError(errMsg, errCode)) {
          addTechLog('WARN', `Réseau défectueux. Approbation mise en file d'attente : ${errMsg}`, duration);
          RetryQueueFSM.enqueue('APPROVE_TRANSFERT', { id, approuvePar }, intentId, sourceT?.sourceSite);
          refreshFSMStates();
          toast.warning("Réseau indisponible. Approbation stockée localement.");
        } else {
          addTechLog('ERROR', `Échec approbation transfert : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          
          let userMessage = errMsg;
          if (errCode === 'permission-denied') {
            userMessage = "Accès refusé : vous n'avez pas les droits de versement/validation pour ce chantier. Contactez un administrateur.";
          }
          throw new Error(userMessage);
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[`approve-${id}`];
      }
    })();

    activePromisesRef.current[`approve-${id}`] = promise;
    return promise;
  }, [transferts, isSafeMode, rcglResult, isDegradedNetwork, executeApproveTransfertDirect]);

  const executeCompleteTransfertDirect = React.useCallback(async (
    id: string, 
    recepteur: string, 
    receivedItems?: MouvementItem[], 
    disputeReason?: string
  ) => {
    if (isSimulationMode()) {
      let updatedTransferts = [...rawTransferts];
      const tIndex = updatedTransferts.findIndex(tx => tx.id === id);
      if (tIndex !== -1) {
        const tx = updatedTransferts[tIndex];
        updatedTransferts[tIndex] = { ...tx, status: 'RECEIVED', recepteur, receivedItems, disputeReason };
        
        let updatedArticles = [...rawArticles];
        const finalReceivedItems = receivedItems || tx.items;
        finalReceivedItems.forEach((item) => {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const art = updatedArticles[index];
            updatedArticles[index] = { ...art, quantity: art.quantity + item.quantity };
          }
        });
        setRawArticles(updatedArticles);

        // Create the corresponding TRANSFERT_IN movement logically so that RCGL verification doesn't raise version skew issues
        const inboundMovementId = generateSecureUUID();
        const newMouvement: Mouvement = {
          id: inboundMovementId,
          site: tx.targetSite,
          date: new Date().toISOString(),
          type: 'TRANSFERT_IN',
          reference: tx.reference,
          items: finalReceivedItems.map(item => ({
            articleId: item.articleId,
            quantity: item.quantity,
            price: item.price || 0
          })),
          notes: `Réception de transfert réf: ${tx.reference} de ${tx.sourceSite}${disputeReason ? ' [AVEC LITIGE]' : ''}`,
          status: 'COMPLETE'
        };
        setRawMouvements(prev => [newMouvement, ...prev]);
      }
      setRawTransferts(updatedTransferts);
      return;
    }
    registerPendingOp(id);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read transfer status inside transaction
        const tRef = doc(db, 'transferts', id);
        const tSnap = await transaction.get(tRef);
        if (!tSnap.exists()) {
          throw new Error("TRANSFERT_INTROUVABLE");
        }
        const transfert = tSnap.data() as Transfert;

        if (transfert.status === 'RECEIVED' || transfert.status === 'CLOSED' || transfert.status === 'RECU') {
          throw new Error("TRANSFERT_DEJA_RECEPTIONNE");
        }

        // 1. Perform coherence verification
        let isDivergent = false;
        const finalReceivedItems = receivedItems || transfert.items;

        transfert.items.forEach((sentItem) => {
          const recItem = finalReceivedItems.find(r => r.articleId === sentItem.articleId);
          if (!recItem || recItem.quantity !== sentItem.quantity) {
            isDivergent = true;
          }
        });

        if (disputeReason) {
          isDivergent = true;
        }

        const targetArticleWork: {
          ref: any;
          exists: boolean;
          currentQty: number;
          newQty: number;
          sourceArticle: Article;
          deterministicId: string;
          transferItem: any;
        }[] = [];

        let totalValue = 0;

        // 2. Read source articles and target articles first (read before write)
        for (const item of finalReceivedItems) {
          const sourceArticleRef = doc(db, 'articles', item.articleId);
          const sourceArticleSnap = await transaction.get(sourceArticleRef);
          if (!sourceArticleSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          const sourceArticle = sourceArticleSnap.data() as Article;

          // Compute unique deterministic site + reference ID
          const targetDeterministicId = `${transfert.targetSite}_${sourceArticle.ref.trim().toUpperCase().replace(/\s+/g, '_')}`;
          const targetArticleRef = doc(db, 'articles', targetDeterministicId);
          const targetArticleSnap = await transaction.get(targetArticleRef);

          let exists = false;
          let currentQty = 0;
          if (targetArticleSnap.exists()) {
            exists = true;
            const targetArticle = targetArticleSnap.data() as Article;
            currentQty = targetArticle.quantity;
          }

          totalValue += item.quantity * (item.price || 0);

          targetArticleWork.push({
            ref: targetArticleRef,
            exists,
            currentQty,
            newQty: currentQty + item.quantity,
            sourceArticle,
            deterministicId: targetDeterministicId,
            transferItem: item
          });
        }

        // 3. Perform edits/creations
        for (const work of targetArticleWork) {
          if (work.exists) {
            transaction.update(work.ref, {
              quantity: work.newQty,
              active: true
            });
          } else {
            const newArticle: Article = {
              id: work.deterministicId,
              site: transfert.targetSite,
              ref: work.sourceArticle.ref,
              designation: work.sourceArticle.designation,
              type: work.sourceArticle.type,
              category: work.sourceArticle.category,
              functionalCategory: work.sourceArticle.functionalCategory || '',
              subCategory: work.sourceArticle.subCategory || '',
              component: work.sourceArticle.component || '',
              subComponent: work.sourceArticle.subComponent || '',
              unit: work.sourceArticle.unit,
              quantity: work.transferItem.quantity,
              minStock: work.sourceArticle.minStock || 0,
              location: 'A affecter',
              price: work.sourceArticle.price || 0,
              active: true,
              notes: `Créé par transfert depuis ${transfert.sourceSite}`
            };
            transaction.set(work.ref, cleanObject(newArticle));
          }

          // Create entry movement log on target site
          const inboundMovementId = generateSecureUUID();
          const inboundMovementRef = doc(db, 'mouvements', inboundMovementId);
          transaction.set(inboundMovementRef, cleanObject({
            id: inboundMovementId,
            site: transfert.targetSite,
            date: new Date().toISOString(),
            type: 'TRANSFERT_IN',
            reference: transfert.reference,
            items: [{
              articleId: work.deterministicId,
              quantity: work.transferItem.quantity,
              price: work.transferItem.price || 0
            }],
            notes: `Réception de transfert réf: ${transfert.reference} de ${transfert.sourceSite}${isDivergent ? ' [AVEC DIVERGENCE SIGNE]' : ''}`,
            status: 'COMPLETE'
          }));
        }

        // 4. Update the transfer record with serverTimestamp()
        const nextStatus = isDivergent ? 'DISPUTED' : 'RECEIVED';
        transaction.update(tRef, {
          status: nextStatus,
          dateReception: serverTimestamp(),
          recepteur,
          receivedItems: finalReceivedItems,
          disputeReason: disputeReason || (isDivergent ? "Quantités reçues non conformes au bon d'expédition." : '')
        });

        // 5. Audit Log inside transaction
        logActionTx(transaction, 'TRANSFERT_IN', `Transfert ${transfert.reference} réceptionné [${nextStatus}]`, transfert.targetSite, totalValue);

        // 6. Forensic Anomaly trigger if divergent
        if (isDivergent) {
          const anomalyId = generateSecureUUID();
          const anomalyRef = doc(db, 'anomalyReports', anomalyId);
          transaction.set(anomalyRef, cleanObject({
            id: anomalyId,
            site: transfert.targetSite,
            timestamp: serverTimestamp(),
            type: 'STOCK_INCOHERENCE',
            severity: 'HIGH',
            description: `DIVERGENCE LOGISTIQUE INTER-SITES: Le transfert ${transfert.reference} de ${transfert.sourceSite} comporte des écarts de réception enregistrés par ${recepteur}.`,
            status: 'NEW',
            suggestedAction: "Déclencher un inventaire contradictoire du sas et ajuster les écarts."
          }));
        }
      });
    } finally {
      unregisterPendingOp(id);
    }
  }, [rawArticles, rawTransferts]);

  const completeTransfert = React.useCallback(async (
    id: string, 
    recepteur: string, 
    receivedItems?: MouvementItem[], 
    disputeReason?: string
  ) => {
    checkWritePermission();
    checkMaintenanceLock();
    const sourceT = transferts.find(t => t.id === id);
    const intentId = getOrCreateIntent(`rx-${id}-${sourceT?.targetSite || 'SMI'}`);
    
    if (activePromisesRef.current[id]) {
      return activePromisesRef.current[id];
    }

    const promise = (async () => {
      const startTime = performance.now();
      setTxStats(s => ({ ...s, total: s.total + 1 }));
      activeTxCount.current += 1;
      
      if (activeTxCount.current > 1) {
        setTxStats(s => ({ ...s, contentions: s.contentions + 1 }));
        addTechLog('WARN', `Contention sur finalisation de transfert : ${id}`);
      }

      try {
        if (isSafeMode) {
          const detail = rcglResult.skewDescription || `Snapshot obsolète (${rcglResult.freshnessGapMs}ms)`;
          throw new Error(`CONSISTENCY_VIOLATION: Enregistrement rejeté par RCGL. Raison: ${detail}. Mode sécurisé activé.`);
        }

        const validation = validateCompleteTransferInvariants(id, recepteur, transferts);
        if (!validation.isValid) {
          throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
        }

        if (isDegradedNetwork) {
          await new Promise(r => setTimeout(r, 2500));
        }

        await executeCompleteTransfertDirect(id, recepteur, receivedItems, disputeReason);

        const duration = performance.now() - startTime;
        updateAvgTxDuration(duration);
        addTechLog('INFO', `Transfert réceptionné avec succès par : ${recepteur}`, duration);
        setTxStats(s => ({ ...s, success: s.success + 1 }));

        // Trigger notifications
        const isDisputed = !!disputeReason || (receivedItems && sourceT && receivedItems.some((item, idx) => item.quantity !== sourceT.items[idx]?.quantity));
        addNotification({
          siteId: sourceT?.sourceSite || 'SMI',
          type: isDisputed ? 'CRITICAL' : 'INFO',
          category: 'TRANSFER',
          message: isDisputed 
            ? `Litige sur transfert ${sourceT?.reference} : Réceptionné avec écarts par ${recepteur}.`
            : `Transfert ${sourceT?.reference} réceptionné et complété avec succès par ${recepteur}.`,
          relatedEntityId: id,
          actionRoute: 'TRANSFERS_RETURNS'
        });
        
        addNotification({
          siteId: sourceT?.targetSite || 'SMI',
          type: isDisputed ? 'WARNING' : 'INFO',
          category: 'TRANSFER',
          message: isDisputed 
            ? `Réception de transfert ${sourceT?.reference} validée avec litige.`
            : `Réception de transfert ${sourceT?.reference} complétée avec succès.`,
          relatedEntityId: id,
          actionRoute: 'TRANSFERS_RETURNS'
        });
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        const errCode = err.code || '';
        
        if (isNetworkError(errMsg, errCode)) {
          addTechLog('WARN', `Réseau déconnecté. Réception de transfert mise en file de reprise : ${errMsg}`, duration);
          
          RetryQueueFSM.enqueue('COMPLETE_TRANSFERT', { id, recepteur, receivedItems, disputeReason }, intentId, sourceT?.targetSite);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Réception sauvegardée localement.");
        } else {
          addTechLog('ERROR', `Échec de la réception de transfert : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          
          let userMessage = errMsg;
          if (errCode === 'permission-denied') {
            userMessage = "Accès refusé : vous n'avez pas les droits pour réceptionner sur ce chantier. Contactez un administrateur.";
          }
          throw new Error(userMessage);
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[id];
      }
    })();

    activePromisesRef.current[id] = promise;
    return promise;
  }, [transferts, isSafeMode, rcglResult, isDegradedNetwork, executeCompleteTransfertDirect, addNotification]);

  const executeCloseTransfertDirect = React.useCallback(async (id: string, motifCloture: string) => {
    registerPendingOp(id);
    try {
      await runTransaction(db, async (transaction) => {
        const tRef = doc(db, 'transferts', id);
        const tSnap = await transaction.get(tRef);
        if (!tSnap.exists()) {
          throw new Error("TRANSFERT_INTROUVABLE");
        }
        transaction.update(tRef, {
          status: 'CLOSED',
          notes: `Clôture de dossier: ${motifCloture}`
        });
        logActionTx(transaction, 'TRANSFERT_CLOSE', `Transfert ${id} clôturé définitivement: ${motifCloture}`, 'SMI', 0);
      });
    } finally {
      unregisterPendingOp(id);
    }
  }, []);

  const closeTransfert = React.useCallback(async (id: string, motifCloture: string) => {
    checkWritePermission();
    checkMaintenanceLock();
    const sourceT = transferts.find(t => t.id === id);
    const intentId = getOrCreateIntent(`close-${id}-${sourceT?.targetSite || 'SMI'}`);

    if (activePromisesRef.current[`close-${id}`]) {
      return activePromisesRef.current[`close-${id}`];
    }

    const promise = (async () => {
      const startTime = performance.now();
      setTxStats(s => ({ ...s, total: s.total + 1 }));
      activeTxCount.current += 1;

      try {
        if (isSafeMode) {
          throw new Error("CONSISTENCY_VIOLATION: validation requise.");
        }

        await executeCloseTransfertDirect(id, motifCloture);
        addTechLog('INFO', `Transfert ID: ${id} clos définitivement par signature d'autorité.`);
        setTxStats(s => ({ ...s, success: s.success + 1 }));
        toast.success("Dossier de transfert clos et archivé.");
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        const errCode = err.code || '';

        if (isNetworkError(errMsg, errCode)) {
          addTechLog('WARN', `Réseau absent. Clôture de transfert mise en attente de synchro.`);
          RetryQueueFSM.enqueue('CLOSE_TRANSFERT', { id, motifCloture }, intentId, sourceT?.targetSite);
          refreshFSMStates();
          toast.warning("Réseau indisponible. Clôture enregistrée localement.");
        } else {
          addTechLog('ERROR', `Échec clôture transfert : ${errMsg}`);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          
          let userMessage = errMsg;
          if (errCode === 'permission-denied') {
            userMessage = "Accès refusé : vous n'avez pas les droits de clôture administrative. Contactez un administrateur.";
          }
          throw new Error(userMessage);
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[`close-${id}`];
      }
    })();

    activePromisesRef.current[`close-${id}`] = promise;
    return promise;
  }, [transferts, isSafeMode, executeCloseTransfertDirect]);

  const saveInventaire = React.useCallback(async (i: Inventaire) => {
    checkWritePermission();
    if (isSimulationMode()) {
      const id = i.id || generateId();
      const item = { ...i, id };
      setInventaires(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [item, ...prev];
      });

      if (i.status === 'VALIDE') {
        const adjustedItems = item.items.filter(item => item.difference !== 0);
        const adjustedCount = adjustedItems.length;

        // update rawArticles
        setRawArticles(prev => {
          const next = [...prev];
          for (const adjusted of adjustedItems) {
            const idx = next.findIndex(a => a.id === adjusted.articleId);
            if (idx !== -1) {
              let updatedQty = adjusted.countedQuantity;
              if (updatedQty === undefined || updatedQty === null || isNaN(updatedQty)) {
                updatedQty = adjusted.theoricQuantity;
              }
              next[idx] = { ...next[idx], quantity: updatedQty };
            }
          }
          return next;
        });

        // Add audit log mock for simulation mode
        for (const adjusted of adjustedItems) {
          const formattedDate = new Date(i.date).toLocaleDateString('fr-FR');
          const detailsString = `Inventaire ${i.type} du ${formattedDate} — Écart : ${adjusted.difference > 0 ? '+' : ''}${adjusted.difference} pour article ${adjusted.articleId}. Compteur : ${i.compteur || 'N/A'}.`;
          
          setAuditLogs(prev => [
            {
              id: generateSecureUUID(),
              timestamp: new Date().toISOString(),
              userEmail: auth.currentUser?.email || 'Système',
              site: i.site,
              action: 'AJUSTEMENT_INVENTAIRE',
              details: detailsString,
              amount: 0,
              userId: auth.currentUser?.uid || 'system_service_account',
              userRole: currentUser?.role || 'LECTURE_SEULE'
            },
            ...prev
          ]);
        }

        toast.success(`Inventaire validé — ${adjustedCount} article(s) ajusté(s) dans le stock.`);
      }
      return;
    }
    checkMaintenanceLock();
    const id = i.id || generateId();

    if (i.status === 'VALIDE') {
      const finishedItem = { ...i, id };
      const adjustedItems = finishedItem.items.filter(item => item.difference !== 0);
      const adjustedCount = adjustedItems.length;

      await runTransaction(db, async (transaction) => {
        // Read articles first (all transaction reads first)
        const articleRevisions: { ref: any; updatedQty: number }[] = [];
        for (const item of adjustedItems) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          if (articleSnap.exists()) {
            let updatedQty = item.countedQuantity;
            if (updatedQty === undefined || updatedQty === null || isNaN(updatedQty)) {
              updatedQty = item.theoricQuantity;
            }
            articleRevisions.push({ ref: articleRef, updatedQty });
          }
        }

        // Writes section
        // 1. Save the inventory document
        const inventaireRef = doc(db, 'inventaires', id);
        transaction.set(inventaireRef, cleanObject(finishedItem));

        // 2. Update the adjusted articles
        for (const rev of articleRevisions) {
          transaction.update(rev.ref, { quantity: rev.updatedQty });
        }

        // 3. Record transaction-bound audit logs for adjusted items
        for (const item of adjustedItems) {
          const formattedDate = new Date(i.date).toLocaleDateString('fr-FR');
          const detailsString = `Inventaire ${i.type} du ${formattedDate} — Écart : ${item.difference > 0 ? '+' : ''}${item.difference} pour article ${item.articleId}. Compteur : ${i.compteur || 'N/A'}.`;
          logActionTx(transaction, 'AJUSTEMENT_INVENTAIRE', detailsString, i.site, 0);
        }
      });

      toast.success(`Inventaire validé — ${adjustedCount} article(s) ajusté(s) dans le stock.`);
    } else {
      // Draft mode (OPEN/OUVERT) - only save the inventory document without affecting stock
      await setDoc(doc(db, 'inventaires', id), cleanObject({ ...i, id }));
    }
  }, [rawArticles, currentUser?.role]);

  const saveArticle = React.useCallback(async (a: Article) => {
    checkWritePermission();
    if (isSimulationMode()) {
      const id = a.id || generateId();
      const item = { ...a, id };
      setRawArticles(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [item, ...prev];
      });
      return;
    }
    checkMaintenanceLock();
    const id = a.id || generateId();
    const item = { ...a, id };
    await setDoc(doc(db, 'articles', id), cleanObject(item));

    setRecentlyCreatedArticles(prev => {
      if (prev.some(x => x.id === id)) return prev;
      return [...prev, item];
    });

    setRawArticles(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });


  }, []);

  const deleteArticles = React.useCallback(async (ids: string[]) => {
    checkWritePermission();
    if (ids.length === 0) return;
    const isViewer = isSimulationMode();
    
    const targetArticles = rawArticles.filter(a => ids.includes(a.id));
    if (targetArticles.length === 0) return;

    const isAdminUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    if (isAdminUser || isViewer) {
      if (isViewer) {
        setRawArticles(prev => prev.filter(x => !ids.includes(x.id)));
        toast.success(ids.length === 1 
          ? "Article supprimé de l'application (Simulé)" 
          : `${ids.length} articles supprimés de l'application (Simulé)`
        );
        return;
      }

      checkMaintenanceLock();
      try {
        const batch = writeBatch(db);
        for (const id of ids) {
          batch.delete(doc(db, 'articles', id));
        }
        await batch.commit();

        // Traceability & Audit Logs
        const designationsText = targetArticles.map(a => `${a.designation} (${a.ref})`).join(', ');
        const details = `Suppression définitive de ${ids.length} article(s): ${designationsText}`;
        await logAction('DELETE_ARTICLE', details, targetArticles[0]?.site || 'SMI');


        toast.success(ids.length === 1 
          ? "Article supprimé avec succès." 
          : `${ids.length} articles supprimés avec succès.`
        );
      } catch (err: any) {
        toast.error(`Échec de la suppression: ${err.message || err}`);
      }
    } else {
      // Magasinier: Create a pending deletion request
      const reqId = `req-${generateSecureUUID()}`;
      const articleRefs = targetArticles.map(a => a.ref);
      const articleDesignations = targetArticles.map(a => a.designation);
      const site = targetArticles[0]?.site || 'SMI';

      const newRequest: DeletionRequest = {
        id: reqId,
        articleIds: ids,
        articleRefs,
        articleDesignations,
        site,
        requestedBy: currentUser?.email || auth.currentUser?.email || 'Magasinier',
        requestedAt: new Date().toISOString(),
        status: 'PENDING_APPROVAL'
      };

      try {
        await setDoc(doc(db, 'deletionRequests', reqId), cleanObject(newRequest));

        // Audit Logs (demande de suppression)
        const details = `Demande de suppression soumise par ${newRequest.requestedBy} pour ${ids.length} article(s): ${articleDesignations.join(', ')}`;
        await logAction('REQUEST_DELETE_ARTICLE', details, site);

        toast.info("Demande de suppression envoyée. L'administrateur traitera cette suppression.");
      } catch (err: any) {
        toast.error(`Échec lors de la création de la demande: ${err.message || err}`);
      }
    }
  }, [rawArticles, currentUser, logAction]);

  const deleteArticle = React.useCallback(async (id: string) => {
    await deleteArticles([id]);
  }, [deleteArticles]);

  const importAllCatalogToArticles = React.useCallback(async (targetSite: SiteCode, excludeCostly: boolean | number = true) => {
    checkWritePermission();
    const isViewer = isSimulationMode();
    
    // Find catalog items that are not already present in rawArticles for targetSite
    const existingRefs = new Set(
      rawArticles
        .filter(a => a.site === targetSite)
        .map(a => a.ref?.trim().toLowerCase())
    );

    const itemsToImport = MASTER_CATALOG.filter(item => {
      const ref = item.reference?.trim().toLowerCase();
      const isCandidate = ref && !existingRefs.has(ref);
      if (!isCandidate) return false;
      
      // Filter by custom price limit
      if (typeof excludeCostly === 'number') {
        if ((item.price || 0) >= excludeCostly) return false;
      } else if (excludeCostly === true) {
        if ((item.price || 0) >= 40000) return false;
      }
      return true;
    });

    if (itemsToImport.length === 0) {
      return { imported: 0, skipped: MASTER_CATALOG.length };
    }

    if (isViewer) {
      const newArticles: Article[] = itemsToImport.map(item => ({
        id: generateId(),
        site: targetSite,
        ref: item.reference,
        designation: item.designation,
        type: item.suggestedType,
        category: item.functionalCategory,
        functionalCategory: item.functionalCategory,
        subCategory: item.subCategory,
        component: item.component,
        subComponent: item.subComponent,
        notes: item.notes,
        unit: 'Pcs',
        quantity: 0,
        minStock: 1,
        location: '',
        price: item.price || 0,
        active: true
      }));

      setRawArticles(prev => [...newArticles, ...prev]);
      
      return { imported: newArticles.length, skipped: MASTER_CATALOG.length - newArticles.length };
    }

    checkMaintenanceLock();
    try {
      const chunkSize = 450;
      let importedCount = 0;

      for (let i = 0; i < itemsToImport.length; i += chunkSize) {
        const chunk = itemsToImport.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        const chunkArticles: Article[] = [];
        for (const item of chunk) {
          const artId = generateId();
          const art: Article = {
            id: artId,
            site: targetSite,
            ref: item.reference,
            designation: item.designation,
            type: item.suggestedType,
            category: item.functionalCategory,
            functionalCategory: item.functionalCategory,
            subCategory: item.subCategory,
            component: item.component,
            subComponent: item.subComponent,
            notes: item.notes,
            unit: 'Pcs',
            quantity: 0,
            minStock: 1,
            location: '',
            price: item.price || 0,
            active: true
          };
          chunkArticles.push(art);
          batch.set(doc(db, 'articles', artId), cleanObject(art));
        }

        await batch.commit();
        importedCount += chunk.length;
        
        // Responsiveness Booster: immediately update local rawArticles state
        setRawArticles(prev => {
          const mergedMap = new Map<string, Article>(prev.map(a => [a.id, a]));
          chunkArticles.forEach(art => mergedMap.set(art.id, art));
          return Array.from(mergedMap.values());
        });
      }

      // Log action
      await logAction('IMPORT_ALL_CATALOG_ARTICLES', `Importation de ${importedCount} articles du catalogue de référence technique`, targetSite);

      return { imported: importedCount, skipped: MASTER_CATALOG.length - importedCount };
    } catch (err: any) {
      console.error(err);
      throw new Error(`Erreur lors de l'importation groupée : ${err.message || err}`);
    }
  }, [rawArticles, logAction]);

  const importSpecificCatalogItems = React.useCallback(async (targetSite: SiteCode, itemsToImport: CatalogItem[]) => {
    checkWritePermission();
    const isViewer = isSimulationMode();
    
    if (itemsToImport.length === 0) {
      return { imported: 0, skipped: 0 };
    }

    if (isViewer) {
      const newArticles: Article[] = itemsToImport.map(item => ({
        id: generateId(),
        site: targetSite,
        ref: item.reference,
        designation: item.designation,
        type: item.suggestedType,
        category: item.functionalCategory,
        functionalCategory: item.functionalCategory,
        subCategory: item.subCategory,
        component: item.component,
        subComponent: item.subComponent,
        notes: item.notes,
        unit: 'Pcs',
        quantity: 0,
        minStock: 1,
        location: '',
        price: item.price || 0,
        active: true
      }));

      setRawArticles(prev => [...newArticles, ...prev]);
      
      return { imported: newArticles.length, skipped: 0 };
    }

    checkMaintenanceLock();
    try {
      const chunkSize = 450;
      let importedCount = 0;

      for (let i = 0; i < itemsToImport.length; i += chunkSize) {
        const chunk = itemsToImport.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        const chunkArticles: Article[] = [];
        for (const item of chunk) {
          const artId = generateId();
          const art: Article = {
            id: artId,
            site: targetSite,
            ref: item.reference,
            designation: item.designation,
            type: item.suggestedType,
            category: item.functionalCategory,
            functionalCategory: item.functionalCategory,
            subCategory: item.subCategory,
            component: item.component,
            subComponent: item.subComponent,
            notes: item.notes,
            unit: 'Pcs',
            quantity: 0,
            minStock: 1,
            location: '',
            price: item.price || 0,
            active: true
          };
          chunkArticles.push(art);
          batch.set(doc(db, 'articles', artId), cleanObject(art));
        }

        await batch.commit();
        importedCount += chunk.length;
        
        setRawArticles(prev => {
          const mergedMap = new Map<string, Article>(prev.map(a => [a.id, a]));
          chunkArticles.forEach(art => mergedMap.set(art.id, art));
          return Array.from(mergedMap.values());
        });
      }

      // Log action
      const details = `Importation collective ciblée de ${importedCount} fiches d'articles pour le site ${targetSite}`;
      await logAction('BULK_IMPORT_ARTICLES', details, targetSite);

      return { imported: importedCount, skipped: 0 };
    } catch (err: any) {
      console.error(err);
      throw new Error(`Erreur lors de l'importation groupée ciblée : ${err.message || err}`);
    }
  }, [logAction]);

  const approveDeletionRequest = React.useCallback(async (requestId: string) => {
    checkMaintenanceLock();
    const req = deletionRequests.find(r => r.id === requestId);
    if (!req) {
      toast.error("Demande introuvable.");
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const id of req.articleIds) {
        batch.delete(doc(db, 'articles', id));
      }
      batch.update(doc(db, 'deletionRequests', requestId), { status: 'APPROVED' });
      await batch.commit();

      // Audit Logs
      const details = `Validation de la suppression d'articles réclamée par ${req.requestedBy}: ${req.articleDesignations.join(', ')}`;
      await logAction('APPROVE_DELETE_ARTICLE', details, req.site);



      toast.success("La demande de suppression a été validée.");
    } catch (err: any) {
      toast.error(`Échec: ${err.message || err}`);
    }
  }, [deletionRequests, logAction]);

  const rejectDeletionRequest = React.useCallback(async (requestId: string) => {
    checkMaintenanceLock();
    const req = deletionRequests.find(r => r.id === requestId);
    if (!req) {
      toast.error("Demande introuvable.");
      return;
    }

    try {
      await setDoc(doc(db, 'deletionRequests', requestId), { status: 'REJECTED' }, { merge: true });

      // Audit Logs
      const details = `Refus de la suppression d'articles demandée par ${req.requestedBy}: ${req.articleDesignations.join(', ')}`;
      await logAction('REJECT_DELETE_ARTICLE', details, req.site);

      toast.success("La demande de suppression a été rejetée.");
    } catch (err: any) {
      toast.error(`Échec: ${err.message || err}`);
    }
  }, [deletionRequests, logAction]);

  const toggleUser = React.useCallback(async (id: string) => {
    checkWritePermission();
    if (isSimulationMode()) {
      setAccounts(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], active: !next[idx].active };
          return next;
        }
        return prev;
      });
      return;
    }
    // Only ADMIN can toggle, handled by Firestore Rules, but check maintenance too
    checkMaintenanceLock();
    const user = accounts.find(u => u.id === id);
    if (user) await setDoc(doc(db, 'accounts', id), { active: !user.active }, { merge: true });
  }, [accounts]);

  const setUserRole = React.useCallback(async (id: string, role: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER') => {
    checkWritePermission();
    if (isSimulationMode()) {
      setAccounts(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], role };
          return next;
        }
        return prev;
      });
      return;
    }
    checkMaintenanceLock();
    const user = accounts.find(u => u.id === id);
    if (user) await setDoc(doc(db, 'accounts', id), { role }, { merge: true });
  }, [accounts]);

  const setUserAssignedSite = React.useCallback(async (id: string, site: SiteCode | '') => {
    checkWritePermission();
    if (isSimulationMode()) {
      setAccounts(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], assignedSite: site || undefined };
          return next;
        }
        return prev;
      });
      return;
    }
    checkMaintenanceLock();
    const user = accounts.find(u => u.id === id);
    if (user) {
      await setDoc(doc(db, 'accounts', id), { assignedSite: site || null }, { merge: true });
    }
  }, [accounts]);

  const setEngin = React.useCallback(async (id: string, data: any) => {
    checkWritePermission();
    
    // Update local React state instantly (optimistic UI) so additions display immediately
    setEngins(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (!data) {
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], deleted: true };
          return next.filter(item => !item.deleted);
        }
        return prev;
      }
      const item = { ...data, id };
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...item };
        return next;
      }
      return [...prev, item];
    });

    if (isSimulationMode()) {
      return;
    }
    checkMaintenanceLock();
    console.log("SAVING ENGIN:", data)
    if (!data) await setDoc(doc(db, 'engins', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'engins', id), cleanObject({ ...data, id }), { merge: true });
  }, []);

  const setPerfo = React.useCallback(async (id: string, data: any) => {
    checkWritePermission();
    
    // Update local React state instantly (optimistic UI) so additions display immediately
    setPerfos(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (!data) {
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], deleted: true };
          return next.filter(item => !item.deleted);
        }
        return prev;
      }
      const item = { ...data, id };
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...item };
        return next;
      }
      return [...prev, item];
    });

    if (isSimulationMode()) {
      return;
    }
    checkMaintenanceLock();
    console.log("SAVING PERFO:", data)
    if (!data) await setDoc(doc(db, 'perfos', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'perfos', id), cleanObject({ ...data, id }), { merge: true });
  }, []);

  const setAgent = React.useCallback(async (id: string, data: any) => {
    checkWritePermission();
    
    // Update local React state instantly (optimistic UI) so additions display immediately
    setAgents(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (!data) {
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], deleted: true };
          return next.filter(item => !item.deleted);
        }
        return prev;
      }
      const item = { ...data, id };
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...item };
        return next;
      }
      return [...prev, item];
    });

    if (isSimulationMode()) {
      return;
    }
    checkMaintenanceLock();
    console.log("SAVING AGENT:", data)
    if (!data) await setDoc(doc(db, 'agents', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'agents', id), cleanObject({ ...data, id }), { merge: true });
  }, []);

  const saveCatalogItem = React.useCallback(async (item: CatalogItem) => {
    checkWritePermission();
    if (isSimulationMode()) {
      setCatalog(prev => {
        const idx = prev.findIndex(x => x.id === item.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...item };
          return next;
        }
        return [...prev, item];
      });
      return;
    }
    checkMaintenanceLock();
    await setDoc(doc(db, 'catalog', item.id), cleanObject(item), { merge: true });
  }, []);

  const deleteCatalogItem = React.useCallback(async (id: string) => {
    checkWritePermission();
    if (isSimulationMode()) {
      setCatalog(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], deleted: true };
          return next;
        }
        return prev;
      });
      return;
    }
    checkMaintenanceLock();
    await setDoc(doc(db, 'catalog', id), { deleted: true }, { merge: true });
  }, []);

  const addPurchaseRequest = React.useCallback(async (pr: PurchaseRequest) => {
    checkWritePermission();
    if (isSimulationMode()) {
      const rId = pr.id || generateId();
      const item = { ...pr, id: rId };
      setPurchaseRequests(prev => {
        const idx = prev.findIndex(x => x.id === rId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [item, ...prev];
      });
      return;
    }
    checkMaintenanceLock();
    const id = pr.id || generateId();
    await setDoc(doc(db, 'purchaseRequests', id), cleanObject({ ...pr, id }));
  }, []);

  const updatePRStatus = React.useCallback(async (id: string, status: any) => {
    checkWritePermission();
    if (isSimulationMode()) {
      setPurchaseRequests(prev => {
        const idx = prev.findIndex(x => x.id === id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], status };
          return next;
        }
        return prev;
      });
      return;
    }
    checkMaintenanceLock();
    await setDoc(doc(db, 'purchaseRequests', id), { status }, { merge: true });
  }, []);

  const loadMoreMouvements = React.useCallback(async (lastVisibleDoc: any) => {
    try {
      const q = query(
        collection(db, 'mouvements'), 
        orderBy('date', 'desc'), 
        startAfter(lastVisibleDoc), 
        limit(50)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...serializeFirestoreData(doc.data())
      })).filter((item: any) => !item.deleted);
      
      setRawMouvements(prev => {
        const merged = new Map<string, Mouvement>(prev.map(m => [m.id, m]));
        data.forEach(m => merged.set(m.id, m));
        return Array.from(merged.values()).sort((a: any, b: any) => {
          return Date.parse(b.date) - Date.parse(a.date);
        });
      });
      return snap.docs[snap.docs.length - 1];
    } catch (err) {
      console.error("Pagination movements error:", err);
      return null;
    }
  }, []);

  const clearDLQ = () => {
    setDlq([]);
    localStorage.removeItem('hydromines_dlq');
    addTechLog('INFO', "File d'erreur critique DLQ réinitialisée par l'administrateur.");
  };

  const forceRunQueue = async () => {
    addTechLog('INFO', "Force d'exécution de la file d'attente initiée manuellement.");
    const currentQ = RetryQueueFSM.getQueue();
    if (currentQ.length === 0) {
      toast.info("La file d'attente est vide.");
      return;
    }
    toast.info("Tentative de resynchronisation des opérations...");
    await RetryQueueFSM.reconcilePendingQueueWithAuthority(db);
    await RetryQueueFSM.triggerProcessing();
    refreshFSMStates();
  };

  const simulateRuleFailure = async () => {
    const startTime = performance.now();
    addTechLog('INFO', "Crash Test: Tentative d'écriture illicite sur un log existant...");
    try {
      await setDoc(doc(db, 'auditLogs', 'SYSTEM_AUDIT_LOG_IMMUTABLE'), {
        action: 'MALICIOUS_REWRITE'
      }, { merge: true });
      addTechLog('WARN', "Échec de sécurité : l'opération directe sur les logs d'audit a été acceptée par la base !", performance.now() - startTime);
      toast.error("La simulation a réussi à écrire !");
    } catch (err: any) {
      const errMsg = err.message || String(err);
      addTechLog('INFO', `Sécurité confirmée ! Tentative annulée par la base : RESSOURCE_VERROUILLEE (${errMsg.slice(0, 60)}...)`, performance.now() - startTime);
      toast.success("Règles validées ! Écriture interdite rejetée.");
    }
  };

  const simulateConcurrentConflicts = async () => {
    if (articles.length === 0) return;
    const targetArticle = articles[0];
    addTechLog('INFO', `Test Concurrence : Lancement de 5 transactions simultanées sur '${targetArticle.designation}'...`);
    toast.info("Lancement du simulateur de concurrence...");
    
    const runSingleTxSim = async (simIdx: number) => {
      const txStart = performance.now();
      activeTxCount.current += 1;
      if (activeTxCount.current > 1) {
        setTxStats(s => ({ ...s, contentions: s.contentions + 1 }));
        addTechLog('WARN', `Surchauffe/Contention détectée ! Transactions simultanées : ${activeTxCount.current}`);
      }
      try {
        await runTransaction(db, async (transaction) => {
          const ref = doc(db, 'articles', targetArticle.id);
          const snap = await transaction.get(ref);
          if (!snap.exists()) return;
          const currentQty = snap.data().quantity;
          transaction.update(ref, { quantity: currentQty + 1 });
        });
        addTechLog('INFO', `Simulateur Tx #${simIdx} validé en ${Math.round(performance.now() - txStart)}ms.`);
      } catch (err: any) {
        addTechLog('ERROR', `Échec Sim Tx #${simIdx} : ${err.message}`);
      } finally {
        activeTxCount.current -= 1;
      }
    };

    await Promise.all([
      runSingleTxSim(1),
      runSingleTxSim(2),
      runSingleTxSim(3),
      runSingleTxSim(4),
      runSingleTxSim(5)
    ]);
    toast.success("Simulation concurrente terminée !");
  };

  const toggleMaintenanceLock = React.useCallback(async (enabled: boolean, reason?: string) => {
    try {
      if (currentUser?.role !== 'ADMIN') {
        throw new Error("PRIVILEGE_ESCALATION_BLOCKED: Only administrators can alter global maintenance locks.");
      }
      await setDoc(doc(db, 'metadata', 'system_config'), {
        maintenanceMode: enabled,
        lockReason: reason || 'Protected Maintenance Mode Active',
        updatedBy: currentUser.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(enabled ? "Système Verrouillé (Mode Maintenance enregistré)." : "Système Déverrouillé avec succès.");
    } catch (error) {
      toast.error("Échec de la mutation du verrou système.");
      console.error(error);
    }
  }, [currentUser]);



  const collectSystemMetrics = React.useCallback(() => {
    return {
      status: 'OK',
      payloadVersion: 'v8.0',
      queueLength: retryQueue.length,
      latency: isDegradedNetwork ? 'HIGH' : 'LOW'
    };
  }, [retryQueue.length, isDegradedNetwork]);

  const exportForensic = React.useCallback(() => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      queueLength: retryQueue.length,
      isDegradedNetwork
    }, null, 2);
  }, [retryQueue.length, isDegradedNetwork]);

  const networkQuality = React.useMemo(() => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return 'OFFLINE';
    }
    if (isDegradedNetwork) {
      return 'HIGH_LATENCY';
    }
    if (retryQueue.length > 5) {
      return 'INTERMITTENT';
    }
    if (retryQueue.length > 0) {
      return 'RECOVERING';
    }
    return 'ONLINE';
  }, [isDegradedNetwork, retryQueue.length]);

  const value = React.useMemo(() => ({
    articles, mouvements, distributions, auditLogs, transferts, inventaires,
    engins, perfos, agents, catalog, accounts, purchaseRequests, anomalyReports,
    maintenanceLogs, deletionRequests,
    currentSite, setCurrentSite,
    currentUser, isLoaded, isViewer, notifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead, addMouvement, addMaintenanceLog, addTransfert, completeTransfert,
    approveTransfert, closeTransfert,
    saveInventaire, saveArticle, deleteArticle, deleteArticles, importAllCatalogToArticles, importSpecificCatalogItems, approveDeletionRequest, rejectDeletionRequest, toggleUser, setUserRole, setUserAssignedSite, setEngin, setPerfo,
    setAgent, saveCatalogItem, deleteCatalogItem, addPurchaseRequest, updatePRStatus,
    loadMoreMouvements,
    networkQuality,

    isSafeMode,
    rcglResult,
    lastSnapshotTimestamp,
    setLastSnapshotTimestamp,

    // Mode Protected Maintenance
    maintenanceMode,
    maintenanceReason,
    toggleMaintenanceLock,

    // Observability & Industrial systems
    techLogs, retryQueue, dlq, avgTxDuration, txStats, isDegradedNetwork, setDegradedNetwork,
    forceRunQueue, clearDLQ, simulateRuleFailure, simulateConcurrentConflicts,
    collectSystemMetrics, exportForensic
  }), [
    articles, mouvements, distributions, auditLogs, transferts, inventaires,
    engins, perfos, agents, catalog, accounts, purchaseRequests, anomalyReports,
    maintenanceLogs, deletionRequests,
    currentSite, setCurrentSite,
    currentUser, isLoaded, isViewer, notifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead, addMouvement, addMaintenanceLog, addTransfert, completeTransfert,
    approveTransfert, closeTransfert,
    saveInventaire, saveArticle, deleteArticle, deleteArticles, importAllCatalogToArticles, importSpecificCatalogItems, approveDeletionRequest, rejectDeletionRequest, toggleUser, setUserRole, setUserAssignedSite, setEngin, setPerfo,
    setAgent, saveCatalogItem, deleteCatalogItem, addPurchaseRequest, updatePRStatus,
    loadMoreMouvements,
    networkQuality,
    isSafeMode,
    rcglResult,
    lastSnapshotTimestamp,
    maintenanceMode,
    maintenanceReason,
    toggleMaintenanceLock,
    techLogs, retryQueue, dlq, avgTxDuration, txStats, isDegradedNetwork, setDegradedNetwork,
    forceRunQueue, clearDLQ, simulateRuleFailure, simulateConcurrentConflicts,
    collectSystemMetrics, exportForensic
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
}
