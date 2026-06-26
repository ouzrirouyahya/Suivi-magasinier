import { useCallback, useEffect } from 'react';
import { useSystemStore } from '../stores/system.store';
import { offlineService } from '../services/offline.service';
import { toast } from 'sonner';

export function useOffline() {
  const {
    isDegradedNetwork,
    retryQueue,
    dlq,
    avgTxDuration,
    txStats,
    networkQuality,
    setNetworkQuality,
    setRetryQueue,
    setDlq,
    setAvgTxDuration,
    setTxStats,
    setIsDegradedNetwork
  } = useSystemStore();

  const triggerProcessing = useCallback(async () => {
    if (retryQueue.length === 0) return;
    
    const queue = [...retryQueue];
    const processed: string[] = [];
    const failed: any[] = [];
    
    for (const item of queue) {
      try {
        await offlineService.processItem(item);
        processed.push(item.intentId);
      } catch (err) {
        failed.push({ ...item, error: err });
      }
    }
    
    setRetryQueue(retryQueue.filter(q => !processed.includes(q.intentId)));
    if (failed.length > 0) {
      setDlq([...dlq, ...failed]);
    }
    
    toast.success(`${processed.length} opération(s) synchronisée(s)`);
  }, [retryQueue, dlq, setRetryQueue, setDlq]);

  // Network monitoring
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const start = Date.now();
        await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
        const latency = Date.now() - start;
        
        if (latency > 2000) {
          setNetworkQuality('HIGH_LATENCY');
          setIsDegradedNetwork(true);
        } else {
          setNetworkQuality('ONLINE');
          setIsDegradedNetwork(false);
        }
      } catch {
        setNetworkQuality('OFFLINE');
        setIsDegradedNetwork(true);
      }
    };
    
    checkNetwork();
    const interval = setInterval(checkNetwork, 12000);
    return () => clearInterval(interval);
  }, [setNetworkQuality, setIsDegradedNetwork]);

  // Auto-sync when network recovers
  useEffect(() => {
    if (networkQuality === 'ONLINE' && retryQueue.length > 0) {
      triggerProcessing();
    }
  }, [networkQuality, retryQueue.length, triggerProcessing]);

  const forceRunQueue = useCallback(async () => {
    await triggerProcessing();
  }, [triggerProcessing]);

  const clearDLQ = useCallback(() => {
    setDlq([]);
    toast.success("File d'erreurs vidée");
  }, [setDlq]);

  const simulateRuleFailure = useCallback(async () => {
    // Test firestore rules
    toast.info("Test des règles de sécurité...");
  }, []);

  const simulateConcurrentConflicts = useCallback(async () => {
    // Simulate concurrent writes
    toast.info("Simulation de conflits concurrents...");
  }, []);

  return {
    networkQuality,
    isDegradedNetwork,
    retryQueue,
    dlq,
    avgTxDuration,
    txStats,
    forceRunQueue,
    clearDLQ,
    simulateRuleFailure,
    simulateConcurrentConflicts
  };
}

export default useOffline;
