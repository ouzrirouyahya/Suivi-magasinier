import { useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSystemStore } from '../stores/system.store';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'sonner';

export function useSystem() {
  const {
    techLogs,
    addTechLog,
    avgTxDuration,
    txStats,
    isDegradedNetwork,
    maintenanceMode,
    maintenanceReason,
    isSafeMode,
    rcglResult,
    setMaintenanceMode,
    setMaintenanceReason,
    retryQueue
  } = useSystemStore();

  const { currentUser } = useAuthStore();

  // Live subscription to global system config/locks
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'metadata', 'system_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenanceMode(data.maintenanceMode === true);
        setMaintenanceReason(data.lockReason || '');
      } else {
        setMaintenanceMode(false);
        setMaintenanceReason('');
      }
    }, (err) => {
      console.warn("Telemetry lock read restrictions active or document uninitialized:", err.message);
    });
    return unsub;
  }, [setMaintenanceMode, setMaintenanceReason]);

  const toggleMaintenanceLock = useCallback(async (enabled: boolean, reason?: string) => {
    try {
      if (currentUser?.role !== 'Administrateur' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new Error("PRIVILEGE_ESCALATION_BLOCKED: Only administrators can alter global maintenance locks.");
      }
      await setDoc(doc(db, 'metadata', 'system_config'), {
        maintenanceMode: enabled,
        lockReason: reason || 'Protected Maintenance Mode Active',
        updatedBy: currentUser.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(enabled ? "Système Verrouillé (Mode Maintenance enregistré)." : "Système Déverrouillé avec succès.");
    } catch (error: any) {
      toast.error(error.message || "Échec de la mutation du verrou système.");
    }
  }, [currentUser]);

  const collectSystemMetrics = useCallback(() => {
    return {
      status: 'OK',
      payloadVersion: 'v8.0',
      queueLength: retryQueue.length,
      latency: isDegradedNetwork ? 'HIGH' : 'LOW'
    };
  }, [retryQueue.length, isDegradedNetwork]);

  const exportForensic = useCallback(() => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      queueLength: retryQueue.length,
      isDegradedNetwork
    }, null, 2);
  }, [retryQueue.length, isDegradedNetwork]);

  return {
    techLogs,
    addTechLog,
    avgTxDuration,
    txStats,
    isSafeMode,
    rcglResult,
    maintenanceMode,
    maintenanceReason,
    toggleMaintenanceLock,
    collectSystemMetrics,
    exportForensic,
  };
}
export default useSystem;
