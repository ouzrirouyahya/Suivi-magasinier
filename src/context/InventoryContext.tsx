import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
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
  SiteCode
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
  serverTimestamp,
  getDocs,
  getDoc,
  Transaction,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { RetryQueueFSM } from '../core/retryQueueFSM';
import { IndexedDBStorage } from '../core/indexedDBStorage';
import { getOrCreateIntent, isAlreadyCommittedInLocalRegistry } from '../core/operationIntent';
import { getDLQEntries } from '../core/deadLetterQueue';
import { validateGlobalSnapshotState } from '../core/rcgl';
import {
  validateMouvementInvariants,
  validateMaintenanceInvariants,
  validateTransferInvariants,
  validateCompleteTransferInvariants
} from '../core/BusinessStateValidator';
import { collectLiveSystemHealth, exportForensicSnapshot } from '../core/systemHealth';
import { logForensicEvent } from '../core/forensicJournal';
import { MaintenanceLock, validatePayloadIntegrity } from '../core/securityPolicy';
import { ImmutableInventoryLedger, SnapshotRecoveryEngine } from '../core/recoveryEngine';
import { runDeepIntegrityScan } from '../core/integrityScanner';

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
  anomalyReports: AnomalyReport[];
  maintenanceLogs: MaintenanceLog[];
  currentUser: UserAccount | null;
  isLoaded: boolean;
  notifications: {id: string, type: string, message: string, timestamp: string}[];
  addMouvement: (m: Mouvement) => Promise<void>;
  addMaintenanceLog: (log: MaintenanceLog) => Promise<void>;
  addTransfert: (t: Transfert) => Promise<void>;
  completeTransfert: (id: string, recepteur: string, receivedItems?: MouvementItem[], disputeReason?: string) => Promise<void>;
  approveTransfert: (id: string, approuvePar: string) => Promise<void>;
  closeTransfert: (id: string, motifCloture: string) => Promise<void>;
  saveInventaire: (i: Inventaire) => Promise<void>;
  saveArticle: (a: Article) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  toggleUser: (id: string) => Promise<void>;
  setEngin: (id: string, data: Partial<EnginMaster> | null) => Promise<void>;
  setPerfo: (id: string, data: Partial<PerfoMaster> | null) => Promise<void>;
  setAgent: (id: string, data: Partial<AgentMaster> | null) => Promise<void>;
  saveCatalogItem: (item: CatalogItem) => Promise<void>;
  deleteCatalogItem: (id: string) => Promise<void>;
  addPurchaseRequest: (pr: PurchaseRequest) => Promise<void>;
  updatePRStatus: (id: string, status: any) => Promise<void>;

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

  // SRE Snapshot Recovery & Integrity Engine v7.0
  ledgerEntries: any[];
  snapshots: any[];
  triggerDeepScan: () => any;
  triggerRollback: (snapshotId: string) => Promise<void>;
  triggerSKURollback: (sku: string, snapshotId: string) => Promise<void>;
  saveManualStateSnapshot: (label: string) => void;
  importEmergencyBackup: (backupData: any) => Promise<boolean>;
  reconstructStateFromLedger: () => Promise<void>;
};

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [rawArticles, setRawArticles] = useState<Article[]>([]);
  const [rawMouvements, setRawMouvements] = useState<Mouvement[]>([]);
  const [distributions, setDistributions] = useState<DistributionEPI[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rawTransferts, setRawTransferts] = useState<Transfert[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [engins, setEngins] = useState<EnginMaster[]>([]);
  const [perfos, setPerfos] = useState<PerfoMaster[]>([]);
  const [agents, setAgents] = useState<AgentMaster[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [anomalyReports, setAnomalyReports] = useState<AnomalyReport[]>([]);
  const [rawMaintenanceLogs, setRawMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authStateReady, setAuthStateReady] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, type: string, message: string, timestamp: string}[]>([]);

  // Mode Protected Maintenance SRE States
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maintenanceReason, setMaintenanceReason] = useState<string>('');

  // SRE States & Triggers v7.0
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const checkMaintenanceLock = () => {
    if (maintenanceMode && currentUser?.role !== 'ADMIN') {
      const msg = `PROTECTED_MAINTENANCE_LOCK: Toutes les opérations d'écriture sont temporairement verrouillées pour maintenance de sécurité. Raison: ${maintenanceReason || 'Lock global de sécurité'}`;
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // --- INDUSTRIAL OBSERVABILITY & SECURE QUEUE STATES ---
  const [techLogs, setTechLogs] = useState<{ id: string; timestamp: string; type: 'INFO' | 'WARN' | 'ERROR'; message: string; duration?: number }[]>([
    { id: 'baseline', timestamp: new Date().toISOString(), type: 'INFO', message: 'Moteur d\'observabilité HydroMines initialisé.' }
  ]);
  const [retryQueue, setRetryQueue] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('hydromines_retry_queue');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [dlq, setDlq] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('hydromines_dlq');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Dynamic status check synchronizer
  const refreshFSMStates = () => {
    setRetryQueue(RetryQueueFSM.getQueue());
    setDlq(getDLQEntries());
  };

  // --- STATE RECONCILIATION & CONSENSUS MERGE ENGINE (Rule 1) ---
  const articles = React.useMemo(() => {
    const mergedMap = new Map<string, Article>(rawArticles.map(a => [a.id, { ...a }]));
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
  }, [rawArticles, retryQueue, dlq]);

  useEffect(() => {
    // Initial sync of local ledger and SRE snapshot stores
    setLedgerEntries(ImmutableInventoryLedger.getEntries());
    setSnapshots(SnapshotRecoveryEngine.getSnapshots());

    // Create baseline if none exists
    if (isLoaded && articles.length > 0 && SnapshotRecoveryEngine.getSnapshots().length === 0) {
      SnapshotRecoveryEngine.saveAutomaticSnapshot(articles, "Baseline d'initialisation SRE");
      setSnapshots(SnapshotRecoveryEngine.getSnapshots());
    }
  }, [isLoaded, articles.length]);

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
  const [rcglResult, setRcglResult] = useState({
    isHighlyStale: false,
    hasCollectionVersionSkew: false,
    isGloballyConsistent: true,
    skewDescription: undefined as string | undefined,
    freshnessGapMs: 0,
    confidenceScore: 1.0,
    mode: 'NORMAL' as 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED',
    classification: 'VALID' as 'NETWORK_DRIFT' | 'STATE_INCONSISTENCY' | 'TRANSACTION_CONFLICT' | 'VALID'
  });

  const isSafeMode = rcglResult.classification === 'STATE_INCONSISTENCY';

  useEffect(() => {
    const runCheck = () => {
      const result = validateGlobalSnapshotState(
        articles,
        mouvements,
        transferts,
        lastSnapshotTimestamp,
        retryQueue.length,
        dlq.length
      );
      setRcglResult(result);
    };

    runCheck();
    const interval = setInterval(runCheck, 3000);
    return () => clearInterval(interval);
  }, [articles, mouvements, transferts, lastSnapshotTimestamp, retryQueue, dlq]);

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

  const isNetworkError = (msgMsg: string): boolean => {
    const msg = msgMsg.toLowerCase();
    return msg.includes('network') || msg.includes('offline') || msg.includes('failed-precondition') || msg.includes('unavailable') || msg.includes('timeout') || msg.includes('internet');
  };

  // Automatic FSM Queue background retry processor & startup Self-Healing (Rule 4)
  useEffect(() => {
    // 1. Register transaction resolvers with central FIFO FSM
    RetryQueueFSM.registerResolver('MOUVEMENT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM MOUVEMENT démarrée : ${intentId}`);
      await executeMouvementDirect(payload);
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('MAINTENANCE', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM MAINTENANCE démarrée : ${intentId}`);
      await executeMaintenanceLogDirect(payload);
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM TRANSFERT démarrée : ${intentId}`);
      await executeTransfertDirect(payload);
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('COMPLETE_TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM COMPLETE_TRANSFERT démarrée : ${intentId}`);
      await executeCompleteTransfertDirect(payload.id, payload.recepteur, payload.receivedItems, payload.disputeReason);
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('APPROVE_TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM APPROVE_TRANSFERT démarrée : ${intentId}`);
      await executeApproveTransfertDirect(payload.id, payload.approuvePar);
      return { status: 'SUCCESS_ACK' };
    });

    RetryQueueFSM.registerResolver('CLOSE_TRANSFERT', async (payload, intentId) => {
      addTechLog('INFO', `Intention FSM CLOSE_TRANSFERT démarrée : ${intentId}`);
      await executeCloseTransfertDirect(payload.id, payload.motifCloture);
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
      setIsLoaded(true);
      return;
    }

    const uid = auth.currentUser.uid;
    const unsubUser = onSnapshot(doc(db, 'accounts', uid), async (snap) => {
      if (snap.exists()) {
        const userData = serializeFirestoreData({ id: snap.id, ...snap.data() }) as UserAccount;
        setCurrentUser(userData);
        setIsLoaded(true);
      } else {
        let role: 'ADMIN' | 'MAGASINIER' = 'MAGASINIER';
        if (auth.currentUser?.email === 'ouzrirouyahya@gmail.com') role = 'ADMIN';

        const newUser: UserAccount = {
          id: uid,
          email: auth.currentUser?.email || '',
          name: auth.currentUser?.displayName || 'Utilisateur',
          role: role,
          active: true,
          createdAt: new Date().toISOString()
        };
        
        setCurrentUser(newUser);
        setDoc(doc(db, 'accounts', uid), cleanObject(newUser))
          .then(() => setIsLoaded(true))
          .catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `accounts/${uid}`);
            setIsLoaded(true); 
          });
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
    if (!isLoaded || !currentUser || !currentUser.active) return;
    const unsubs: (() => void)[] = [];

    const setupDataListeners = async () => {
      const safeOnSnapshot = (ref: any, setter: (data: any) => void, path: string) => {
        return onSnapshot(ref, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => {
            const raw = { id: doc.id, ...doc.data() };
            return serializeFirestoreData(raw);
          }).filter((d: any) => !d.deleted);
          setter(data);
          setLastSnapshotTimestamp(Date.now());
        }, (err) => {
          if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, path);
        });
      };

      // Seeding logic... (keep as is)
      const seedIfEmpty = async (col: string, data: any[]) => {
        const snap = await getDocs(query(collection(db, col), limit(1)));
        if (snap.empty) {
          const batch = writeBatch(db);
          data.forEach(item => batch.set(doc(db, col, item.id || generateId()), cleanObject(item)));
          await batch.commit();
        }
      };

      seedIfEmpty('articles', INITIAL_ARTICLES);
      seedIfEmpty('catalog', MASTER_CATALOG);
      seedIfEmpty('engins', INITIAL_ENGINS);

      unsubs.push(safeOnSnapshot(collection(db, 'articles'), setRawArticles, 'articles'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(1000)), setRawMouvements, 'mouvements'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100)), setAuditLogs, 'auditLogs'));
      unsubs.push(safeOnSnapshot(collection(db, 'transferts'), setRawTransferts, 'transferts'));
      unsubs.push(safeOnSnapshot(collection(db, 'inventaires'), setInventaires, 'inventaires'));
      unsubs.push(safeOnSnapshot(collection(db, 'catalog'), setCatalog, 'catalog'));
      unsubs.push(safeOnSnapshot(collection(db, 'engins'), setEngins, 'engins'));
      unsubs.push(safeOnSnapshot(collection(db, 'perfos'), setPerfos, 'perfos'));
      unsubs.push(safeOnSnapshot(collection(db, 'agents'), setAgents, 'agents'));
      unsubs.push(safeOnSnapshot(collection(db, 'distributions'), setDistributions, 'distributions'));
      unsubs.push(safeOnSnapshot(collection(db, 'purchaseRequests'), setPurchaseRequests, 'purchaseRequests'));
      unsubs.push(safeOnSnapshot(collection(db, 'anomalyReports'), setAnomalyReports, 'anomalyReports'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'maintenanceLogs'), orderBy('date', 'desc')), setRawMaintenanceLogs, 'maintenanceLogs'));

      if (currentUser.role === 'ADMIN') {
        unsubs.push(safeOnSnapshot(collection(db, 'accounts'), setAccounts, 'accounts'));
      }

      // Live subscription to global system locks
      unsubs.push(onSnapshot(doc(db, 'metadata', 'system_config'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMaintenanceMode(data.maintenanceMode === true);
          setMaintenanceReason(data.lockReason || '');
          if (data.maintenanceMode === true) {
            MaintenanceLock.enableLock(data.lockReason || 'Maintenance de sécurité');
          } else {
            MaintenanceLock.disableLock();
          }
        } else {
          setMaintenanceMode(false);
          setMaintenanceReason('');
          MaintenanceLock.disableLock();
        }
      }, (err) => {
        console.warn("Telemetry lock read restrictions active or document uninitialized:", err.message);
      }));
    };

    setupDataListeners();
    return () => unsubs.forEach(u => u());
  }, [isLoaded, currentUser]);

  // Handlers (Simplified and wrapped in promises)
  const logAction = async (action: string, details: string, site: any, amount: number = 0) => {
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
  };

  // Transaction-bound audit logger
  const logActionTx = (transaction: Transaction, action: string, details: string, site: any, amount: number = 0) => {
    const id = generateSecureUUID();
    const deviceInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent} (${navigator.language || 'fr'})` : 'Unknown client environment';
    transaction.set(doc(db, 'auditLogs', id), cleanObject({
      id, 
      timestamp: serverTimestamp(), 
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

  const executeMouvementDirect = async (mouvement: Mouvement) => {
    const movementId = mouvement.id || generateSecureUUID();
    registerPendingOp(movementId);
    try {
      await runTransaction(db, async (transaction) => {
        // Idemptotency check
        const movementRef = doc(db, 'mouvements', movementId);
        const movementSnap = await transaction.get(movementRef);
        if (movementSnap.exists()) {
          throw new Error("MOUVEMENT_DEJA_TRAITE");
        }

        let totalValue = 0;
        const articleUpdates: { ref: any, newQty: number }[] = [];

        // 1. All reads must occur before any writes
        for (const item of mouvement.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          if (!articleSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          const article = articleSnap.data() as Article;
          totalValue += item.quantity * (article.price || 0);
          
          const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
          const newQty = isAddition ? article.quantity + item.quantity : article.quantity - item.quantity;
          
          if (newQty < 0) {
            throw new Error("STOCK_INSUFFISANT");
          }
          articleUpdates.push({ ref: articleRef, newQty });
        }

        // 2. Perform all updates
        for (const update of articleUpdates) {
          transaction.update(update.ref, { quantity: update.newQty });
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
  };

  const addMouvement = async (mouvement: Mouvement) => {
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

        // Immutable Ledger Entry v7.0 SRE
        ImmutableInventoryLedger.appendEntry(intentId, 'MOUVEMENT_SUBMISSION', { ...mouvement, status: 'VALIDE' });
        setLedgerEntries(ImmutableInventoryLedger.getEntries());

        // Snapshot Trigger
        SnapshotRecoveryEngine.saveAutomaticSnapshot(articles, `Flux de Stock: ${mouvement.type}`);
        setSnapshots(SnapshotRecoveryEngine.getSnapshots());

        const duration = performance.now() - startTime;
        updateAvgTxDuration(duration);
        addTechLog('INFO', `Mouvement [${mouvement.type}] enregistré avec succès.`, duration);
        setTxStats(s => ({ ...s, success: s.success + 1 }));
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        
        if (isNetworkError(errMsg)) {
          addTechLog('WARN', `Panne réseau détectée. Mouvement mis en file de reprise : ${errMsg}`, duration);
          
          // Immutable Ledger Entry for offline transactions v7.0 SRE
          ImmutableInventoryLedger.appendEntry(intentId, 'MOUVEMENT_SUBMISSION', { ...mouvement, status: 'BROUILLON_OFFLINE' });
          setLedgerEntries(ImmutableInventoryLedger.getEntries());

          // Enqueue directly using SRE system-hardened RetryQueueFSM with immutable intentId
          RetryQueueFSM.enqueue('MOUVEMENT', mouvement, intentId);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Opération sauvegardée localement.");
        } else {
          addTechLog('ERROR', `Échec critique mouvement de stock : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          throw err;
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[movementId];
      }
    })();

    activePromisesRef.current[movementId] = promise;
    return promise;
  };

  const executeMaintenanceLogDirect = async (log: MaintenanceLog) => {
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
  };

  const addMaintenanceLog = async (log: MaintenanceLog) => {
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
        
        if (isNetworkError(errMsg)) {
          addTechLog('WARN', `Réseau indisponible. Log de maintenance mis en file de reprise : ${errMsg}`, duration);
          
          RetryQueueFSM.enqueue('MAINTENANCE', log, intentId);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Log de maintenance sauvegardé localement.");
        } else {
          addTechLog('ERROR', `Échec du log de maintenance : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          throw err;
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[id];
      }
    })();

    activePromisesRef.current[id] = promise;
    return promise;
  };

  const executeTransfertDirect = async (t: Transfert) => {
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
  };

  const addTransfert = async (t: Transfert) => {
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
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        
        if (isNetworkError(errMsg)) {
          addTechLog('WARN', `Réseau déconnecté. Transfert d'envoi mis en file d'attente : ${errMsg}`, duration);
          
          RetryQueueFSM.enqueue('TRANSFERT', t, intentId, t.sourceSite);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Opération sauvegardée localement.");
        } else {
          addTechLog('ERROR', `Échec du transfert d'envoi : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          throw err;
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[id];
      }
    })();

    activePromisesRef.current[id] = promise;
    return promise;
  };

  const executeApproveTransfertDirect = async (id: string, approuvePar: string) => {
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
  };

  const approveTransfert = async (id: string, approuvePar: string) => {
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
        
        if (isNetworkError(errMsg)) {
          addTechLog('WARN', `Réseau défectueux. Approbation mise en file d'attente : ${errMsg}`, duration);
          RetryQueueFSM.enqueue('APPROVE_TRANSFERT', { id, approuvePar }, intentId, sourceT?.sourceSite);
          refreshFSMStates();
          toast.warning("Réseau indisponible. Approbation stockée localement.");
        } else {
          addTechLog('ERROR', `Échec approbation transfert : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          throw err;
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[`approve-${id}`];
      }
    })();

    activePromisesRef.current[`approve-${id}`] = promise;
    return promise;
  };

  const executeCompleteTransfertDirect = async (
    id: string, 
    recepteur: string, 
    receivedItems?: MouvementItem[], 
    disputeReason?: string
  ) => {
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
  };

  const completeTransfert = async (
    id: string, 
    recepteur: string, 
    receivedItems?: MouvementItem[], 
    disputeReason?: string
  ) => {
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
      } catch (err: any) {
        const duration = performance.now() - startTime;
        const errMsg = err.message || String(err);
        
        if (isNetworkError(errMsg)) {
          addTechLog('WARN', `Réseau déconnecté. Réception de transfert mise en file de reprise : ${errMsg}`, duration);
          
          RetryQueueFSM.enqueue('COMPLETE_TRANSFERT', { id, recepteur, receivedItems, disputeReason }, intentId, sourceT?.targetSite);
          refreshFSMStates();

          toast.warning("Réseau indisponible. Réception sauvegardée localement.");
        } else {
          addTechLog('ERROR', `Échec de la réception de transfert : ${errMsg}`, duration);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          throw err;
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[id];
      }
    })();

    activePromisesRef.current[id] = promise;
    return promise;
  };

  const executeCloseTransfertDirect = async (id: string, motifCloture: string) => {
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
  };

  const closeTransfert = async (id: string, motifCloture: string) => {
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

        if (isNetworkError(errMsg)) {
          addTechLog('WARN', `Réseau absent. Clôture de transfert mise en attente de synchro.`);
          RetryQueueFSM.enqueue('CLOSE_TRANSFERT', { id, motifCloture }, intentId, sourceT?.targetSite);
          refreshFSMStates();
          toast.warning("Réseau indisponible. Clôture enregistrée localement.");
        } else {
          addTechLog('ERROR', `Échec clôture transfert : ${errMsg}`);
          setTxStats(s => ({ ...s, failed: s.failed + 1 }));
          throw err;
        }
      } finally {
        activeTxCount.current -= 1;
        delete activePromisesRef.current[`close-${id}`];
      }
    })();

    activePromisesRef.current[`close-${id}`] = promise;
    return promise;
  };

  const saveInventaire = async (i: Inventaire) => {
    checkMaintenanceLock();
    const id = i.id || generateId();
    await setDoc(doc(db, 'inventaires', id), cleanObject({ ...i, id }));

    // SRE Immutable Ledger Hook v7.0
    ImmutableInventoryLedger.appendEntry(`inv-${id}`, 'INVENTAIRE_ALIGN', { ...i, id });
    setLedgerEntries(ImmutableInventoryLedger.getEntries());

    // SRE Automated Snapshot Trigger
    SnapshotRecoveryEngine.saveAutomaticSnapshot(articles, `Ajustement inventaire: ${i.type}`);
    setSnapshots(SnapshotRecoveryEngine.getSnapshots());
  };

  const saveArticle = async (a: Article) => {
    checkMaintenanceLock();
    const id = a.id || generateId();
    await setDoc(doc(db, 'articles', id), cleanObject({ ...a, id }));

    // SRE Immutable Ledger Hook v7.0
    ImmutableInventoryLedger.appendEntry(`art-${id}`, 'ARTICLE_MUTATION', { ...a, id });
    setLedgerEntries(ImmutableInventoryLedger.getEntries());

    // SRE Automated Snapshot Trigger
    SnapshotRecoveryEngine.saveAutomaticSnapshot(articles, `Modification d'article: ${a.ref}`);
    setSnapshots(SnapshotRecoveryEngine.getSnapshots());
  };

  const deleteArticle = async (id: string) => {
    checkMaintenanceLock();
    await setDoc(doc(db, 'articles', id), { deleted: true }, { merge: true });

    // SRE Immutable Ledger Hook v7.0
    ImmutableInventoryLedger.appendEntry(`art-del-${id}`, 'ARTICLE_MUTATION', { id, deleted: true });
    setLedgerEntries(ImmutableInventoryLedger.getEntries());

    // SRE Automated Snapshot Trigger
    SnapshotRecoveryEngine.saveAutomaticSnapshot(articles, `Suppression de l'article ID ${id}`);
    setSnapshots(SnapshotRecoveryEngine.getSnapshots());
  };

  const toggleUser = async (id: string) => {
    // Only ADMIN can toggle, handled by Firestore Rules, but check maintenance too
    checkMaintenanceLock();
    const user = accounts.find(u => u.id === id);
    if (user) await setDoc(doc(db, 'accounts', id), { active: !user.active }, { merge: true });
  };

  const setEngin = async (id: string, data: any) => {
    checkMaintenanceLock();
    if (!data) await setDoc(doc(db, 'engins', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'engins', id), cleanObject({ ...data, id }), { merge: true });
  };

  const setPerfo = async (id: string, data: any) => {
    checkMaintenanceLock();
    if (!data) await setDoc(doc(db, 'perfos', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'perfos', id), cleanObject({ ...data, id }), { merge: true });
  };

  const setAgent = async (id: string, data: any) => {
    checkMaintenanceLock();
    if (!data) await setDoc(doc(db, 'agents', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'agents', id), cleanObject({ ...data, id }), { merge: true });
  };

  const saveCatalogItem = async (item: CatalogItem) => {
    checkMaintenanceLock();
    await setDoc(doc(db, 'catalog', item.id), cleanObject(item), { merge: true });
  };

  const deleteCatalogItem = async (id: string) => {
    checkMaintenanceLock();
    await setDoc(doc(db, 'catalog', id), { deleted: true }, { merge: true });
  };

  const addPurchaseRequest = async (pr: PurchaseRequest) => {
    checkMaintenanceLock();
    const id = pr.id || generateId();
    await setDoc(doc(db, 'purchaseRequests', id), cleanObject({ ...pr, id }));
  };

  const updatePRStatus = async (id: string, status: any) => {
    checkMaintenanceLock();
    await setDoc(doc(db, 'purchaseRequests', id), { status }, { merge: true });
  };

  const clearDLQ = () => {
    setDlq([]);
    localStorage.removeItem('hydromines_dlq');
    addTechLog('INFO', "File d'erreur critique DLQ réinitialisée par l'administrateur.");
  };

  const forceRunQueue = async () => {
    addTechLog('INFO', "Force d'exécution de la file d'attente initiée manuellement.");
    if (retryQueue.length === 0) {
      toast.info("La file d'attente est vide.");
      return;
    }
    setRetryQueue(prev => prev.map(x => ({ ...x, retryCount: 0 })));
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

  const toggleMaintenanceLock = async (enabled: boolean, reason?: string) => {
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
  };

  const collectSystemMetrics = () => {
    return collectLiveSystemHealth(lastSnapshotTimestamp, retryQueue.length, retryQueue);
  };

  const exportForensic = () => {
    return exportForensicSnapshot(lastSnapshotTimestamp, retryQueue, rcglResult);
  };

  const triggerDeepScan = (site: string) => {
    return runDeepIntegrityScan(articles, mouvements, site);
  };

  const triggerRollback = async (snapshotId: string) => {
    checkMaintenanceLock();
    try {
      const restored = SnapshotRecoveryEngine.rollbackToSnapshot(snapshotId);
      
      const batch = writeBatch(db);
      restored.forEach((art) => {
        batch.set(doc(db, 'articles', art.id), cleanObject(art));
      });
      await batch.commit();

      ImmutableInventoryLedger.appendEntry(
        `rollback-${snapshotId}`,
        'LEDGER_RESTORE',
        { snapshotId, label: 'Full State Rollback' }
      );

      SnapshotRecoveryEngine.saveAutomaticSnapshot(restored, `Post-Restauration (${snapshotId})`);

      setLedgerEntries(ImmutableInventoryLedger.getEntries());
      setSnapshots(SnapshotRecoveryEngine.getSnapshots());

      addTechLog('INFO', `Restauration complète de l'inventaire au Snapshot [${snapshotId}] exécutée.`);
      toast.success("Restauration complète effectuée avec succès.");
    } catch (error: any) {
      addTechLog('ERROR', `Échec de la restauration complète : ${error.message || error}`);
      toast.error(`Erreur de restauration: ${error.message || error}`);
      throw error;
    }
  };

  const triggerSKURollback = async (sku: string, snapshotId: string) => {
    checkMaintenanceLock();
    try {
      const restored = SnapshotRecoveryEngine.selectiveSKURollback(sku, snapshotId, articles);
      
      const targetArticle = restored.find((a) => a.ref === sku);
      if (targetArticle) {
        await setDoc(doc(db, 'articles', targetArticle.id), cleanObject(targetArticle));
      }

      ImmutableInventoryLedger.appendEntry(
        `sku-rollback-${sku}-${snapshotId}`,
        'LEDGER_RESTORE',
        { sku, snapshotId, label: `Selective SKU Rollback` }
      );

      setLedgerEntries(ImmutableInventoryLedger.getEntries());
      setSnapshots(SnapshotRecoveryEngine.getSnapshots());

      addTechLog('INFO', `Restauration sélective du SKU [${sku}] au Snapshot [${snapshotId}] exécutée.`);
      toast.success(`SKU ${sku} restauré avec succès.`);
    } catch (error: any) {
      addTechLog('ERROR', `Échec de la restauration sélective : ${error.message || error}`);
      toast.error(`Erreur SKU: ${error.message || error}`);
      throw error;
    }
  };

  const saveManualStateSnapshot = (label: string) => {
    SnapshotRecoveryEngine.saveAutomaticSnapshot(articles, label || "Snapshot de sécurité manuel");
    setSnapshots(SnapshotRecoveryEngine.getSnapshots());
    toast.success("Snapshot manuel créé avec succès.");
  };

  const importEmergencyBackup = async (backupData: any): Promise<boolean> => {
    checkMaintenanceLock();
    try {
      if (!backupData || typeof backupData !== 'object') throw new Error("Format de sauvegarde invalide.");
      if (!Array.isArray(backupData.articles) || !Array.isArray(backupData.ledger)) {
        throw new Error("La structure de sauvegarde doit contenir la liste d'articles et le ledger d'intégrité.");
      }

      const previousLedgerRaw = localStorage.getItem('hydromines_immutable_ledger');
      localStorage.setItem('hydromines_immutable_ledger', JSON.stringify(backupData.ledger));
      const integrity = ImmutableInventoryLedger.verifyIntegrity();
      if (integrity.isCorrupted) {
        if (previousLedgerRaw) localStorage.setItem('hydromines_immutable_ledger', previousLedgerRaw);
        else localStorage.removeItem('hydromines_immutable_ledger');
        throw new Error(`COHÉRENCE_ERREUR: Chaîne de ledger importée corrompue au bloc #${integrity.brokenIndex}. Importation annulée.`);
      }

      const batch = writeBatch(db);
      backupData.articles.forEach((art: any) => {
        if (!art.id || !art.ref || art.quantity === undefined) {
          throw new Error("Structure d'article importé corrompue dans le jeu de données.");
        }
        batch.set(doc(db, 'articles', art.id), cleanObject(art));
      });
      await batch.commit();

      ImmutableInventoryLedger.appendEntry(
        `import-${Date.now()}`,
        'LEDGER_RESTORE',
        { label: "Importation de sauvegarde d'urgence", size: backupData.articles.length }
      );

      SnapshotRecoveryEngine.saveAutomaticSnapshot(backupData.articles, "Post-Importation de Sauvegarde SRE");

      setLedgerEntries(ImmutableInventoryLedger.getEntries());
      setSnapshots(SnapshotRecoveryEngine.getSnapshots());

      addTechLog('INFO', "Importation complète et restauration d'urgence terminée avec succès.");
      toast.success("Base d'inventaire et chaine d'intégrité restaurées avec succès !");
      return true;
    } catch (err: any) {
      addTechLog('ERROR', `Échec critique import sauvegarde : ${err.message || err}`);
      toast.error(`Échec d'importation: ${err.message || err}`);
      return false;
    }
  };

  const reconstructStateFromLedger = async () => {
    checkMaintenanceLock();
    try {
      const entries = ImmutableInventoryLedger.getEntries();
      if (entries.length === 0) {
        throw new Error("Aucune entrée dans le ledger pour reconstruire l'état.");
      }

      const integrity = ImmutableInventoryLedger.verifyIntegrity();
      if (integrity.isCorrupted) {
        throw new Error(`Blockchain d'inventaire corrompue au bloc ${integrity.brokenIndex}. Reconstitution impossible par sécurité.`);
      }

      const virtualStock: Record<string, number> = {};
      
      entries.forEach((entry) => {
        if (entry.actionType === 'ARTICLE_MUTATION') {
          const a = entry.payload;
          if (a && a.id && !a.deleted) {
            virtualStock[a.id] = a.quantity || 0;
          }
        }
      });

      entries.forEach((entry) => {
        if (entry.actionType === 'MOUVEMENT_SUBMISSION') {
          const mov = entry.payload;
          if (mov && (mov.status === 'VALIDE' || mov.status === 'COMPLETE')) {
            (mov.items || []).forEach((item: any) => {
              const current = virtualStock[item.articleId] || 0;
              const isAdd = mov.type === 'ENTREE' || mov.type === 'TRANSFERT_IN' || mov.type === 'RETOUR';
              virtualStock[item.articleId] = isAdd ? current + item.quantity : current - item.quantity;
            });
          }
        } else if (entry.actionType === 'INVENTAIRE_ALIGN') {
          const i = entry.payload;
          if (i && i.items) {
            i.items.forEach((item: any) => {
              virtualStock[item.articleId] = item.countedQuantity;
            });
          }
        }
      });

      const batch = writeBatch(db);
      let updatedCount = 0;
      articles.forEach((art) => {
        const reconstructedQty = virtualStock[art.id];
        if (reconstructedQty !== undefined && reconstructedQty !== art.quantity) {
          batch.update(doc(db, 'articles', art.id), { quantity: reconstructedQty });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
      }

      ImmutableInventoryLedger.appendEntry(
        `reconstruct-ledger-${Date.now()}`,
        'MANUAL_OVERWRITE',
        { label: 'Reconstitution SRE des balances depuis Ledger immuable', updatedSKUs: updatedCount }
      );

      const refreshedList = articles.map(a => {
        const q = virtualStock[a.id];
        return q !== undefined ? { ...a, quantity: q } : a;
      });
      SnapshotRecoveryEngine.saveAutomaticSnapshot(refreshedList, "Reconstruction d'urgence post-incident (Ledger-led)");

      setLedgerEntries(ImmutableInventoryLedger.getEntries());
      setSnapshots(SnapshotRecoveryEngine.getSnapshots());

      addTechLog('INFO', `Reconstruction d'inventaire depuis le Ledger immuable terminée. SKUs alignés : ${updatedCount}.`);
      toast.success(`Consolidation par Ledger terminée! ${updatedCount} articles alignés.`);
    } catch (err: any) {
      addTechLog('ERROR', `Échec de consolidation Ledger : ${err.message || err}`);
      toast.error(`Reconstruction avortée: ${err.message || err}`);
      throw err;
    }
  };

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

  const value = {
    articles, mouvements, distributions, auditLogs, transferts, inventaires,
    engins, perfos, agents, catalog, accounts, purchaseRequests, anomalyReports,
    maintenanceLogs,
    currentUser, isLoaded, notifications, addMouvement, addMaintenanceLog, addTransfert, completeTransfert,
    approveTransfert, closeTransfert,
    saveInventaire, saveArticle, deleteArticle, toggleUser, setEngin, setPerfo,
    setAgent, saveCatalogItem, deleteCatalogItem, addPurchaseRequest, updatePRStatus,
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
    collectSystemMetrics, exportForensic,

    // SRE Snapshot Recovery & Integrity Engine v7.0 exports
    ledgerEntries,
    snapshots,
    triggerDeepScan,
    triggerRollback,
    triggerSKURollback,
    saveManualStateSnapshot,
    importEmergencyBackup,
    reconstructStateFromLedger
  };

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
