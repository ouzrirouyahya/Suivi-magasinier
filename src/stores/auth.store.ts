import { create } from 'zustand';
import { UserAccount, SiteCode } from '../types';

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

const getCachedUser = (): UserAccount | null => {
  try {
    const cached = localStorage.getItem('hydromines_cached_user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const getCachedAccounts = (): UserAccount[] => {
  try {
    const cached = localStorage.getItem('hydromines_cached_accounts');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
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
    accounts: getCachedAccounts(),
    currentSite: getCachedSite(),
    isLoaded: cachedUser !== null,
    isAuthenticated: cachedUser !== null,
    setCurrentUser: (arg) => set((state) => {
      const nextUser = typeof arg === 'function' ? (arg as Function)(state.currentUser) : arg;
      try {
        if (nextUser) {
          localStorage.setItem('hydromines_cached_user', JSON.stringify(nextUser));
        } else {
          localStorage.removeItem('hydromines_cached_user');
        }
      } catch (err) {
        console.warn('Failed to cache user account in localStorage:', err);
      }
      return { 
        currentUser: nextUser,
        isAuthenticated: nextUser !== null
      };
    }),
    setAccounts: (arg) => set((state) => {
      const nextAccounts = typeof arg === 'function' ? (arg as Function)(state.accounts) : arg;
      try {
        localStorage.setItem('hydromines_cached_accounts', JSON.stringify(nextAccounts));
      } catch (err) {
        console.warn('Failed to cache account list in localStorage:', err);
      }
      return { accounts: nextAccounts };
    }),
    setCurrentSite: (site) => {
      try {
        localStorage.setItem('hydromines_current_site', site);
      } catch (err) {
        console.warn(err);
      }
      set({ currentSite: site });
    },
    setIsLoaded: (isLoaded) => set({ isLoaded }),
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    updateAccount: (id, updates) => set((state) => {
      const nextAccounts = state.accounts.map(a => a.id === id ? { ...a, ...updates } : a);
      const nextUser = state.currentUser?.id === id ? { ...state.currentUser, ...updates } : state.currentUser;
      try {
        localStorage.setItem('hydromines_cached_accounts', JSON.stringify(nextAccounts));
        if (nextUser) {
          localStorage.setItem('hydromines_cached_user', JSON.stringify(nextUser));
        }
      } catch (err) {
        console.warn(err);
      }
      return {
        accounts: nextAccounts,
        currentUser: nextUser
      };
    }),
  };
});
