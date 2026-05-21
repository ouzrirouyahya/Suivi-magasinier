/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PLS v1.0 / v3.0
 * Module: Operation Intent Layer
 * File: /core/operationIntent.ts
 *
 * Implements strict UI-level idempotency locks. Operation IDs must remain
 * completely stable across offline queues, app reboots, and hot UI re-renders.
 */

const STORAGE_PREFIX = 'hydromines_intent:';

export interface OperationIntent {
  intentId: string;
  createdAt: number;
  sessionKey: string;
}

/**
 * Retrieves an existing intent ID for a given session key, or generates a stable new one.
 * Once assigned, the intent ID remains immutable and is stored in localStorage to survive browser crashes.
 *
 * @param sessionKey A unique key identifying the business action session (e.g., "mouvement-siteCode-timestamp")
 */
export function getOrCreateIntent(sessionKey: string): string {
  if (!sessionKey) {
    throw new Error('SYSTEM_VIOLATION: sessionKey is mandatory to build an operation intent.');
  }

  const storageKey = `${STORAGE_PREFIX}${sessionKey}`;
  const cached = localStorage.getItem(storageKey);

  if (cached) {
    try {
      const intent: OperationIntent = JSON.parse(cached);
      return intent.intentId;
    } catch (_) {
      // Recovery fallback in case of cache corruption
    }
  }

  // Generate a cryptographically secure, stable random intent ID v4
  const newIntentId = crypto.randomUUID();
  const newIntent: OperationIntent = {
    intentId: newIntentId,
    createdAt: Date.now(),
    sessionKey,
  };

  localStorage.setItem(storageKey, JSON.stringify(newIntent));
  return newIntentId;
}

/**
 * Clears the intent ID associated with a session key.
 * Strictly enforced to be called ONLY after the transaction returns SUCCESS_ACK or IDEMPOTENT_NOOP.
 */
export function clearIntent(sessionKey: string): void {
  const storageKey = `${STORAGE_PREFIX}${sessionKey}`;
  localStorage.removeItem(storageKey);
}

/**
 * Purely functional check for an active intent lease.
 */
export function hasActiveIntent(sessionKey: string): boolean {
  const storageKey = `${STORAGE_PREFIX}${sessionKey}`;
  return localStorage.getItem(storageKey) !== null;
}
