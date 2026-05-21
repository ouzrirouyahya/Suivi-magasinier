/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PLS v1.0 / v3.0
 * Module: Firestore Idempotent Transaction Wrapper
 * File: /core/firestoreTransaction.ts
 *
 * Wraps Firestore runTransaction with a server-first idempotency lease check.
 */

import {
  Firestore,
  runTransaction,
  doc,
  serverTimestamp,
  Transaction,
} from 'firebase/firestore';

export interface IdempotentTransactionResult<T> {
  status: 'SUCCESS_ACK' | 'IDEMPOTENT_NOOP' | 'FATAL_ERROR' | 'RETRYABLE_ERROR';
  intentId: string;
  data?: T;
  errorMessage?: string;
  isFatal?: boolean;
}

/**
 * Classifies Firestore client error codes safely.
 * Returns whether the error is FATAL (unrecoverable, must go to DLQ) or RETRYABLE (transient network outage).
 */
export function classifyFirestoreError(err: any): 'FATAL' | 'RETRYABLE' {
  const code = err?.code || '';
  const message = err?.message || '';

  // Explicitly match standard Google Cloud Web SDK error codes
  switch (code) {
    // Fatal Authentication & Access Control Exceptions
    case 'permission-denied':
    case 'unauthenticated':
      return 'FATAL';

    // Business Violations or Schema Mismatch Exceptions
    case 'invalid-argument':
    case 'out-of-range':
    case 'failed-precondition':
    case 'not-found':
    case 'already-exists':
    case 'data-loss':
      return 'FATAL';

    // Transient & Network-level Recoverable Exceptions
    case 'unavailable':
    case 'deadline-exceeded':
    case 'cancelled':
    case 'resource-exhausted':
    case 'internal':
    case 'aborted':
    case 'unknown':
      return 'RETRYABLE';

    default:
      // Safety guard: if message mentions physical validation failure (e.g., negative stock) it is FATAL
      if (message.toLowerCase().includes('stock insuffisant') || message.toLowerCase().includes('validation')) {
        return 'FATAL';
      }
      // General fallbacks: default to RETRYABLE for robustness
      return 'RETRYABLE';
  }
}

/**
 * Executes a business transaction with robust server-side double-entry checks using a stable intent ID.
 *
 * @param db Firestore database instance
 * @param intentId Stably preserved client operation token
 * @param transactionLogic Business-critical transaction logic. Receives the raw Firestore Transaction.
 */
export async function executeIdempotentTransaction<T>(
  db: Firestore,
  intentId: string,
  transactionLogic: (transaction: Transaction) => Promise<T>
): Promise<IdempotentTransactionResult<T>> {
  if (!intentId) {
    return {
      status: 'FATAL_ERROR',
      intentId,
      errorMessage: 'SYSTEM_VIOLATION: Missing cryptographic intentId anchor.',
      isFatal: true,
    };
  }

  const idempotencyDocRef = doc(db, 'idempotency', intentId);

  try {
    const finalResult = await runTransaction(db, async (transaction) => {
      // 1. READ PHASE FIRST - Check idempotency table
      const idempDoc = await transaction.get(idempotencyDocRef);

      if (idempDoc.exists()) {
        const docData = idempDoc.data();
        return {
          status: 'IDEMPOTENT_NOOP' as const,
          data: docData?.responseData as T,
        };
      }

      // 2. READ & WRITE PHASE - Execute functional business rules
      const businessData = await transactionLogic(transaction);

      // 3. WRITE PHASE - Allocate exclusive lock key
      transaction.set(idempotencyDocRef, {
        intentId,
        status: 'SUCCESS_ACK',
        createdAt: serverTimestamp(),
        responseData: businessData || null,
      });

      return {
        status: 'SUCCESS_ACK' as const,
        data: businessData,
      };
    });

    return {
      status: finalResult.status,
      intentId,
      data: finalResult.data,
    };
  } catch (error: any) {
    const errorType = classifyFirestoreError(error);
    const message = error?.message || String(error);

    return {
      status: errorType === 'FATAL' ? 'FATAL_ERROR' : 'RETRYABLE_ERROR',
      intentId,
      errorMessage: `FIRESTORE_FAIL [${error?.code || 'GENERIC'}]: ${message}`,
      isFatal: errorType === 'FATAL',
    };
  }
}
