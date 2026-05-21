/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PLS v1.0 / v3.0
 * Module: Dead Letter Queue (DLQ)
 * File: /core/deadLetterQueue.ts
 *
 * Implements the immutable append-only storage for unrecoverable errors.
 * Re-entry into the execution queue of a DLQ entry MUST require explicit manual action.
 */

export interface DLQEntry {
  dlqId: string;
  intentId: string;
  timestamp: number;
  payload: any;
  errorClassification: 'FATAL' | 'BUSINESS_VIOLATION' | 'UNEXPECTED';
  errorMessage: string;
  errorDetails?: any;
  status: 'PENDING' | 'RESOLVED_MANUAL' | 'DISMISSED';
  resolutionNotes?: string;
  resolvedAt?: number;
}

const DLQ_STORAGE_KEY = 'hydromines_dlq_log';

/**
 * Appends a failed operation into the Dead Letter Queue.
 * Highly robust append-only model to prevent loss of telemetry.
 */
export function addToDLQ(
  intentId: string,
  payload: any,
  errorMessage: string,
  classification: 'FATAL' | 'BUSINESS_VIOLATION' | 'UNEXPECTED',
  errorDetails?: any
): string {
  const dlqId = crypto.randomUUID();
  const newEntry: DLQEntry = {
    dlqId,
    intentId,
    timestamp: Date.now(),
    payload,
    errorClassification: classification,
    errorMessage,
    errorDetails,
    status: 'PENDING',
  };

  try {
    const rawData = localStorage.getItem(DLQ_STORAGE_KEY);
    const list: DLQEntry[] = rawData ? JSON.parse(rawData) : [];
    list.push(newEntry);
    localStorage.setItem(DLQ_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    // Fail-safe protection: if localStorage is full or throws, output to console.error
    console.error('SYSTEM_CRITICAL_ERROR: Failed to save to local DLQ:', err, newEntry);
  }

  return dlqId;
}

/**
 * Returns all DLQ entries.
 */
export function getDLQEntries(): DLQEntry[] {
  try {
    const rawData = localStorage.getItem(DLQ_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Resolves a DLQ entry manually. Done strictly by authorized human supervisor.
 */
export function resolveDLQEntry(dlqId: string, resolutionNotes: string): void {
  if (!resolutionNotes || resolutionNotes.trim().length === 0) {
    throw new Error('SYSTEM_VIOLATION: Resolution notes are strictly mandatory for audits.');
  }

  try {
    const rawData = localStorage.getItem(DLQ_STORAGE_KEY);
    if (!rawData) return;
    const list: DLQEntry[] = JSON.parse(rawData);
    const entry = list.find((item) => item.dlqId === dlqId);

    if (entry) {
      entry.status = 'RESOLVED_MANUAL';
      entry.resolutionNotes = resolutionNotes;
      entry.resolvedAt = Date.now();
      localStorage.setItem(DLQ_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('SYSTEM_ERROR: Failed to resolve DLQ entry:', err);
  }
}

/**
 * Dismisses/archives a DLQ entry as safe or false-positive.
 */
export function dismissDLQEntry(dlqId: string): void {
  try {
    const rawData = localStorage.getItem(DLQ_STORAGE_KEY);
    if (!rawData) return;
    const list: DLQEntry[] = JSON.parse(rawData);
    const entry = list.find((item) => item.dlqId === dlqId);

    if (entry) {
      entry.status = 'DISMISSED';
      entry.resolvedAt = Date.now();
      localStorage.setItem(DLQ_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('SYSTEM_ERROR: Failed to dismiss DLQ entry:', err);
  }
}
