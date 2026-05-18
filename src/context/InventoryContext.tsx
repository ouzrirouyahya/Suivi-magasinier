import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { 
  Article, 
  Mouvement, 
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
  AnomalyReport 
} from '../types';
import { INITIAL_ARTICLES, INITIAL_MOUVEMENTS, INITIAL_ENGINS, INITIAL_PERFOS, INITIAL_AGENTS } from '../demoData';
import { MASTER_CATALOG, CATALOG_VERSION } from '../catalogData';
import { generateId, handleFirestoreError, OperationType, cleanObject } from '../lib/utils';
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
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';

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
  currentUser: UserAccount | null;
  isLoaded: boolean;
  addMouvement: (m: Mouvement) => Promise<void>;
  addTransfert: (t: Transfert) => Promise<void>;
  completeTransfert: (id: string, recepteur: string) => Promise<void>;
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
};

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [distributions, setDistributions] = useState<DistributionEPI[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [engins, setEngins] = useState<EnginMaster[]>([]);
  const [perfos, setPerfos] = useState<PerfoMaster[]>([]);
  const [agents, setAgents] = useState<AgentMaster[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [anomalyReports, setAnomalyReports] = useState<AnomalyReport[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authStateReady, setAuthStateReady] = useState(false);

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
        const userData = { id: snap.id, ...snap.data() } as UserAccount;
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
          const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })).filter((d: any) => !d.deleted);
          setter(data);
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

      unsubs.push(safeOnSnapshot(collection(db, 'articles'), setArticles, 'articles'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(1000)), setMouvements, 'mouvements'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100)), setAuditLogs, 'auditLogs'));
      unsubs.push(safeOnSnapshot(collection(db, 'transferts'), setTransferts, 'transferts'));
      unsubs.push(safeOnSnapshot(collection(db, 'inventaires'), setInventaires, 'inventaires'));
      unsubs.push(safeOnSnapshot(collection(db, 'catalog'), setCatalog, 'catalog'));
      unsubs.push(safeOnSnapshot(collection(db, 'engins'), setEngins, 'engins'));
      unsubs.push(safeOnSnapshot(collection(db, 'perfos'), setPerfos, 'perfos'));
      unsubs.push(safeOnSnapshot(collection(db, 'agents'), setAgents, 'agents'));
      unsubs.push(safeOnSnapshot(collection(db, 'distributions'), setDistributions, 'distributions'));
      unsubs.push(safeOnSnapshot(collection(db, 'purchaseRequests'), setPurchaseRequests, 'purchaseRequests'));
      unsubs.push(safeOnSnapshot(collection(db, 'anomalyReports'), setAnomalyReports, 'anomalyReports'));

      if (currentUser.role === 'ADMIN') {
        unsubs.push(safeOnSnapshot(collection(db, 'accounts'), setAccounts, 'accounts'));
      }
    };

    setupDataListeners();
    return () => unsubs.forEach(u => u());
  }, [isLoaded, currentUser]);

  // Handlers (Simplified and wrapped in promises)
  const logAction = async (action: string, details: string, site: any, amount: number = 0) => {
    const id = generateId();
    await setDoc(doc(db, 'auditLogs', id), cleanObject({
      id, timestamp: new Date().toISOString(), userEmail: auth.currentUser?.email || 'Système',
      site, action, details, amount
    }));
  };

  const addMouvement = async (mouvement: Mouvement) => {
    await runTransaction(db, async (transaction) => {
      const movementId = mouvement.id || generateId();
      let totalValue = 0;
      for (const item of mouvement.items) {
        const articleRef = doc(db, 'articles', item.articleId);
        const articleSnap = await transaction.get(articleRef);
        if (!articleSnap.exists()) throw new Error(`Article ${item.articleId} non trouvé`);
        const article = articleSnap.data() as Article;
        totalValue += item.quantity * article.price;
        const newQty = (mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN') 
          ? article.quantity + item.quantity 
          : article.quantity - item.quantity;
        if (newQty < 0) throw new Error(`Stock insuffisant pour ${article.designation}`);
        transaction.update(articleRef, { quantity: newQty });
      }
      transaction.set(doc(db, 'mouvements', movementId), cleanObject({ ...mouvement, id: movementId }));
      await logAction(mouvement.type, `Réf: ${mouvement.reference}`, mouvement.site, totalValue);
    });
  };

  const addTransfert = async (t: Transfert) => {
    const id = t.id || generateId();
    await setDoc(doc(db, 'transferts', id), cleanObject({ ...t, id }));
    await logAction('TRANSFERT_OUT', `Transfert ${t.reference}`, t.sourceSite);
  };

  const completeTransfert = async (id: string, recepteur: string) => {
    const tRef = doc(db, 'transferts', id);
    await setDoc(tRef, { status: 'RECU', dateReception: new Date().toISOString(), recepteur }, { merge: true });
  };

  const saveInventaire = async (i: Inventaire) => {
    const id = i.id || generateId();
    await setDoc(doc(db, 'inventaires', id), cleanObject({ ...i, id }));
  };

  const saveArticle = async (a: Article) => {
    const id = a.id || generateId();
    await setDoc(doc(db, 'articles', id), cleanObject({ ...a, id }));
  };

  const deleteArticle = async (id: string) => {
    await setDoc(doc(db, 'articles', id), { deleted: true }, { merge: true });
  };

  const toggleUser = async (id: string) => {
    const user = accounts.find(u => u.id === id);
    if (user) await setDoc(doc(db, 'accounts', id), { active: !user.active }, { merge: true });
  };

  const setEngin = async (id: string, data: any) => {
    if (!data) await setDoc(doc(db, 'engins', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'engins', id), cleanObject({ ...data, id }), { merge: true });
  };

  const setPerfo = async (id: string, data: any) => {
    if (!data) await setDoc(doc(db, 'perfos', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'perfos', id), cleanObject({ ...data, id }), { merge: true });
  };

  const setAgent = async (id: string, data: any) => {
    if (!data) await setDoc(doc(db, 'agents', id), { deleted: true }, { merge: true });
    else await setDoc(doc(db, 'agents', id), cleanObject({ ...data, id }), { merge: true });
  };

  const saveCatalogItem = async (item: CatalogItem) => {
    await setDoc(doc(db, 'catalog', item.id), cleanObject(item), { merge: true });
  };

  const deleteCatalogItem = async (id: string) => {
    await setDoc(doc(db, 'catalog', id), { deleted: true }, { merge: true });
  };

  const addPurchaseRequest = async (pr: PurchaseRequest) => {
    const id = pr.id || generateId();
    await setDoc(doc(db, 'purchaseRequests', id), cleanObject({ ...pr, id }));
  };

  const updatePRStatus = async (id: string, status: any) => {
    await setDoc(doc(db, 'purchaseRequests', id), { status }, { merge: true });
  };

  const value = {
    articles, mouvements, distributions, auditLogs, transferts, inventaires,
    engins, perfos, agents, catalog, accounts, purchaseRequests, anomalyReports,
    currentUser, isLoaded, addMouvement, addTransfert, completeTransfert,
    saveInventaire, saveArticle, deleteArticle, toggleUser, setEngin, setPerfo,
    setAgent, saveCatalogItem, deleteCatalogItem, addPurchaseRequest, updatePRStatus
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
