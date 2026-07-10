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

  // Sync from IndexedDB offlineQueue to store's retryQueue and dlq on load
  useEffect(() => {
    const syncFromIndexedDB = async () => {
      // Éviter une sync parallèle si le réseau revient pendant le chargement IndexedDB
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const items = await offlineQueue.load();
        const mappedQueue = items.map(item => ({
          intentId: item.payload.intentId || item.id,
          type: item.payload.type,
          payload: item.payload.payload,
          dbId: item.id,
          retryCount: item.retryCount || 0,
          maxRetries: item.maxRetries || 3,
          lastError: item.lastError,
          nextAttemptTime: item.nextAttemptTime
        }));
        
        const activeQueue = mappedQueue.filter(item => item.retryCount < item.maxRetries);
        const dlqItems = mappedQueue.filter(item => item.retryCount >= item.maxRetries);
        
        setRetryQueue(activeQueue);
        setDlq(dlqItems);
      } catch (err) {
        console.error(
          '[useOffline] Failed to load offline queue from IndexedDB:',
          err
        );
      } finally {
        // Toujours libérer le verrou, même en cas d'erreur
        isSyncingRef.current = false;
      }
    };
    syncFromIndexedDB();
  }, [setRetryQueue, setDlq]);

  const triggerProcessing = useCallback(async () => {
    const { retryQueue, dlq, txStats, avgTxDuration, setRetryQueue, setDlq, setAvgTxDuration, setTxStats, setNetworkQuality } = useSystemStore.getState();
    if (retryQueue.length === 0 || isSyncingRef.current) return;
    isSyncingRef.current = true;
    
    // Transitionner visuellement vers le mode RECOVERING pendant la synchronisation
    setNetworkQuality('RECOVERING');
    
    const queue = [...retryQueue];
    const processedIds: string[] = [];
    const failedItems: any[] = [];
    
    let totalSuccess = txStats.success;
    let totalFailed = txStats.failed;
    let accumulatedAvgDuration = avgTxDuration;
    
    const nowTime = new Date();
    let fifoBlocked = false;
    
    for (const item of queue) {
      if (fifoBlocked) {
        // En mode strict FIFO, si un élément précédent est bloqué en backoff,
        // on n'exécute pas les éléments suivants pour préserver l'ordre d'exécution
        continue;
      }

      if (item.nextAttemptTime && new Date(item.nextAttemptTime) > nowTime) {
        // Cet élément est en période de temporisation (backoff)
        // On active le verrou FIFO pour bloquer les éléments dépendants suivants
        fifoBlocked = true;
        continue;
      }
      
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
        
        accumulatedAvgDuration = accumulatedAvgDuration > 0 ? (accumulatedAvgDuration + duration) / 2 : duration;
        totalSuccess += 1;
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
        const backoffSec = Math.pow(2, nextRetryCount) * 5;
        const jitter = Math.random() * 3;
        const nextAttempt = new Date(Date.now() + (backoffSec + jitter) * 1000).toISOString();

        const failedItemWithBackoff = {
          ...item,
          retryCount: nextRetryCount,
          lastError: errorMsg,
          nextAttemptTime: nextAttempt
        };

        failedItems.push(failedItemWithBackoff);
        totalFailed += 1;
        
        // En cas d'erreur sur l'élément courant, on bloque également le reste de la file d'attente
        // pour cette passe afin de maintenir l'intégrité séquentielle
        fifoBlocked = true;
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

    setAvgTxDuration(accumulatedAvgDuration);
    setTxStats({
      total: totalSuccess + totalFailed,
      success: totalSuccess,
      failed: totalFailed
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
    
    // Rétablir la qualité réseau d'origine une fois fini
    setNetworkQuality('ONLINE');
    isSyncingRef.current = false;
  }, []);

  // Network monitoring
  useEffect(() => {
    const checkNetwork = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const start = Date.now();
        await fetch(`/favicon.ico?ping=${start}`, { 
          method: 'HEAD', 
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const latency = Date.now() - start;
        
        if (latency > 2000) {
          setNetworkQuality('HIGH_LATENCY');
          setIsDegradedNetwork(true);
        } else {
          setNetworkQuality('ONLINE');
          setIsDegradedNetwork(false);
        }
      } catch {
        clearTimeout(timeoutId);
        setNetworkQuality('OFFLINE');
        setIsDegradedNetwork(true);
      }
    };
    
    checkNetwork();
    const interval = setInterval(checkNetwork, 12000);
    return () => clearInterval(interval);
  }, [setNetworkQuality, setIsDegradedNetwork]);

  // Auto-sync when network recovers with a safe cooldown/delay of 5 seconds to prevent tight loop spams
  const lastSyncTimeRef = useRef(0);
  useEffect(() => {
    if (networkQuality === 'ONLINE' && retryQueue.length > 0) {
      const now = Date.now();
      if (now - lastSyncTimeRef.current > 5000) {
        lastSyncTimeRef.current = now;
        triggerProcessing();
      } else {
        const timer = setTimeout(() => {
          const freshStore = useSystemStore.getState();
          if (freshStore.networkQuality === 'ONLINE' && freshStore.retryQueue.length > 0) {
            lastSyncTimeRef.current = Date.now();
            triggerProcessing();
          }
        }, 5000 - (now - lastSyncTimeRef.current));
        return () => clearTimeout(timer);
      }
    }
  }, [networkQuality, retryQueue.length, triggerProcessing]);

  const forceRunQueue = useCallback(async () => {
    await triggerProcessing();
  }, [triggerProcessing]);

  const retryDLQItem = useCallback(async (item: any) => {
    if (item.dbId) {
      await offlineQueue.resetRetry(item.dbId);
    } else {
      const items = await offlineQueue.load();
      const match = items.find(i => i.payload.intentId === item.intentId);
      if (match) {
        await offlineQueue.resetRetry(match.id);
      }
    }
    
    // update store
    const updatedItem = {
      ...item,
      retryCount: 0,
      lastError: undefined,
      nextAttemptTime: undefined
    };
    
    const currentQueue = useSystemStore.getState().retryQueue;
    const currentDlq = useSystemStore.getState().dlq;
    
    setRetryQueue([...currentQueue, updatedItem]);
    setDlq(currentDlq.filter((i: any) => i.intentId !== item.intentId));
    toast.success("Opération replacée dans la file de synchronisation active !");
  }, [setRetryQueue, setDlq]);

  const deleteDLQItem = useCallback(async (item: any) => {
    if (item.dbId) {
      await offlineQueue.remove(item.dbId);
    } else {
      const items = await offlineQueue.load();
      const match = items.find(i => i.payload.intentId === item.intentId);
      if (match) {
        await offlineQueue.remove(match.id);
      }
    }
    
    const currentDlq = useSystemStore.getState().dlq;
    setDlq(currentDlq.filter((i: any) => i.intentId !== item.intentId));
    toast.success("Opération rejetée définitivement.");
  }, [setDlq]);

  const clearDLQ = useCallback(async () => {
    const currentDlq = useSystemStore.getState().dlq;
    for (const item of currentDlq) {
      if (item.dbId) {
        await offlineQueue.remove(item.dbId);
      } else {
        const items = await offlineQueue.load();
        const match = items.find(i => i.payload.intentId === item.intentId);
        if (match) {
          await offlineQueue.remove(match.id);
        }
      }
    }
    setDlq([]);
    toast.success("File d'erreurs entièrement vidée.");
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
    retryDLQItem,
    deleteDLQItem,
    simulateRuleFailure,
    simulateConcurrentConflicts
  };
}

export default useOffline;
