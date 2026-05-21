/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PLS v1.0 / v3.0
 * Module: Deterministic FSM Retry Queue
 * File: /src/core/retryQueueFSM.ts
 */

import { doc, getDoc, Firestore } from 'firebase/firestore';
import { addToDLQ } from './deadLetterQueue';
import { classifyFirestoreError } from './firestoreTransaction';
import { isAlreadyCommittedInLocalRegistry, registerSuccessAck } from './operationIntent';
import { logForensicEvent } from './forensicJournal';
import {
  registerSuccessfulSync,
  registerSyncFailure,
  getAdaptiveThrottleCooldown,
  incrementRecoveriesCount,
} from './systemHealth';

export interface QueueItem {
  id: string;             // Queue element unique ID
  intentId: string;       // Stable cryptographic UI Operation Intent ID
  type: string;           // Mutation descriptor (e.g., "STOCK_MUTATION")
  payload: any;           // Serialized payload
  attempts: number;       // Current transmission attempt counter
  lastAttempt?: number;   // Timestamp of last try
  createdAt: number;      // Creation timestamp (FIFO key)
  siteId?: string;        // Cryptographically/logically bound site code
}

export type QueueItemResolver = (payload: any, intentId: string) => Promise<{ status: 'SUCCESS_ACK' | 'IDEMPOTENT_NOOP' }>;

const QUEUE_STORAGE_KEY = 'hydromines_pending_sync_queue';
const MAX_ATTEMPTS = 5;

class RetryQueueFSMClass {
  private processingLock = false;
  private resolvers: Map<string, QueueItemResolver> = new Map();
  private retryTimeout: NodeJS.Timeout | null = null;
  private THROTTLE_COOLDOWN_MS = 1000; // 1s throttle delay between consecutive sync writes
  private activeSiteId = 'SMI';
  private networkMultiplier = 1.0; // Dynamic multiplier based on network condition

  public setActiveSite(siteId: string): void {
    const prev = this.activeSiteId;
    this.activeSiteId = siteId;
    if (prev !== siteId) {
      console.info(`[SRE_SITE_ISOLATION] Queue isolation lock changed: ${prev} -> ${siteId}. Recalibrating convoi replay.`);
      this.triggerProcessing();
    }
  }

  public getActiveSite(): string {
    return this.activeSiteId;
  }

  public setNetworkMultiplier(mult: number): void {
    this.networkMultiplier = mult;
  }

  /**
   * Registers a resolver callback for a specific mutation transaction type.
   */
  public registerResolver(type: string, resolver: QueueItemResolver): void {
    this.resolvers.set(type, resolver);
  }

  /**
   * Appends an operational event into the sequential log queue.
   */
  public enqueue(type: string, payload: any, intentId: string, siteId?: string): string {
    const queueItemId = crypto.randomUUID();
    const boundSite = siteId || this.activeSiteId;
    
    const newEntry: QueueItem = {
      id: queueItemId,
      intentId,
      type,
      payload,
      attempts: 0,
      createdAt: Date.now(),
      siteId: boundSite,
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

    // SRE STRICT ENFORCEMENT & SITE ISOLATION SAFETY:
    // Pull the first operation matching the active site to prevent cross-site corruption.
    const currentItem = queue.find(i => !i.siteId || i.siteId === this.activeSiteId);
    if (!currentItem) {
      console.info(`[SRE_SITE_ISOLATION] Queue has ${queue.length} items, but none matching active site: ${this.activeSiteId}. Suspending replay.`);
      this.releaseProcessingLock();
      return;
    }

    // Consult ACK registry first (Server Acknowledgement Contract - Rule 3)
    if (isAlreadyCommittedInLocalRegistry(currentItem.intentId)) {
      console.warn(`[SRE_ACK_REGISTRY] Intent ${currentItem.intentId} already committed in local ACK registry. Skipping execution loop.`);
      incrementRecoveriesCount();
      logForensicEvent(
        'INFO',
        'IDEMPOTENCE',
        `Intent idempotent skipped from queue (already processed). Purging from queue.`,
        { intentId: currentItem.intentId, type: currentItem.type },
        currentItem.intentId
      );
      this.removeItemFromQueue(currentItem.id);
      this.releaseProcessingLock();
      
      // Proceed to next item after throttled cooldown (Rule 2)
      setTimeout(() => {
        this.triggerProcessing();
      }, getAdaptiveThrottleCooldown() * this.networkMultiplier);
      return;
    }

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
        registerSuccessAck(currentItem.intentId); // Enforce Rule 3 locally
        registerSuccessfulSync();
        
        logForensicEvent(
          'INFO',
          'QUEUE_FSM',
          `Sync successful for queue item of type ${currentItem.type}`,
          { intentId: currentItem.intentId, type: currentItem.type },
          currentItem.intentId
        );

        this.removeItemFromQueue(currentItem.id);
        this.releaseProcessingLock();

        // Process next item with global throttled cooldown to prevent burst contention (Rule 2)
        setTimeout(() => {
          this.triggerProcessing();
        }, getAdaptiveThrottleCooldown() * this.networkMultiplier);
        return;
      }
    } catch (error: any) {
      const classification = classifyFirestoreError(error);
      const errorStr = error?.message || String(error);
      const isFatal = classification === 'FATAL';

      logForensicEvent(
        isFatal ? 'ERROR' : 'WARN',
        'QUEUE_FSM',
        `Sync aborted due to ${classification} error: ${errorStr}`,
        { intentId: currentItem.intentId, attempts: currentItem.attempts, errorClassification: classification },
        currentItem.intentId
      );

      if (isFatal) {
        // FATAL errors go to DLQ immediately, bypassing retry loop entirely
        this.handleFatalFailure(currentItem, errorStr);
        this.releaseProcessingLock();
        this.triggerProcessing();
        return;
      } else {
        // RETRYABLE error
        const storm = registerSyncFailure(errorStr);

        if (currentItem.attempts >= MAX_ATTEMPTS) {
          // Exceeded bound retries: Escalate to DLQ as UNEXPECTED to prevent queue blockade
          this.handleFatalFailure(
            currentItem,
            `BOUNDED_RETRY_EXCEEDED: Failed after ${MAX_ATTEMPTS} attempts. Last error: ${errorStr}`
          );
          this.releaseProcessingLock();
          this.triggerProcessing();
          return;
        }

        // Schedule backoff reconnect retry with randomized jitter delay
        const baseDelay = storm.isStormActive ? getAdaptiveThrottleCooldown() * this.networkMultiplier : 5000;
        const backoffDelay = Math.min((baseDelay * Math.pow(1.5, currentItem.attempts) + Math.random() * 1500) * this.networkMultiplier, 60000);
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

  /**
   * Performs dynamic self-healing queue reconciliation (Rule 4).
   * Scans local retryQueue, cross-checks each intentId with Firestore central /idempotency/ document state
   * on boot, and purges already confirmed intents securely.
   */
  public async reconcilePendingQueueWithAuthority(db: Firestore): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.info(`[RECONCILIATION] Initiating self-healing scan of ${queue.length} pending operations...`);
    const itemsToRemove: string[] = [];

    for (const item of queue) {
      // 1. Cross-check local ACK registry first
      if (isAlreadyCommittedInLocalRegistry(item.intentId)) {
        console.warn(`[RECONCILIATION] Intent ${item.intentId} already committed in local ACK registry. Purging.`);
        itemsToRemove.push(item.id);
        continue;
      }

      // 2. Query centralized Firestore master
      try {
        const idempDocRef = doc(db, 'idempotency', item.intentId);
        const refSnap = await getDoc(idempDocRef);
        if (refSnap.exists()) {
          console.warn(`[RECONCILIATION] Intent ${item.intentId} found confirmed in central Firestore master. Registering SUCCESS_ACK and purging.`);
          registerSuccessAck(item.intentId);
          itemsToRemove.push(item.id);
        }
      } catch (err) {
        console.warn(`[RECONCILIATION] Could not verify authority for intent ${item.intentId}:`, err);
      }
    }

    if (itemsToRemove.length > 0) {
      const updatedQueue = this.getQueue().filter(i => !itemsToRemove.includes(i.id));
      this.saveQueue(updatedQueue);
      console.info(`[RECONCILIATION] Self-healing complete. Automatically cleaned ${itemsToRemove.length} confirmed intents.`);
    }
  }
}

export const RetryQueueFSM = new RetryQueueFSMClass();
