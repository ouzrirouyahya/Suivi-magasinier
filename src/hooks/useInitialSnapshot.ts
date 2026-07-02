import { useState, useEffect } from 'react';
import { snapshotManager } from '../lib/snapshotManager';
import { useAuthStore } from '../stores/auth.store';

const CRITICAL_COLLECTIONS = [
  'articles', 'mouvements', 'transferts', 'catalog'
];

export function useInitialSnapshot() {
  const { currentUser, isAuthenticated } = useAuthStore();
  const alreadyReady = snapshotManager.isFullSnapshotAvailable();

  const [status, setStatus] = useState({
    isReady: alreadyReady,
    isLoadingInitial: !alreadyReady && isAuthenticated,
    progress: alreadyReady ? 100 : 0,
    loadedCollections: [] as string[],
    totalCollections: CRITICAL_COLLECTIONS.length,
    error: null as string | null,
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (snapshotManager.isFullSnapshotAvailable()) {
      setStatus(s => ({ ...s, isReady: true, isLoadingInitial: false, progress: 100 }));
      return;
    }

    setStatus(s => ({ ...s, isLoadingInitial: true, isReady: false }));

    const handleCollectionSaved = (e: CustomEvent) => {
      const colName = e.detail.collection as string;
      setStatus(prev => {
        const newLoaded = [...new Set([...prev.loadedCollections, colName])];
        const criticalLoaded = newLoaded.filter(c => CRITICAL_COLLECTIONS.includes(c));
        const progress = Math.round((criticalLoaded.length / CRITICAL_COLLECTIONS.length) * 100);
        const isReady = criticalLoaded.length >= CRITICAL_COLLECTIONS.length;
        return {
          ...prev,
          loadedCollections: newLoaded,
          progress,
          isReady,
          isLoadingInitial: !isReady,
        };
      });
    };

    window.addEventListener(
      'hydromines:collection-saved', 
      handleCollectionSaved as EventListener
    );

    // Timeout de sécurité 30s — laisser passer même si incomplet
    const timeout = setTimeout(() => {
      setStatus(s => ({
        ...s,
        isReady: true,
        isLoadingInitial: false,
        error: 'Chargement partiel — certaines données peuvent manquer hors-ligne',
      }));
    }, 30000);

    return () => {
      window.removeEventListener(
        'hydromines:collection-saved', 
        handleCollectionSaved as EventListener
      );
      clearTimeout(timeout);
    };
  }, [isAuthenticated, currentUser]);

  return status;
}
