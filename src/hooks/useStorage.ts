import { useState, useEffect } from 'react';
import { Article, Mouvement, DistributionEPI, AuditLog, UserAccount, Transfert, Inventaire, EnginMaster, PerfoMaster, AgentMaster, CatalogItem } from '../types';
import { INITIAL_ARTICLES, INITIAL_MOUVEMENTS, INITIAL_ENGINS, INITIAL_PERFOS, INITIAL_AGENTS } from '../demoData';
import { MASTER_CATALOG, CATALOG_VERSION } from '../catalogData';
import { generateId, handleFirestoreError, OperationType, cleanObject } from '../lib/utils';
import { 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  doc, 
  runTransaction,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function useStorage() {
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
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authStateReady, setAuthStateReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthStateReady(true);
    });
  }, []);

  // 1. Account Sync & Initial Listeners
  useEffect(() => {
    if (!authStateReady) return;

    if (!auth.currentUser) {
      setCurrentUser(null);
      setIsLoaded(true);
      return;
    }

    const uid = auth.currentUser.uid;
    console.log('useStorage: User authenticated, fetching account:', uid);
    const unsubUser = onSnapshot(doc(db, 'accounts', uid), (snap) => {
      if (snap.exists()) {
        const userData = { id: snap.id, ...snap.data() } as UserAccount;
        console.log('useStorage: Account found:', userData.email, 'Active:', userData.active);
        setCurrentUser(userData);
        setIsLoaded(true);
      } else {
        console.log('useStorage: Account not found, auto-provisioning...');
        // Auto-provision
        const newUser: UserAccount = {
          id: uid,
          email: auth.currentUser?.email || '',
          name: auth.currentUser?.displayName || 'Utilisateur',
          role: auth.currentUser?.email === 'ouzrirouyahya@gmail.com' ? 'ADMIN' : 'MAGASINIER',
          active: true,
          createdAt: new Date().toISOString()
        };
        
        // Optimistic update to avoid being stuck
        setCurrentUser(newUser);

        setDoc(doc(db, 'accounts', uid), cleanObject(newUser))
          .then(() => {
            console.log('useStorage: Auto-provisioning success');
            setIsLoaded(true);
          })
          .catch(err => {
            console.error('useStorage: Auto-provisioning error', err);
            handleFirestoreError(err, OperationType.WRITE, `accounts/${uid}`);
            setIsLoaded(true); 
          });
      }
    }, (err) => {
      console.error('useStorage: onSnapshot error', err);
      // Even on error, we must set isLoaded to true to allow the app to show login or error state
      setIsLoaded(true); 
    });

    const loadTimeout = setTimeout(() => {
      setIsLoaded(true);
      console.warn('useStorage: Load timeout reached.');
    }, 6000);

    return () => {
      unsubUser();
      clearTimeout(loadTimeout);
    };
  }, [authStateReady]);

  // 2. Data Sync (Depends on active user)
  useEffect(() => {
    if (!isLoaded || !currentUser || !currentUser.active) return;

    const unsubs: (() => void)[] = [];

    const setupDataListeners = async () => {
      // --- MIGRATION CHECK ---
      const migrationDone = localStorage.getItem('hydromines_migrated_to_firebase_v2');
      if (!migrationDone && currentUser?.role === 'ADMIN') {
        const collectionsToMigrate = ['articles', 'mouvements', 'transferts', 'inventaires', 'auditLogs'];
        try {
          for (const col of collectionsToMigrate) {
            const oldData = localStorage.getItem(`hydromines_${col}`);
            if (oldData) {
              const parsed = JSON.parse(oldData);
              for (const item of parsed) {
                if (item.id) {
                  await setDoc(doc(db, col, item.id), cleanObject(item), { merge: true });
                }
              }
            }
          }
          localStorage.setItem('hydromines_migrated_to_firebase_v2', 'true');
          console.log('Migration complète terminée');
        } catch (e) { console.error('Erreur migration:', e); }
      }
      // -----------------------

      const safeOnSnapshot = (ref: any, setter: (data: any) => void, path: string, type: OperationType = OperationType.LIST) => {
        return onSnapshot(ref, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          setter(data);
        }, (err) => {
          if (err.code !== 'permission-denied' || auth.currentUser) {
            handleFirestoreError(err, type, path);
          }
        });
      };

      unsubs.push(safeOnSnapshot(collection(db, 'articles'), setArticles, 'articles'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(500)), setMouvements, 'mouvements'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100)), setAuditLogs, 'auditLogs'));
      unsubs.push(safeOnSnapshot(collection(db, 'transferts'), setTransferts, 'transferts'));
      unsubs.push(safeOnSnapshot(collection(db, 'inventaires'), setInventaires, 'inventaires'));
      unsubs.push(safeOnSnapshot(collection(db, 'catalog'), setCatalog, 'catalog'));
      unsubs.push(safeOnSnapshot(collection(db, 'engins'), setEngins, 'engins'));
      unsubs.push(safeOnSnapshot(collection(db, 'perfos'), setPerfos, 'perfos'));
      unsubs.push(safeOnSnapshot(collection(db, 'agents'), setAgents, 'agents'));

      if (currentUser.role === 'ADMIN') {
        unsubs.push(safeOnSnapshot(collection(db, 'accounts'), setAccounts, 'accounts'));
      }

      // Seeding (Only if empty or version changed)
      const seedIfEmpty = async (colName: string, initialData: any[]) => {
        try {
          const snap = await getDocs(query(collection(db, colName), limit(1)));
          
          let shouldSeed = snap.empty;
          
          // Special case for catalog versioning
          if (colName === 'catalog') {
            const metaRef = doc(db, 'metadata', 'catalog_version');
            const metaSnap = await getDoc(metaRef);
            const currentVer = metaSnap.exists() ? metaSnap.data().version : null;
            
            if (currentVer !== CATALOG_VERSION) {
              console.log(`useStorage: Catalog version mismatch (${currentVer} vs ${CATALOG_VERSION}). Forcing refresh...`);
              shouldSeed = true;
              // Reset meta version immediately to avoid multiple triggers
              await setDoc(metaRef, { version: CATALOG_VERSION });
            }
          }

          if (shouldSeed) {
            console.log(`useStorage: Seeding ${colName} with ${initialData.length} items...`);
            for (const item of initialData) {
              await setDoc(doc(db, colName, item.id), cleanObject(item));
            }
            console.log(`useStorage: Seeding ${colName} complete.`);
          }
        } catch (e) {
          console.error(`useStorage: Seeding ${colName} failed:`, e);
        }
      };

      if (currentUser.role === 'ADMIN') {
        seedIfEmpty('articles', INITIAL_ARTICLES);
        seedIfEmpty('catalog', MASTER_CATALOG);
        seedIfEmpty('engins', INITIAL_ENGINS);
        seedIfEmpty('perfos', INITIAL_PERFOS);
        seedIfEmpty('agents', INITIAL_AGENTS);
      }
    };

    setupDataListeners();
    return () => unsubs.forEach(u => u());
  }, [isLoaded, currentUser]);

  const logAction = async (action: string, details: string, site: any, amount: number = 0) => {
    try {
      const id = generateId();
      const log: AuditLog = {
        id,
        timestamp: new Date().toISOString(),
        userEmail: auth.currentUser?.email || 'Système',
        site,
        action,
        details,
        amount
      };
      await setDoc(doc(db, 'auditLogs', id), cleanObject(log));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'auditLogs');
    }
  };

  const addMouvement = async (mouvement: Mouvement) => {
    try {
      await runTransaction(db, async (transaction) => {
        const movementId = mouvement.id || generateId();
        const mRef = doc(db, 'mouvements', movementId);
        
        let totalValue = 0;

        for (const item of mouvement.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          
          if (!articleSnap.exists()) throw new Error(`Article ${item.articleId} non trouvé`);
          
          const article = articleSnap.data() as Article;
          const val = item.quantity * (item.price || article.price);
          totalValue += val;

          let newQuantity = article.quantity;
          if (mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN') {
            newQuantity += item.quantity;
          } else {
            newQuantity -= item.quantity;
            if (newQuantity < 0) throw new Error(`Stock insuffisant pour ${article.designation}`);
          }

          transaction.update(articleRef, { quantity: newQuantity });
        }

        transaction.set(mRef, cleanObject({ ...mouvement, id: movementId }));
        logAction(mouvement.type, `${mouvement.items.length} items | Réf: ${mouvement.reference}`, mouvement.site, totalValue);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'mouvements/transaction');
    }
  };

  const addTransfert = async (transfert: Transfert) => {
    try {
      const id = transfert.id || generateId();
      await setDoc(doc(db, 'transferts', id), cleanObject({ ...transfert, id }));
      
      await runTransaction(db, async (transaction) => {
        for (const item of transfert.items) {
          const artRef = doc(db, 'articles', item.articleId);
          const artSnap = await transaction.get(artRef);
          if (artSnap.exists()) {
            const art = artSnap.data() as Article;
            transaction.update(artRef, { quantity: Math.max(0, art.quantity - item.quantity) });
          }
        }
      });
      logAction('TRANSFERT_OUT', `Transfert ${transfert.reference} vers ${transfert.targetSite}`, transfert.sourceSite);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'transferts');
    }
  };

  const completeTransfert = async (transfertId: string, recepteur: string) => {
    try {
      const tRef = doc(db, 'transferts', transfertId);
      const transfert = transferts.find(t => t.id === transfertId);

      if (transfert) {
        await runTransaction(db, async (transaction) => {
          for (const item of transfert.items) {
            const artRef = doc(db, 'articles', item.articleId);
            const artSnap = await transaction.get(artRef);
            if (artSnap.exists()) {
              const art = artSnap.data() as Article;
              transaction.update(artRef, { quantity: art.quantity + item.quantity });
            }
          }
          transaction.update(tRef, { 
            status: 'RECU', 
            dateReception: new Date().toISOString(), 
            recepteur 
          });
        });
        logAction('TRANSFERT_IN', `Transfert ${transfert.reference} réceptionné`, transfert.targetSite);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `transferts/${transfertId}`);
    }
  };

  const saveInventaire = async (inventaire: Inventaire) => {
    try {
      const id = inventaire.id || generateId();
      await setDoc(doc(db, 'inventaires', id), cleanObject({ ...inventaire, id }));
      if (inventaire.status === 'VALIDE') {
        await runTransaction(db, async (transaction) => {
          for (const item of inventaire.items) {
            const artRef = doc(db, 'articles', item.articleId);
            transaction.update(artRef, { 
              quantity: item.countedQuantity, 
              lastInventoryDate: inventaire.date 
            });
          }
        });
        logAction('INVENTAIRE', `Inventaire validé pour ${inventaire.site}`, inventaire.site);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'inventaires');
    }
  };

  const saveArticle = async (article: Article) => {
    try {
      const id = article.id || generateId();
      await setDoc(doc(db, 'articles', id), cleanObject({ ...article, id }));
      logAction('SAVE_ARTICLE', `Article ${article.ref} sauvegardé`, article.site);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `articles/${article.id}`);
    }
  };

  const deleteArticle = async (id: string) => {
    try {
      const art = articles.find(a => a.id === id);
      if (art && confirm('Confirmer la suppression ?')) {
        // Soft delete logic could go here
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `articles/${id}`);
    }
  };

  const toggleUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'accounts', userId);
      const user = accounts.find(u => u.id === userId);
      if (user) {
        await setDoc(userRef, cleanObject({ ...user, active: !user.active }));
        logAction('USER_MGMT', `Statut utilisateur ${user.email} changé`, 'SMI');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `accounts/${userId}`);
    }
  };

  const setEnginsInternal = (e: EnginMaster[]) => e.forEach(item => setDoc(doc(db, 'engins', item.id), cleanObject(item)));
  const setPerfosInternal = (p: PerfoMaster[]) => p.forEach(item => setDoc(doc(db, 'perfos', item.id), cleanObject(item)));
  const setAgentsInternal = (a: AgentMaster[]) => a.forEach(item => setDoc(doc(db, 'agents', item.id), cleanObject(item)));
  const setCatalogInternal = (c: CatalogItem[]) => c.forEach(item => setDoc(doc(db, 'catalog', item.id), cleanObject(item)));

  const saveCatalogItem = async (item: CatalogItem) => {
    try {
      await setDoc(doc(db, 'catalog', item.id), cleanObject(item));
      logAction('CATALOG_UPDATE', `Item ${item.reference} sauvegardé au master`, 'SMI');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `catalog/${item.id}`);
    }
  };

  const deleteCatalogItem = async (id: string) => {
    try {
      // In a real app we might want a hard delete ref in firestore
      // For now we trust the list sync from onSnapshot
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `catalog/${id}`);
    }
  };

  return { 
    articles, mouvements, distributions, auditLogs, accounts, currentUser,
    addMouvement, addTransfert, completeTransfert, saveInventaire, saveArticle, deleteArticle, toggleUser,
    isLoaded, transferts, inventaires, engins, perfos, agents, catalog, saveCatalogItem,
    setEngins: setEnginsInternal, setPerfos: setPerfosInternal, setAgents: setAgentsInternal, setCatalog: setCatalogInternal
  };
}


