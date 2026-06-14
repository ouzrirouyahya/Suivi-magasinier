import { create } from 'zustand';
import { SiteCode, UserAccount } from '../../types';

interface AuthState {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  isLoaded: boolean;
  currentSite: SiteCode;
  isViewer: boolean;
  setCurrentUser: (user: UserAccount | null | ((prev: UserAccount | null) => UserAccount | null)) => void;
  setAccounts: (accounts: UserAccount[] | ((prev: UserAccount[]) => UserAccount[])) => void;
  setIsLoaded: (loaded: boolean | ((prev: boolean) => boolean)) => void;
  setCurrentSite: (site: SiteCode) => void;
  setIsViewer: (viewer: boolean | ((prev: boolean) => boolean)) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  accounts: [],
  isLoaded: false,
  currentSite: 'ALL',
  isViewer: false,
  setCurrentUser: (arg) => set((state) => ({
    currentUser: typeof arg === 'function' ? (arg as Function)(state.currentUser) : arg
  })),
  setAccounts: (arg) => set((state) => ({
    accounts: typeof arg === 'function' ? (arg as Function)(state.accounts) : arg
  })),
  setIsLoaded: (arg) => set((state) => ({
    isLoaded: typeof arg === 'function' ? (arg as Function)(state.isLoaded) : arg
  })),
  setCurrentSite: (currentSite) => {
    localStorage.setItem('hydromines_current_site', currentSite);
    set({ currentSite });
  },
  setIsViewer: (arg) => set((state) => ({
    isViewer: typeof arg === 'function' ? (arg as Function)(state.isViewer) : arg
  }))
}));
