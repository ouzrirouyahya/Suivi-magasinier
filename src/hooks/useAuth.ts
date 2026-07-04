import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, setDoc, db } from '../lib/db';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { UserAccount, SiteCode } from '../types';
import { serializeFirestoreData, cleanObject } from '../lib/utils';
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

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (!user) {
        setCurrentUser(null);
        setIsLoaded(true);
        return;
      }

      const uid = user.uid;
      unsubUser = onSnapshot(doc(db, 'accounts', uid), async (snap) => {
        if (snap.exists()) {
          const userData = serializeFirestoreData({ id: snap.id, ...snap.data() }) as UserAccount;
          if (user.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
            userData.role = 'SUPER_ADMIN';
            userData.active = true;
            userData.status = 'APPROVED';
            
            // S'assurer que les données en base sont synchronisées si elles diffèrent
            const dbData = snap.data();
            if (dbData && (dbData.role !== 'SUPER_ADMIN' || dbData.active !== true || dbData.status !== 'APPROVED')) {
              setDoc(doc(db, 'accounts', uid), {
                role: 'SUPER_ADMIN',
                active: true,
                status: 'APPROVED'
              }, { merge: true }).catch(err => {
                console.error("Erreur lors de la mise à jour asynchrone du statut Super Admin :", err);
              });
            }
          }
          setCurrentUser(userData);
          if ((userData.role === 'MAGASINIER' || userData.role === 'RESPONSABLE_CHANTIER') && userData.assignedSite) {
            setCurrentSite(userData.assignedSite);
          }
          setIsLoaded(true);
        } else {
          if (user.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
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
            await setDoc(doc(db, 'accounts', uid), cleanObject(newUser));
            setIsLoaded(true);
          } else {
            // Utilisateur Google authentifié mais pas encore de compte Hydromines
            // Créer un UserAccount temporaire "EN_ATTENTE_INSCRIPTION"
            // pour que App.tsx ne redirige PAS vers /login
            const pendingFirebaseUser: UserAccount = {
              id: uid,
              email: user.email || '',
              name: user.displayName || '',
              role: 'MAGASINIER',         // rôle temporaire neutre
              active: false,
              status: 'PENDING_REGISTRATION', // nouveau statut temporaire
              createdAt: new Date().toISOString()
            };
            setCurrentUser(pendingFirebaseUser);
            setIsLoaded(true);
          }
        }
      }, () => setIsLoaded(true));
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
      const list = snap.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }) as UserAccount);
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
