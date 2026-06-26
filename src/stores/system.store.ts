import { create } from 'zustand';
import { AuditLog } from '../types';

type NetworkQuality = 'ONLINE' | 'HIGH_LATENCY' | 'OFFLINE' | 'RECOVERING';

interface SystemState {
  techLogs: string[];
  retryQueue: any[];
  dlq: any[];
  avgTxDuration: number;
  txStats: { total: number; success: number; failed: number };
  isDegradedNetwork: boolean;
  networkQuality: NetworkQuality;
  maintenanceMode: boolean;
  maintenanceReason: string;
  isSafeMode: boolean;
  rcglResult: string | null;
  lastSnapshotTimestamp: string;
  auditLogs: AuditLog[];
  
  setTechLogs: (logs: string[]) => void;
  addTechLog: (log: string) => void;
  setRetryQueue: (queue: any[]) => void;
  setDLQ: (dlq: any[]) => void;
  setDlq: (dlq: any[]) => void; // Support both setDLQ and setDlq
  setAvgTxDuration: (duration: number) => void;
  setTxStats: (stats: { total: number; success: number; failed: number }) => void;
  setDegradedNetwork: (degraded: boolean) => void;
  setIsDegradedNetwork: (degraded: boolean) => void; // Support both setters
  setNetworkQuality: (quality: NetworkQuality) => void;
  setMaintenanceMode: (enabled: boolean) => void;
  setMaintenanceReason: (reason: string) => void;
  setIsSafeMode: (safe: boolean) => void;
  setRcglResult: (res: string | null) => void;
  setLastSnapshotTimestamp: (ts: string) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  addAuditLogLocal: (log: AuditLog) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  techLogs: [],
  retryQueue: [],
  dlq: [],
  avgTxDuration: 0,
  txStats: { total: 0, success: 0, failed: 0 },
  isDegradedNetwork: false,
  networkQuality: 'ONLINE',
  maintenanceMode: false,
  maintenanceReason: '',
  isSafeMode: false,
  rcglResult: null,
  lastSnapshotTimestamp: '',
  auditLogs: [],
  
  setTechLogs: (techLogs) => set({ techLogs }),
  addTechLog: (log) => set((state) => ({ 
    techLogs: [log, ...state.techLogs].slice(0, 500)
  })),
  setRetryQueue: (retryQueue) => set({ retryQueue }),
  setDLQ: (dlq) => set({ dlq }),
  setDlq: (dlq) => set({ dlq }),
  setAvgTxDuration: (avgTxDuration) => set({ avgTxDuration }),
  setTxStats: (txStats) => set({ txStats }),
  setDegradedNetwork: (isDegradedNetwork) => set({ isDegradedNetwork }),
  setIsDegradedNetwork: (isDegradedNetwork) => set({ isDegradedNetwork }),
  setNetworkQuality: (networkQuality) => set({ networkQuality }),
  setMaintenanceMode: (maintenanceMode) => set({ maintenanceMode }),
  setMaintenanceReason: (maintenanceReason) => set({ maintenanceReason }),
  setIsSafeMode: (isSafeMode) => set({ isSafeMode }),
  setRcglResult: (rcglResult) => set({ rcglResult }),
  setLastSnapshotTimestamp: (lastSnapshotTimestamp) => set({ lastSnapshotTimestamp }),
  setAuditLogs: (auditLogs) => set({ auditLogs }),
  addAuditLogLocal: (log) => set((state) => ({
    auditLogs: [log, ...state.auditLogs]
  }))
}));
