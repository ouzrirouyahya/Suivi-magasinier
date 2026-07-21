import { useState, useEffect } from 'react';
import { snapshotManager } from '../lib/snapshotManager';
import { useAuthStore } from '../stores/auth.store';

// Seules les données vraiment nécessaires pour afficher la page d'accueil (Mon Magasin) instantanément.
// Tout le reste (transferts, catalogue, maintenance...) continue de charger en arrière-plan.
const CRITICAL_COLLECTIONS = ['articles', 'mouvements'];

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

    window.addEventListener('hydromines:collection-saved', handleCollectionSaved as EventListener);

    // Sécurité : si après 10s ce n'est toujours pas prêt (réseau très faible), on affiche quand même l'app.
    const timeout = setTimeout(() => {
      setStatus(s => ({
        ...s,
        isReady: true,
        isLoadingInitial: false,
        error: 'Chargement partiel — certaines données peuvent manquer hors-ligne',
      }));
    }, 10000);

    return () => {
      window.removeEventListener('hydromines:collection-saved', handleCollectionSaved as EventListener);
      clearTimeout(timeout);
    };
  }, [isAuthenticated, currentUser]);

  return status;
}
