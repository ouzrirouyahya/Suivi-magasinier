import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { UserAccount, SiteCode } from '../types';
import { serializeFirestoreData, cleanObject } from '../lib/utils';
import { setDoc } from 'firebase/firestore';
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
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCurrentUser(null);
        setIsLoaded(true);
        return;
      }

      const uid = user.uid;
      const unsubUser = onSnapshot(doc(db, 'accounts', uid), async (snap) => {
        if (snap.exists()) {
          const userData = serializeFirestoreData({ id: snap.id, ...snap.data() }) as UserAccount;
          if (user.email?.toLowerCase() === 'ouzrirouyahya@gmail.com') {
            userData.role = 'SUPER_ADMIN';
            userData.active = true;
          }
          setCurrentUser(userData);
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
            setCurrentUser(null);
            setIsLoaded(true);
          }
        }
      }, () => setIsLoaded(true));

      return () => unsubUser();
    });

    return () => unsubAuth();
  }, [setCurrentUser, setIsLoaded]);

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
