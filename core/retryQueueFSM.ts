/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PLS v1.0 / v3.0
 * Module: Deterministic FSM Retry Queue
 * File: /core/retryQueueFSM.ts
 */

import { addToDLQ } from './deadLetterQueue';
import { classifyFirestoreError } from './firestoreTransaction';

export interface QueueItem {
  id: string;             // Queue element unique ID
  intentId: string;       // Stable cryptographic UI Operation Intent ID
  type: string;           // Mutation descriptor (e.g., "STOCK_MUTATION")
  payload: any;           // Serialized payload
  attempts: number;       // Current transmission attempt counter
  lastAttempt?: number;   // Timestamp of last try
  createdAt: number;      // Creation timestamp (FIFO key)
}

export type QueueItemResolver = (payload: any, intentId: string) => Promise<{ status: 'SUCCESS_ACK' | 'IDEMPOTENT_NOOP' }>;

const QUEUE_STORAGE_KEY = 'hydromines_pending_sync_queue';
const MAX_ATTEMPTS = 5;

class RetryQueueFSMClass {
  private processingLock = false;
  private resolvers: Map<string, QueueItemResolver> = new Map();
  private retryTimeout: NodeJS.Timeout | null = null;

  /**
   * Registers a resolver callback for a specific mutation transaction type.
   */
  public registerResolver(type: string, resolver: QueueItemResolver): void {
    this.resolvers.set(type, resolver);
  }

  /**
   * Appends an operational event into the sequential log queue.
   */
  public enqueue(type: string, payload: any, intentId: string): string {
    const queueItemId = crypto.randomUUID();
    const newEntry: QueueItem = {
      id: queueItemId,
      intentId,
      type,
      payload,
      attempts: 0,
      createdAt: Date.now(),
    };

    const queue = this.getQueue();
    queue.push(newEntry);
    this.saveQueue(queue);

    // Trigger processing asynchronously in case online
    this.triggerProcessing();

    return queueItemId;
  }

  /**
   * Retrieves current items sorted by FIFO order.
   */
  public getQueue(): QueueItem[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      const list: QueueItem[] = raw ? JSON.parse(raw) : [];
      // FIFO Sort strictly by creation timestamp
      return list.sort((a, b) => a.createdAt - b.createdAt);
    } catch (_) {
      return [];
    }
  }

  private saveQueue(queue: QueueItem[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('SYSTEM_CRITICAL_ERROR: Failed to save Local Queue state:', err);
    }
  }

  /**
   * Asynchronously initiates queue parsing if not already locked.
   */
  public triggerProcessing(): void {
    if (this.processingLock) return;

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.processQueue().catch((err) => {
      console.error('SYSTEM_ERROR: Queue Processor crashed:', err);
      this.releaseProcessingLock();
    });
  }

  private releaseProcessingLock(): void {
    this.processingLock = false;
  }

  private async processQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.processingLock = true;

    // SRE STRICT ENFORCEMENT: Process sequentially (FIFO) to assure physical stock integrity
    const currentItem = queue[0];
    const resolver = this.resolvers.get(currentItem.type);

    if (!resolver) {
      // Unresolvable handler mismatch is FATAL
      this.handleFatalFailure(
        currentItem,
        `SYSTEM_VIOLATION: No registered resolver for mutation payload type: ${currentItem.type}`
      );
      this.releaseProcessingLock();
      this.triggerProcessing();
      return;
    }

    // Prepare execution state
    currentItem.attempts += 1;
    currentItem.lastAttempt = Date.now();
    this.saveModifiedItem(currentItem);

    try {
      // Execute the callback
      const result = await resolver(currentItem.payload, currentItem.intentId);

      // Handle successful execution results safely (SUCCESS_ACK / IDEMPOTENT_NOOP)
      if (result.status === 'SUCCESS_ACK' || result.status === 'IDEMPOTENT_NOOP') {
        this.removeItemFromQueue(currentItem.id);
        this.releaseProcessingLock();

        // Process next item immediately
        this.triggerProcessing();
        return;
      }
    } catch (error: any) {
      const classification = classifyFirestoreError(error);

      if (classification === 'FATAL') {
        // FATAL errors go to DLQ immediately, bypassing retry loop entirely
        this.handleFatalFailure(currentItem, error?.message || String(error));
        this.releaseProcessingLock();
        this.triggerProcessing();
        return;
      } else {
        // RETRYABLE error
        if (currentItem.attempts >= MAX_ATTEMPTS) {
          // Exceeded bound retries: Escalate to DLQ as UNEXPECTED to prevent queue blockade
          this.handleFatalFailure(
            currentItem,
            `BOUNDED_RETRY_EXCEEDED: Failed after ${MAX_ATTEMPTS} attempts. Last error: ${error?.message || String(error)}`
          );
          this.releaseProcessingLock();
          this.triggerProcessing();
          return;
        }

        // Schedule backoff reconnect retry with randomized jitter delay
        const backoffDelay = Math.min(5000 * Math.pow(2, currentItem.attempts) + Math.random() * 1500, 60000);
        console.warn(`RETRYABLE_ERROR: Execution failed. Scheduling retry item index in ${backoffDelay}ms`, error);

        this.releaseProcessingLock();
        this.retryTimeout = setTimeout(() => {
          this.triggerProcessing();
        }, backoffDelay);
      }
    }
  }

  private saveModifiedItem(item: QueueItem): void {
    const queue = this.getQueue();
    const index = queue.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      queue[index] = item;
      this.saveQueue(queue);
    }
  }

  private removeItemFromQueue(itemId: string): void {
    const queue = this.getQueue();
    const updated = queue.filter((i) => i.id !== itemId);
    this.saveQueue(updated);
  }

  private handleFatalFailure(item: QueueItem, errorMsg: string): void {
    console.error(`SRE_MUTATION_ISOLATION: Routing intentId ${item.intentId} to DLQ. Status: FAULT`);

    // Write to dead letter queue synchronously
    addToDLQ(item.intentId, item.payload, errorMsg, 'FATAL', {
      queueId: item.id,
      attempts: item.attempts,
      type: item.type,
    });

    // Clean from retryQueue forever: DLQ is non-reversible automatically
    this.removeItemFromQueue(item.id);
  }
}

export const RetryQueueFSM = new RetryQueueFSMClass();
