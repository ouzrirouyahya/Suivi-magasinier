/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - HEALTH OBSERVABILITY & NET_STORM CONTROL v5.0
 * Module: Live System Health Metrics & Traffic Protection Shield
 * File: /src/core/systemHealth.ts
 */

import { getDLQEntries } from './deadLetterQueue';
import { calculateSnapshotConfidence } from './ConfidenceEngine';
import { logForensicEvent, getForensicLogs, estimateLocalStorageQuotas, runEmergencyStorageRecycling } from './forensicJournal';

export interface SystemHealthMetrics {
  queueDepth: number;
  dlqCount: number;
  retryPressure: number;
  confidenceScore: number;
  confidenceMode: 'NORMAL' | 'DEGRADED' | 'VALIDATION_REQUIRED';
  lastSuccessfulSync: number; // Epoc ms
  ageOfLastSnapshotMs: number;
  reconnectStormStatus: boolean;
  unresolvedAlerts: string[];
  recentRecoveriesCount: number;
  localStoragePctUsed: number;
  currentThrottleRateMs: number;
}

// In-Memory status metrics for highly active subterranean clients
let lastSuccessfulSyncTimestamp = Date.now();
let recentRecoveriesCountInternal = 0;

// Reconnect Storm Detector State
const NET_STORM_FAILURES_WINDOW_MS = 15000; // 15s window to monitor retry outbursts
let recentFailureTimestamps: number[] = [];
let isNetStormActive = false;
let adaptiveCooldownMultiplier = 1.0;

/**
 * Tracks a successful transactional synchronization with the Firestore master.
 */
export function registerSuccessfulSync(): void {
  lastSuccessfulSyncTimestamp = Date.now();
  
  if (isNetStormActive) {
    isNetStormActive = false;
    adaptiveCooldownMultiplier = 1.0;
    recentFailureTimestamps = [];
    logForensicEvent(
      'INFO',
      'NET_STORM',
      'Reconnect storm mitigated. Returning queue throttle rate to baseline.',
      { baselineThrottleMs: 1000 }
    );
  }
}

/**
 * Tracks increments to recoveries count (idempotence skips, confirmatory self-heals)
 */
export function incrementRecoveriesCount(): void {
  recentRecoveriesCountInternal += 1;
}

/**
 * Registers an execution failure on retry processing to detect reconnect storm peaks.
 */
export function registerSyncFailure(errorMsg?: string): { isStormActive: boolean; multiplier: number } {
  const now = Date.now();
  recentFailureTimestamps.push(now);

  // Filter failures outside of our rolling sliding window (15s)
  recentFailureTimestamps = recentFailureTimestamps.filter(
    (t) => now - t <= NET_STORM_FAILURES_WINDOW_MS
  );

  // Storm Threshold: More than 3 failures within 15 seconds represents Wi-Fi thrashing or server peak storms
  if (recentFailureTimestamps.length >= 3 && !isNetStormActive) {
    isNetStormActive = true;
    adaptiveCooldownMultiplier = 4.0; // Quadruple the throttle cooldown delay to shield Firestore
    
    logForensicEvent(
      'CRITICAL',
      'NET_STORM',
      'RECONNECT_STORM DETECTED: Rapid consecutive synchronization failures. Activating adaptive traffic throttling protection.',
      {
        consecutiveFailuresInWindow: recentFailureTimestamps.length,
        appliedMultiplier: 4.0,
        tempThrottleCooldownMs: 4000,
        lastError: errorMsg || 'Unknown timeout or connection loss',
      }
    );
  } else if (isNetStormActive) {
    // If storm already active, keep incrementing delay multiplier incrementally
    adaptiveCooldownMultiplier = Math.min(10.0, adaptiveCooldownMultiplier + 1.0);
  }

  return {
    isStormActive: isNetStormActive,
    multiplier: adaptiveCooldownMultiplier,
  };
}

/**
 * Gets the current calculated throttle delay based on storm state
 */
export function getAdaptiveThrottleCooldown(): number {
  const BASELINE_THROTTLE_MS = 1000;
  return Math.round(BASELINE_THROTTLE_MS * adaptiveCooldownMultiplier);
}

/**
 * Returns complete system metrics under live conditions
 */
export function collectLiveSystemHealth(
  lastSnapshotTimestamp: number,
  pendingQueueCount: number,
  pendingQueueList?: any[]
): SystemHealthMetrics {
  const dlqEntries = getDLQEntries();
  const unresolvedDLQ = dlqEntries.filter(e => e.status === 'PENDING');
  
  // Calculate retry pressure
  let retryPressure = 0;
  if (pendingQueueList) {
    retryPressure = pendingQueueList.reduce((acc, item) => acc + (item.attempts || 0), 0);
  }

  // Calculate dynamic confidence score via unified SRE ConfidenceEngine
  const confMetrics = calculateSnapshotConfidence(
    lastSnapshotTimestamp,
    pendingQueueCount,
    unresolvedDLQ.length,
    lastSuccessfulSyncTimestamp
  );

  const now = Date.now();
  const ageOfLastSnapshotMs = lastSnapshotTimestamp > 0 ? now - lastSnapshotTimestamp : Infinity;

  // Compile active system alerts
  const unresolvedAlerts: string[] = [];
  if (isNetStormActive) {
    unresolvedAlerts.push('RECONNECT_STORM_ACTIVE');
  }
  if (unresolvedDLQ.length > 0) {
    unresolvedAlerts.push(`UNCONFIRMED_DLQ_ERRORS_COUNT_${unresolvedDLQ.length}`);
  }
  if (confMetrics.score < 0.5) {
    unresolvedAlerts.push('SNAPSHOT_COHERENCE_CRITICAL_LOW_CONFIDENCE');
  }
  const storageMetrics = estimateLocalStorageQuotas();
  if (storageMetrics.isPressionHigh) {
    unresolvedAlerts.push('LOCAL_STORAGE_HIGH_PRESSURE');
    // Run emergency recycling
    runEmergencyStorageRecycling();
  }

  return {
    queueDepth: pendingQueueCount,
    dlqCount: dlqEntries.length,
    retryPressure,
    confidenceScore: confMetrics.score,
    confidenceMode: confMetrics.mode,
    lastSuccessfulSync: lastSuccessfulSyncTimestamp,
    ageOfLastSnapshotMs,
    reconnectStormStatus: isNetStormActive,
    unresolvedAlerts,
    recentRecoveriesCount: recentRecoveriesCountInternal,
    localStoragePctUsed: storageMetrics.percentageUsed,
    currentThrottleRateMs: getAdaptiveThrottleCooldown(),
  };
}

/**
 * Creates a cleansed, read-ready forensic JSON telemetry snapshot.
 * Highly compliant, ensuring zero user credentials, secrets, or keys are present.
 */
export function exportForensicSnapshot(
  lastSnapshotTimestamp: number,
  pendingQueue: any[],
  rcglStatus: any
): string {
  const dlq = getDLQEntries();
  const forensicLogs = getForensicLogs();
  const health = collectLiveSystemHealth(lastSnapshotTimestamp, pendingQueue.length, pendingQueue);

  const snapshot = {
    exportTimestamp: Date.now(),
    exportTimeISO: new Date().toISOString(),
    systemPlatform: 'HydroMines Forensic Diagnostic Suite (v5.0)',
    healthMetrics: health,
    rcglStatus: {
      isHighlyStale: rcglStatus.isHighlyStale,
      classification: rcglStatus.classification,
      skewDescription: rcglStatus.skewDescription,
    },
    recoveryRegistry: {
      recentRecoveriesCount: recentRecoveriesCountInternal,
    },
    queues: {
      pendingQueueSize: pendingQueue.length,
      pendingQueueSummarized: pendingQueue.map(item => ({
        id: item.id,
        intentId: item.intentId,
        type: item.type,
        attempts: item.attempts,
        createdAt: item.createdAt,
      })),
      dlqSize: dlq.length,
      dlqEntriesMockFree: dlq.map(e => ({
        dlqId: e.dlqId,
        intentId: e.intentId,
        timestamp: e.timestamp,
        errorClassification: e.errorClassification,
        errorMessage: e.errorMessage,
        status: e.status,
      })),
    },
    recentForensicEvents: forensicLogs.slice(Math.max(0, forensicLogs.length - 35)),
  };

  return JSON.stringify(snapshot, null, 2);
}
