/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PCV v2.0 & FORENSIC LOGGING v5.0
 * Module: SRE Forensic Journal
 * File: /src/core/forensicJournal.ts
 *
 * Implements an append-only rolling sliding window in localStorage.
 * Captures all critical operations: synchronization retries, DLQ writes,
 * PCV / RCGL drift events, reconnect storms, and recovery actions.
 */

export interface ForensicEvent {
  forensicId: string;
  timestamp: number; // UTC Epoch
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  subsystem: 'QUEUE_FSM' | 'PCV_ENGINE' | 'DLQ_MANAGER' | 'IDEMPOTENCE' | 'STORAGE_SHIELD' | 'NET_STORM';
  intentId?: string;
  message: string;
  metadata?: Record<string, any>;
}

const LOCAL_STORAGE_KEY = 'hydromines_forensic_journal';
const MAX_JOURNAL_RECORDS = 150; // Sliding retention window to control localStorage overhead
const MAX_CRITICAL_RECOVERS_RETENTION = 300;

/**
 * Appends a highly structured security or operational event to the sliding journal
 */
export function logForensicEvent(
  severity: ForensicEvent['severity'],
  subsystem: ForensicEvent['subsystem'],
  message: string,
  metadata?: Record<string, any>,
  intentId?: string
): ForensicEvent {
  const event: ForensicEvent = {
    forensicId: `FORENSIC_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    timestamp: Date.now(),
    severity,
    subsystem,
    intentId,
    message,
    metadata,
  };

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let logs: ForensicEvent[] = [];
    if (raw) {
      logs = JSON.parse(raw);
    }
    
    logs.push(event);

    // Apply sliding window retention. Keep the newest records.
    if (logs.length > MAX_JOURNAL_RECORDS) {
      // Retain critical error events longer if they are of high severity, otherwise slice
      const criticalLogs = logs.filter(l => l.severity === 'CRITICAL' || l.severity === 'ERROR');
      const normalLogs = logs.filter(l => l.severity !== 'CRITICAL' && l.severity !== 'ERROR');
      
      const trimmedNormal = normalLogs.slice(normalLogs.length - (MAX_JOURNAL_RECORDS - 30));
      const consolidated = [...trimmedNormal, ...criticalLogs].sort((a, b) => a.timestamp - b.timestamp);
      logs = consolidated.slice(consolidated.length - MAX_JOURNAL_RECORDS);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.warn('FORENSIC_JOURNAL: Fail-safe write failed due to browser limitations or localState congestion', error);
  }

  return event;
}

/**
 * Retrieves the complete list of logged forensic operations
 */
export function getForensicLogs(): ForensicEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Drops non-critical historic records when localStorage pressure is encountered
 * strictly protecting transactional data like processing queues or DLQ.
 */
export function runEmergencyStorageRecycling(): { prunedCount: number; remainingCount: number } {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { prunedCount: 0, remainingCount: 0 };
    
    const logs: ForensicEvent[] = JSON.parse(raw);
    const originalCount = logs.length;

    // Filter out only warnings and info events, maintaining errors and critical state logs
    const criticalOnly = logs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL');
    
    // Retain only the last 15 normal events for operational context
    const normalEvents = logs.filter(l => l.severity !== 'ERROR' && l.severity !== 'CRITICAL');
    const preservedNormal = normalEvents.slice(Math.max(0, normalEvents.length - 15));

    const recycled = [...preservedNormal, ...criticalOnly].sort((a, b) => a.timestamp - b.timestamp);
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recycled));

    return {
      prunedCount: originalCount - recycled.length,
      remainingCount: recycled.length,
    };
  } catch {
    return { prunedCount: 0, remainingCount: 0 };
  }
}

/**
 * Measures estimated current LocalStorage usage and percentage of standard 5MB browser quota
 */
export function estimateLocalStorageQuotas(): {
  usedBytes: number;
  percentageUsed: number;
  isPressionHigh: boolean;
} {
  let totalBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalBytes += (localStorage.getItem(key) || '').length * 2; // Roughly 2 bytes per char
      }
    }
  } catch {
    totalBytes = 0;
  }

  const standardLimitBytes = 5 * 1024 * 1024; // Standard 5MB quota
  const percentageUsed = (totalBytes / standardLimitBytes) * 100;

  return {
    usedBytes: totalBytes,
    percentageUsed: Number(percentageUsed.toFixed(2)),
    isPressionHigh: percentageUsed > 75, // Severe pressure warning if 75% utilized
  };
}

/**
 * Flushes the forensic log entirely (useful for SRE test resets or cleanups)
 */
export function clearAllForensicLogs(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Fail-safe
  }
}
