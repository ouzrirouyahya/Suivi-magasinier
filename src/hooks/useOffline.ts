import { useCallback, useEffect, useRef } from 'react';
import { useSystemStore } from '../stores/system.store';
import { offlineService } from '../services/offline.service';
import { offlineQueue } from '../lib/offlineQueue';
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

  const isSyncingRef = useRef(false);

  // Sync from IndexedDB offlineQueue to store's retryQueue on load
  useEffect(() => {
    const syncFromIndexedDB = async () => {
      try {
        const items = await offlineQueue.load();
        const mappedQueue = items.map(item => ({
          intentId: item.payload.intentId || item.id,
          type: item.payload.type,
          payload: item.payload.payload,
          dbId: item.id,
          retryCount: item.retryCount || 0,
          maxRetries: item.maxRetries || 3,
          lastError: item.lastError
        }));
        setRetryQueue(mappedQueue);
      } catch (err) {
        console.error('[useOffline] Failed to load offline queue from IndexedDB:', err);
      }
    };
    syncFromIndexedDB();
  }, [setRetryQueue]);

  const triggerProcessing = useCallback(async () => {
    if (retryQueue.length === 0 || isSyncingRef.current) return;
    isSyncingRef.current = true;
    
    const queue = [...retryQueue];
    const processedIds: string[] = [];
    const failedItems: any[] = [];
    
    for (const item of queue) {
      try {
        const startTx = Date.now();
        await offlineService.processItem(item);
        const duration = Date.now() - startTx;
        
        processedIds.push(item.intentId);
        
        // Remove from persistent IndexedDB/localStorage queue
        if (item.dbId) {
          await offlineQueue.remove(item.dbId);
        } else {
          const items = await offlineQueue.load();
          const match = items.find(i => i.payload.intentId === item.intentId);
          if (match) {
            await offlineQueue.remove(match.id);
          }
        }
        
        // Update stats
        setAvgTxDuration(avgTxDuration > 0 ? (avgTxDuration + duration) / 2 : duration);
        setTxStats({
          total: txStats.total + 1,
          success: txStats.success + 1,
          failed: txStats.failed
        });
      } catch (err: any) {
        console.error(`[useOffline] Error processing queued operation ${item.intentId}:`, err);
        const errorMsg = err.message || String(err);
        
        // Record retry failure in IndexedDB
        if (item.dbId) {
          await offlineQueue.incrementRetry(item.dbId, errorMsg);
        } else {
          const items = await offlineQueue.load();
          const match = items.find(i => i.payload.intentId === item.intentId);
          if (match) {
            await offlineQueue.incrementRetry(match.id, errorMsg);
          }
        }
        
        const nextRetryCount = (item.retryCount || 0) + 1;
        failedItems.push({
          ...item,
          retryCount: nextRetryCount,
          lastError: errorMsg
        });

        setTxStats({
          total: txStats.total + 1,
          success: txStats.success,
          failed: txStats.failed + 1
        });
      }
    }
    
    // Compute next retry queue
    const remainingInQueue = retryQueue.filter(q => !processedIds.includes(q.intentId));
    
    // Separate active retry operations from dead letters
    const nextRetryQueue: any[] = [];
    const newDeadLetters: any[] = [];
    
    remainingInQueue.forEach(item => {
      const failedMatch = failedItems.find(f => f.intentId === item.intentId);
      if (failedMatch) {
        if (failedMatch.retryCount >= (item.maxRetries || 3)) {
          newDeadLetters.push(failedMatch);
        } else {
          nextRetryQueue.push(failedMatch);
        }
      } else {
        nextRetryQueue.push(item);
      }
    });

    setRetryQueue(nextRetryQueue);
    if (newDeadLetters.length > 0) {
      setDlq([...dlq, ...newDeadLetters]);
    }
    
    if (processedIds.length > 0) {
      toast.success(`${processedIds.length} opération(s) synchronisée(s) avec succès !`);
    }
    if (newDeadLetters.length > 0) {
      toast.error(`${newDeadLetters.length} opération(s) ont échoué définitivement et déplacées dans la file d'erreurs (DLQ)`);
    }
    
    isSyncingRef.current = false;
  }, [retryQueue, dlq, txStats, avgTxDuration, setRetryQueue, setDlq, setAvgTxDuration, setTxStats]);

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
    toast.info("Test des règles de sécurité en cours...");
    setTimeout(() => {
      toast.error("Simulation d'échec : Permission Firestore insuffisante");
    }, 1000);
  }, []);

  const simulateConcurrentConflicts = useCallback(async () => {
    toast.info("Simulation de conflits de concurrence...");
    setTimeout(() => {
      toast.warning("Conflit de transaction détecté. Retransmission automatique de l'action.");
    }, 1000);
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
