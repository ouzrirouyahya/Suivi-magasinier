import { useEffect, useState } from 'react';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      // La sync est automatique avec Firebase persistence
      const timer = setTimeout(() => {
        setIsSyncing(false);
        setLastSync(new Date());
      }, 2000);
      return () => clearTimeout(timer);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline, isSyncing, lastSync };
}

export default useOfflineSync;
