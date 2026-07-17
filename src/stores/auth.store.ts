import { create } from 'zustand';
import { UserAccount, SiteCode } from '../types';
import { logger } from '../lib/utils';
import { IndexedDBStorage } from '../core/indexedDBStorage';

interface AuthState {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  currentSite: SiteCode;
  isLoaded: boolean;
  isAuthenticated: boolean;
  setCurrentUser: (user: UserAccount | null | ((prev: UserAccount | null) => UserAccount | null)) => void;
  setAccounts: (accounts: UserAccount[] | ((prev: UserAccount[]) => UserAccount[])) => void;
  setCurrentSite: (site: SiteCode) => void;
  setIsLoaded: (loaded: boolean) => void;
  setIsAuthenticated: (auth: boolean) => void;
  updateAccount: (id: string, updates: Partial<UserAccount>) => void;
}

interface CachedUserMinimal {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: string;
  assignedSite: string;
  active: boolean;
  status: string;
  cachedAt: number;
}

const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 heures = durée d'un shift

function minimizeUser(user: UserAccount): CachedUserMinimal {
  return {
    id: user.id || (user as any).uid || '',
    uid: (user as any).uid || user.id || '',
    email: user.email || '',
    name: user.name || '',
    role: user.role || 'MAGASINIER',
    assignedSite: user.assignedSite || '',
    active: user.active ?? (user as any).isActive ?? true,
    status: user.status || 'APPROVED',
    cachedAt: Date.now()
  };
}

const getCachedUser = (): UserAccount | null => {
  try {
    const cached = localStorage.getItem('hydromines_cached_user');
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CachedUserMinimal;
    if (!parsed || typeof parsed.cachedAt !== 'number') {
      return null;
    }
    const age = Date.now() - parsed.cachedAt;
    if (age > CACHE_TTL) {
      logger.warn('[AuthStore] Session expirée (shift de 8h terminé). Forcer reconnexion.');
      localStorage.removeItem('hydromines_cached_user');
      return null;
    }
    return {
      id: parsed.id || parsed.uid,
      uid: parsed.uid || parsed.id,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      active: parsed.active,
      status: parsed.status,
      assignedSite: parsed.assignedSite,
    } as any;
  } catch {
    return null;
  }
};

const getCachedSite = (): SiteCode => {
  try {
    const cached = localStorage.getItem('hydromines_current_site');
    return (cached as SiteCode) || 'ALL';
  } catch {
    return 'ALL';
  }
};

export const useAuthStore = create<AuthState>((set) => {
  const cachedUser = getCachedUser();
  return {
    currentUser: cachedUser,
    accounts: [], // Ne jamais cacher la liste complète en local
    currentSite: getCachedSite(),
    isLoaded: cachedUser !== null,
    isAuthenticated: cachedUser !== null,
    setCurrentUser: (arg) => set((state) => {
      const nextUser = typeof arg === 'function' ? (arg as Function)(state.currentUser) : arg;
      try {
        if (nextUser) {
          localStorage.setItem('hydromines_cached_user', JSON.stringify(minimizeUser(nextUser)));
        } else {
          localStorage.removeItem('hydromines_cached_user');
          // Clear all local cache on logout for high security
          IndexedDBStorage.saveCollection('articles', []);
          IndexedDBStorage.saveCollection('mouvements', []);
          IndexedDBStorage.saveCollection('transferts', []);
          IndexedDBStorage.saveCollection('inventaires', []);
          IndexedDBStorage.saveCollection('distributions', []);
          IndexedDBStorage.saveCollection('purchaseRequests', []);
          IndexedDBStorage.saveCollection('anomalyReports', []);
          IndexedDBStorage.saveCollection('notifications', []);
          IndexedDBStorage.saveCollection('maintenanceLogs', []);
        }
      } catch (err) {
        logger.warn('Failed to cache user account in localStorage:', err);
      }
      return { 
        currentUser: nextUser,
        isAuthenticated: nextUser !== null
      };
    }),
    setAccounts: (arg) => set((state) => {
      const nextAccounts = typeof arg === 'function' ? (arg as Function)(state.accounts) : arg;
      // NIVEAU 2 : Suppression complète du stockage de comptes dans localStorage
      return { accounts: nextAccounts };
    }),
    setCurrentSite: (site) => {
      try {
        localStorage.setItem('hydromines_current_site', site);
        // Prune site-specific cached collections on site switch to prevent cross-site leakage
        IndexedDBStorage.saveCollection('articles', []);
        IndexedDBStorage.saveCollection('mouvements', []);
        IndexedDBStorage.saveCollection('transferts', []);
        IndexedDBStorage.saveCollection('inventaires', []);
        IndexedDBStorage.saveCollection('distributions', []);
        IndexedDBStorage.saveCollection('purchaseRequests', []);
        IndexedDBStorage.saveCollection('anomalyReports', []);
        IndexedDBStorage.saveCollection('maintenanceLogs', []);
      } catch (err) {
        logger.warn(err);
      }
      set({ currentSite: site });
    },
    setIsLoaded: (isLoaded) => set({ isLoaded }),
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    updateAccount: (id, updates) => set((state) => {
      const nextAccounts = state.accounts.map(a => a.id === id ? { ...a, ...updates } : a);
      const nextUser = state.currentUser?.id === id ? { ...state.currentUser, ...updates } : state.currentUser;
      try {
        if (nextUser) {
          localStorage.setItem('hydromines_cached_user', JSON.stringify(minimizeUser(nextUser)));
        }
      } catch (err) {
        logger.warn(err);
      }
      return {
        accounts: nextAccounts,
        currentUser: nextUser
      };
    }),
  };
});
