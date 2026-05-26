import { useState, useEffect } from 'react';
import { Article, Mouvement, DistributionEPI, AuditLog, UserAccount, Transfert, Inventaire, EnginMaster, PerfoMaster, AgentMaster, CatalogItem, PurchaseRequest, AnomalyReport } from '../types';
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

  // 1. Account Sync & Initial Listeners
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
        try {
          const accountsRef = collection(db, 'accounts');
          const accountsSnap = await getDocs(query(accountsRef, limit(1)));
          const isFirstUser = accountsSnap.empty;
          
          if (isFirstUser || auth.currentUser?.email === 'ouzrirouyahya@gmail.com' || auth.currentUser?.email === 'hydro.magasinier@gmail.com') {
            role = 'ADMIN';
          }
        } catch (e) {
          // Fallback
        }

        const newUser: UserAccount = {
          id: uid,
          email: auth.currentUser?.email || '',
          name: auth.currentUser?.displayName || 'Utilisateur',
          role: role,
          active: true,
          createdAt: new Date().toISOString()
        };
        
        // Optimistic update to avoid being stuck
        setCurrentUser(newUser);

        setDoc(doc(db, 'accounts', uid), cleanObject(newUser))
          .then(() => {
            setIsLoaded(true);
          })
          .catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `accounts/${uid}`);
            setIsLoaded(true); 
          });
      }
    }, (err) => {
      // Even on error, we must set isLoaded to true to allow the app to show login or error state
      setIsLoaded(true); 
    });

    const loadTimeout = setTimeout(() => {
      setIsLoaded(true);
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
      const safeOnSnapshot = (ref: any, setter: (data: any) => void, path: string, type: OperationType = OperationType.LIST) => {
        return onSnapshot(ref, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => {
            const d = doc.data();
            return { id: doc.id, ...d };
          }).filter((d: any) => !d.deleted); // Filter out soft-deleted items
          setter(data);
        }, (err) => {
          if (err.code !== 'permission-denied' || auth.currentUser) {
            handleFirestoreError(err, type, path);
          }
        });
      };

      // 1. Migration from LocalStorage
      const migrateFromLocal = async () => {
        const collectionsToMigrate = ['articles', 'mouvements', 'transferts', 'inventaires', 'engins', 'perfos', 'agents', 'catalog', 'distributions'];
        
        // Only admins can migrate accounts
        if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
          collectionsToMigrate.push('accounts');
        }

        let migratedCount = 0;
        
        for (const col of collectionsToMigrate) {
          const localKey = `hydromines_${col}`;
          const localData = localStorage.getItem(localKey);
          if (localData) {
            try {
              const items = JSON.parse(localData);
              if (Array.isArray(items) && items.length > 0) {
                const batch = writeBatch(db);
                let count = 0;
                for (const item of items) {
                  if (item.id) {
                    const ref = doc(db, col, item.id);
                    batch.set(ref, cleanObject(item), { merge: true });
                    count++;
                    if (count >= 400) {
                      await batch.commit();
                      count = 0;
                    }
                  }
                }
                if (count > 0) await batch.commit();
                migratedCount += items.length;
              }
              localStorage.removeItem(localKey);
            } catch (e) {
              // If migration fails for a collection, we keep it in local storage to try later
            }
          }
        }
      };

      // 2. Seeding (Only if empty or version changed)
      const seedIfEmpty = async (colName: string, initialData: any[]) => {
        try {
          const snap = await getDocs(query(collection(db, colName), limit(1)));
          let shouldSeed = snap.empty;
          
          if (colName === 'catalog') {
            const metaRef = doc(db, 'metadata', 'catalog_version');
            const metaSnap = await getDoc(metaRef);
            const currentVer = metaSnap.exists() ? metaSnap.data().version : null;
            
            if (currentVer !== CATALOG_VERSION) {
              shouldSeed = true;
            }
          }

          if (shouldSeed) {
            const batch = writeBatch(db);
            let count = 0;
            for (const item of initialData) {
              const ref = doc(db, colName, item.id || generateId());
              batch.set(ref, cleanObject(item));
              count++;
              if (count >= 400) {
                await batch.commit();
                count = 0;
              }
            }
            if (count > 0) await batch.commit();
            
            if (colName === 'catalog') {
              await setDoc(doc(db, 'metadata', 'catalog_version'), { version: CATALOG_VERSION });
            }
          }
        } catch (e) {
          // Silent fallback
        }
      };

      // Migration and Seeding logic
      const runMigrationsAndSeeding = async () => {
        // Migration from LocalStorage (for everyone who has local data)
        await migrateFromLocal();

        // Seeding (Articles, Catalog, Engins, etc.) 
        // We seed if empty so that every site has initial data if it's a fresh install
        await seedIfEmpty('articles', INITIAL_ARTICLES);
        await seedIfEmpty('catalog', MASTER_CATALOG);
        await seedIfEmpty('engins', INITIAL_ENGINS);
        await seedIfEmpty('perfos', INITIAL_PERFOS);
        await seedIfEmpty('agents', INITIAL_AGENTS);
      };

      runMigrationsAndSeeding();

      unsubs.push(safeOnSnapshot(collection(db, 'articles'), setArticles, 'articles'));
      unsubs.push(safeOnSnapshot(query(collection(db, 'mouvements'), orderBy('date', 'desc'), limit(500)), setMouvements, 'mouvements'));
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

      if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
        unsubs.push(safeOnSnapshot(collection(db, 'accounts'), setAccounts, 'accounts'));
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
    const promise = (async () => {
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

        // Auto-create DistributionEPI for EPI tracking if category is EPI and type is SORTIE
        if (mouvement.type === 'SORTIE' && mouvement.category === 'EPI') {
          for (const item of mouvement.items) {
            const distId = generateId();
            const dist: DistributionEPI = {
              id: distId,
              site: mouvement.site,
              agentName: mouvement.beneficiaire || mouvement.demandeur || 'ANONYME',
              service: mouvement.service || 'AUTRE',
              articleId: item.articleId,
              date: mouvement.date,
              quantity: item.quantity
            };
            transaction.set(doc(db, 'distributions', distId), cleanObject(dist));
          }
        }

        await logAction(mouvement.type, `${mouvement.items.length} items | Réf: ${mouvement.reference}`, mouvement.site, totalValue);
      });
    })();

    toast.promise(promise, {
      loading: 'Synchronisation du mouvement...',
      success: 'Opération enregistrée avec succès !',
      error: (err) => `Erreur : ${err.message || 'Échec de synchronisation'}`
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'mouvements/transaction');
    }
  };

  const addTransfert = async (transfert: Transfert) => {
    const promise = (async () => {
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
      await logAction('TRANSFERT_OUT', `Transfert ${transfert.reference} vers ${transfert.targetSite}`, transfert.sourceSite);
    })();

    toast.promise(promise, {
      loading: 'Enregistrement du transfert...',
      success: 'Transfert enregistré et stock déduit.',
      error: 'Erreur lors du transfert'
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'transferts');
    }
  };

  const completeTransfert = async (transfertId: string, recepteur: string) => {
    const promise = (async () => {
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
        await logAction('TRANSFERT_IN', `Transfert ${transfert.reference} réceptionné`, transfert.targetSite);
      }
    })();

    toast.promise(promise, {
      loading: 'Finalisation du transfert...',
      success: 'Transfert réceptionné avec succès !',
      error: 'Erreur lors de la réception'
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `transferts/${transfertId}`);
    }
  };

  const saveInventaire = async (inventaire: Inventaire) => {
    const promise = (async () => {
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
        await logAction('INVENTAIRE', `Inventaire validé pour ${inventaire.site}`, inventaire.site);
      }
    })();

    toast.promise(promise, {
      loading: 'Enregistrement de l\'inventaire...',
      success: 'Inventaire synchronisé et stock mis à jour !',
      error: 'Erreur d\'inventaire'
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'inventaires');
    }
  };

  const saveArticle = async (article: Article) => {
    const promise = (async () => {
      const id = article.id || generateId();
      await setDoc(doc(db, 'articles', id), cleanObject({ ...article, id }));
      await logAction('SAVE_ARTICLE', `Article ${article.ref} sauvegardé`, article.site);
    })();

    toast.promise(promise, {
      loading: 'Sauvegarde de l\'article...',
      success: 'Article synchronisé !',
      error: 'Erreur de sauvegarde'
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `articles/${article.id}`);
    }
  };

  const deleteArticle = async (id: string) => {
    try {
      const art = articles.find(a => a.id === id);
      if (art && confirm(`Confirmer la suppression de ${art.designation} (${art.ref}) ?`)) {
        const artRef = doc(db, 'articles', id);
        // Direct deletion from Firestore
        await setDoc(artRef, { ...art, deleted: true, deletedAt: new Date().toISOString() });
        // Alternatively, hard delete if preferred, but soft delete is safer.
        // await deleteDoc(artRef); 
        await logAction('DELETE_ARTICLE', `Article ${art.ref} supprimé (soft delete)`, art.site);
        toast.success('Article supprimé avec succès');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `articles/${id}`);
    }
  };

  const toggleUser = async (userId: string) => {
    const promise = (async () => {
      const userRef = doc(db, 'accounts', userId);
      const user = accounts.find(u => u.id === userId);
      if (user) {
        await setDoc(userRef, cleanObject({ ...user, active: !user.active }));
        await logAction('USER_MGMT', `Statut utilisateur ${user.email} changé`, 'SMI');
      }
    })();

    toast.promise(promise, {
      loading: 'Mise à jour utilisateur...',
      success: 'Statut utilisateur synchronisé !',
      error: 'Erreur de mise à jour'
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `accounts/${userId}`);
    }
  };

  const setEngin = async (id: string, engin: Partial<EnginMaster> | null) => {
    try {
      const ref = doc(db, 'engins', id);
      if (engin === null) {
        await setDoc(ref, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      } else {
        await setDoc(ref, cleanObject({ ...engin, id }), { merge: true });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, `engins/${id}`); }
  };

  const setPerfo = async (id: string, perfo: Partial<PerfoMaster> | null) => {
    try {
      const ref = doc(db, 'perfos', id);
      if (perfo === null) {
        await setDoc(ref, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      } else {
        await setDoc(ref, cleanObject({ ...perfo, id }), { merge: true });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, `perfos/${id}`); }
  };

  const setAgent = async (id: string, agent: Partial<AgentMaster> | null) => {
    try {
      const ref = doc(db, 'agents', id);
      if (agent === null) {
        await setDoc(ref, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      } else {
        await setDoc(ref, cleanObject({ ...agent, id }), { merge: true });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, `agents/${id}`); }
  };

  const saveCatalogItem = async (item: CatalogItem) => {
    const promise = (async () => {
      await setDoc(doc(db, 'catalog', item.id), cleanObject(item), { merge: true });
      await logAction('CATALOG_UPDATE', `Item ${item.reference} sauvegardé au master`, 'SMI');
    })();

    toast.promise(promise, {
      loading: 'Mise à jour du catalogue...',
      success: 'Catalogue Master synchronisé !',
      error: 'Erreur catalogue'
    });

    try {
      await promise;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `catalog/${item.id}`);
    }
  };

  const deleteCatalogItem = async (id: string) => {
    try {
      const item = catalog.find(i => i.id === id);
      if (item && confirm(`Supprimer ${item.designation} du catalogue maître ?`)) {
        await setDoc(doc(db, 'catalog', id), { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
        await logAction('CATALOG_DELETE', `Item ${item.reference} supprimé du master`, 'SMI');
        toast.success('Référence retirée du catalogue');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `catalog/${id}`);
    }
  };

  const addPurchaseRequest = async (pr: PurchaseRequest) => {
    try {
      const id = pr.id || generateId();
      await setDoc(doc(db, 'purchaseRequests', id), cleanObject({ ...pr, id }));
      await logAction('RESTOCK_PR', `Demande d'achat ${id} créée`, pr.site);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'purchaseRequests');
    }
  };

  const updatePRStatus = async (id: string, status: PurchaseRequest['status']) => {
    try {
      await setDoc(doc(db, 'purchaseRequests', id), { status }, { merge: true });
      await logAction('PR_STATUS_UPDATE', `DA ${id} changée en ${status}`, 'SMI');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `purchaseRequests/${id}`);
    }
  };

  return { 
    articles, mouvements, distributions, auditLogs, accounts, currentUser,
    addMouvement, addTransfert, completeTransfert, saveInventaire, saveArticle, deleteArticle, toggleUser,
    isLoaded, transferts, inventaires, engins, perfos, agents, catalog, saveCatalogItem, deleteCatalogItem,
    setEngin, setPerfo, setAgent, purchaseRequests, anomalyReports, addPurchaseRequest, updatePRStatus
  };
}


