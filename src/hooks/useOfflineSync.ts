import { useEffect, useState, useRef } from 'react';
import { onSnapshotsInSync } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const syncUnsubRef = useRef<(() => void) | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);

      // Nettoyer l'ancienne souscription si elle existe
      syncUnsubRef.current?.();
      if (fallbackRef.current) clearTimeout(fallbackRef.current);

      // onSnapshotsInSync : se déclenche quand Firebase a fini
      // de réconcilier TOUS les listeners actifs avec le serveur
      const unsub = onSnapshotsInSync(db, () => {
        setIsSyncing(false);
        setLastSync(new Date());
        unsub();
        syncUnsubRef.current = null;
      });
      syncUnsubRef.current = unsub;

      // Fallback de sécurité : 20 secondes max (réseau très lent)
      fallbackRef.current = setTimeout(() => {
        setIsSyncing(false);
        setLastSync(new Date());
        syncUnsubRef.current?.();
      }, 20000);
    };

    const handleOnlineEvent = () => {
      handleOnline();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
      syncUnsubRef.current?.();
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOffline);

    // Si on est déjà en ligne au chargement, on lance une vérification
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOffline);
      syncUnsubRef.current?.();
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, []);

  // Charger le nombre d'opérations en attente depuis la queue
  useEffect(() => {
    const load = async () => {
      const { offlineQueue } = await import('../lib/offlineQueue');
      const items = await offlineQueue.load();
      setPendingCount(items.length);
    };
    load();
    
    // Également mettre en place un intervalle régulier pour actualiser si de nouveaux items sont ajoutés/enlevés
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  return { isOnline, isSyncing, lastSync, pendingCount };
}

export default useOfflineSync;
