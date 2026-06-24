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
    // L'application est considérée chargée instantanément s'il y a un utilisateur valide en cache local
    isLoaded: cachedUser !== null,
    currentSite: getCachedSite(),
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
      return { currentUser: nextUser };
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
    setIsLoaded: (arg) => set((state) => ({
      isLoaded: typeof arg === 'function' ? (arg as Function)(state.isLoaded) : arg
    })),
    setCurrentSite: (currentSite) => {
      localStorage.setItem('hydromines_current_site', currentSite);
      set({ currentSite });
    }
  };
});
