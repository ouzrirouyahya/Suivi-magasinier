import { useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult } from '../lib/firebase';
import { doc, onSnapshot, collection, setDoc, db } from '../lib/db';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { UserAccount, SiteCode } from '../types';
import { serializeFirestoreData, cleanObject, logger } from '../lib/utils';
import { migrateDocument } from '../lib/migrations';
import { toast } from 'sonner';

export function useAuth() {
  const {
    currentUser,
    accounts,
    isLoaded,
    currentSite,
    setCurrentUser,
    setAccounts,
    setIsLoaded,
    setCurrentSite,
  } = useAuthStore();

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    // Vérifier si l'URL contient un paramètre de retour Firebase Auth
    const isRedirectCallback = window.location.hash.includes('__firebase') || 
      sessionStorage.getItem('pendingRedirectAuth') === 'true';

    if (isRedirectCallback) {
      sessionStorage.removeItem('pendingRedirectAuth');
      getRedirectResult(auth)
        .then(result => { if (result) logger.log('[useAuth] Redirect auth OK', result.user?.email); })
        .catch(error => { 
          const errorMsg = error.message || '';
          const isRefererBlocked = errorMsg.includes('requests-from-referer-') || error.code?.includes('referer') || errorMsg.includes('blocked');
          if (isRefererBlocked) {
            const hostname = window.location.hostname;
            toast.error(`Accès bloqué par les restrictions de clé API Google Cloud. Veuillez ajouter le domaine "${hostname}" aux "Restrictions de sites Web" dans votre console Google Cloud.`, { duration: 15000 });
          } else {
            toast.error(`Erreur connexion : ${error.message}`); 
          }
        });
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      logger.log("🔄 [useAuth] onAuthStateChanged déclenché. Utilisateur connecté :", user ? { email: user.email, uid: user.uid, displayName: user.displayName } : "aucun");
      if (unsubUser) {
        logger.log("🔄 [useAuth] Nettoyage de l'écouteur précédent");
        unsubUser();
        unsubUser = null;
      }

      if (!user) {
        logger.log("🔄 [useAuth] Aucun utilisateur, redirection / mise à jour à null");
        setCurrentUser(null);
        setIsLoaded(true);
        return;
      }

      const uid = user.uid;
      logger.log("🔄 [useAuth] Configuration de l'écouteur Firestore onSnapshot pour l'utilisateur UID :", uid);
      unsubUser = onSnapshot(doc(db, 'accounts', uid), async (snap) => {
        logger.log("🔄 [useAuth] onSnapshot reçu pour l'utilisateur UID :", uid, "Existe ?", snap.exists(), "Données brutes :", snap.data());
        if (snap.exists()) {
          const userData = migrateDocument('accounts', serializeFirestoreData({ id: snap.id, ...snap.data() })) as UserAccount;
          logger.log("🔄 [useAuth] Utilisateur trouvé dans Firestore :", userData);
          if (user.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
            logger.log("🔄 [useAuth] Utilisateur détecté comme SUPER_ADMIN par email.");
            userData.role = 'SUPER_ADMIN';
            userData.active = true;
            userData.status = 'APPROVED';
            
            // S'assurer que les données en base sont synchronisées si elles diffèrent
            const dbData = snap.data();
            if (dbData && (dbData.role !== 'SUPER_ADMIN' || dbData.active !== true || dbData.status !== 'APPROVED')) {
              logger.log("🔄 [useAuth] Synchronisation des données SUPER_ADMIN en base de données...");
              setDoc(doc(db, 'accounts', uid), {
                role: 'SUPER_ADMIN',
                active: true,
                status: 'APPROVED'
              }, { merge: true }).then(() => {
                logger.log("✅ [useAuth] Synchronisation SUPER_ADMIN réussie.");
              }).catch(err => {
                console.error("❌ [useAuth] Erreur lors de la mise à jour asynchrone du statut Super Admin :", err);
              });
            }
          }
          logger.log("🔄 [useAuth] setCurrentUser avec l'utilisateur :", userData);
          setCurrentUser(userData);
          if ((userData.role === 'MAGASINIER' || userData.role === 'RESPONSABLE_CHANTIER') && userData.assignedSite) {
            logger.log("🔄 [useAuth] Définition du chantier courant :", userData.assignedSite);
            setCurrentSite(userData.assignedSite);
          }
          logger.log("🔄 [useAuth] Définition de isLoaded à true");
          setIsLoaded(true);
        } else {
          logger.log("🔄 [useAuth] Document inexistant pour l'utilisateur UID :", uid);
          if (user.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
            logger.log("🔄 [useAuth] Création automatique du document SUPER_ADMIN...");
            const newUser: UserAccount = {
              id: uid,
              email: user.email || '',
              name: user.displayName || 'Super Admin',
              role: 'SUPER_ADMIN',
              active: true,
              status: 'APPROVED',
              createdAt: new Date().toISOString()
            };
            setCurrentUser(newUser);
            try {
              await setDoc(doc(db, 'accounts', uid), cleanObject(newUser));
              logger.log("✅ [useAuth] Document SUPER_ADMIN créé avec succès.");
            } catch (err) {
              console.error("❌ [useAuth] Erreur de création du document SUPER_ADMIN :", err);
            }
            setIsLoaded(true);
          } else {
            logger.log("🔄 [useAuth] Nouvel utilisateur standard (en attente d'inscription)");
            // Utilisateur Google authentifié mais pas encore de compte Hydromines
            // Créer un UserAccount temporaire "EN_ATTENTE_INSCRIPTION"
            // pour que App.tsx ne redirige PAS vers /login
            // Garder l'écouteur actif pour recevoir la mise à jour dès la création du document
            const pendingFirebaseUser: UserAccount = {
              id: uid,
              email: user.email || '',
              name: user.displayName || '',
              role: 'MAGASINIER',         // rôle temporaire neutre
              active: false,
              status: 'PENDING_REGISTRATION', // nouveau statut temporaire
              createdAt: new Date().toISOString()
            };
            logger.log("🔄 [useAuth] setCurrentUser à PENDING_REGISTRATION");
            setCurrentUser(pendingFirebaseUser);
            setIsLoaded(true);
          }
        }
      }, (error) => {
        console.error("❌ [Auth] Erreur Firestore onSnapshot:", error);
        setIsLoaded(true);
      });
    });

    return () => {
      unsubAuth();
      if (unsubUser) {
        unsubUser();
      }
    };
  }, [setCurrentUser, setIsLoaded, setCurrentSite]);

  // Subscribe to all accounts for Admin+
  useEffect(() => {
    if (!currentUser) return;
    const isUserAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    if (!isUserAdmin) return;

    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snap) => {
      const list = snap.docs.map(doc => migrateDocument('accounts', serializeFirestoreData({ id: doc.id, ...doc.data() })) as UserAccount);
      setAccounts(list);
    });

    return () => unsubAccounts();
  }, [currentUser, setAccounts]);

  // Expiration automatique du remplacement de magasinier
  useEffect(() => {
    const checkReplacementExpiration = async () => {
      if (currentUser?.isReplacingMagasinier && currentUser.replacementEndDate) {
        if (new Date(currentUser.replacementEndDate) <= new Date()) {
          try {
            await setDoc(doc(db, 'accounts', currentUser.id), {
              isReplacingMagasinier: false,
              replacementRequestStatus: 'EXPIRED',
              canWrite: false,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            toast.info("⏰ Votre période de remplacement a expiré. Retour en mode lecture seule.");
          } catch (err) {
            console.error("Error checking replacement expiration:", err);
          }
        }
      }
    };

    checkReplacementExpiration();
    const interval = setInterval(checkReplacementExpiration, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return {
    currentUser,
    accounts,
    isLoaded,
    currentSite,
    setCurrentSite,
    isReadOnlyUser: (() => {
      if (!currentUser) return true;
      const role = currentUser.role;
      // SUPER_ADMIN : jamais read-only
      if (role === 'SUPER_ADMIN') return false;
      // RESPONSABLE_CHANTIER : read-only sauf si remplacement actif avec canWrite
      if (role === 'RESPONSABLE_CHANTIER') {
        return !(currentUser.isReplacingMagasinier === true && currentUser.canWrite === true);
      }
      // ADMIN et MAGASINIER : read-only si canWrite = false
      return currentUser.canWrite !== true;
    })(),
    approveUser: authService.approveUser,
    rejectUser: authService.rejectUser,
    toggleUser: async (id: string) => {
      const u = accounts.find(a => a.id === id);
      if (u) await authService.toggleUser(id, u.active);
    },
    setUserRole: authService.setUserRole,
    setUserAssignedSite: authService.setUserAssignedSite,
  };
}
export default useAuth;
