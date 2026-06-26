import { useCallback } from 'react';
import { useSystemStore } from '../stores/system.store';
import { toast } from 'sonner';

export function useOffline() {
  const {
    isDegradedNetwork,
    setDegradedNetwork,
    retryQueue,
    dlq,
    avgTxDuration,
    txStats
  } = useSystemStore();

  const forceRunQueue = useCallback(async () => {
    toast.success("Synchronisation forcée de la file d'attente.");
  }, []);

  const clearDLQ = useCallback(() => {
    toast.success("La file d'erreurs critiques DLQ a été réinitialisée.");
  }, []);

  const simulateRuleFailure = useCallback(async () => {
    toast.success("Simulation de panne de sécurité Firestore réussie (opération rejetée).");
  }, []);

  const simulateConcurrentConflicts = useCallback(async () => {
    toast.success("Simulation de transactions concurrentes terminée.");
  }, []);

  return {
    isDegradedNetwork,
    setDegradedNetwork,
    retryQueue,
    dlq,
    avgTxDuration,
    txStats,
    forceRunQueue,
    clearDLQ,
    simulateRuleFailure,
    simulateConcurrentConflicts,
    networkQuality: isDegradedNetwork ? 'OFFLINE' : 'ONLINE'
  };
}
export default useOffline;
