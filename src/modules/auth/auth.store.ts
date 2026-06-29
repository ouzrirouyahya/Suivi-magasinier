import { create } from 'zustand';
import { SiteCode, UserAccount } from '../../types';

interface AuthState {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  isLoaded: boolean;
  currentSite: SiteCode;
  setCurrentUser: (user: UserAccount | null | ((prev: UserAccount | null) => UserAccount | null)) => void;
  setAccounts: (accounts: UserAccount[] | ((prev: UserAccount[]) => UserAccount[])) => void;
  setIsLoaded: (loaded: boolean | ((prev: boolean) => boolean)) => void;
  setCurrentSite: (site: SiteCode) => void;
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
      console.warn('[AuthStore] Session expirée (shift de 8h terminé). Forcer reconnexion.');
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
    accounts: [], // Ne jamais stocker/cacher la liste complète des comptes en local
    isLoaded: cachedUser !== null,
    currentSite: getCachedSite(),
    setCurrentUser: (arg) => set((state) => {
      const nextUser = typeof arg === 'function' ? (arg as Function)(state.currentUser) : arg;
      try {
        if (nextUser) {
          localStorage.setItem('hydromines_cached_user', JSON.stringify(minimizeUser(nextUser)));
        } else {
          localStorage.removeItem('hydromines_cached_user');
        }
      } catch (err) {
        console.warn('Failed to cache user account in localStorage:', err);
      }
      return { currentUser: nextUser };
    }),
    setAccounts: (arg) => set((state) => {
      const nextAccounts = typeof arg === 'function' ? (arg as Function)(state.accounts) : arg;
      // NIVEAU 2 : Pas de persistance locale de tous les comptes
      return { accounts: nextAccounts };
    }),
    setIsLoaded: (arg) => set((state) => ({
      isLoaded: typeof arg === 'function' ? (arg as Function)(state.isLoaded) : arg
    })),
    setCurrentSite: (currentSite) => {
      localStorage.setItem('hydromines_current_site', currentSite);
      set({ currentSite });
    }
  };
});
