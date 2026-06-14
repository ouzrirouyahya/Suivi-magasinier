import { onSnapshot, Query, DocumentReference, DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/utils';

export interface SubscriptionOptions {
  label?: string;
  onSuccess: (data: any) => void;
  onError?: (err: any) => void;
}

export class RealtimeManager {
  private subscriptions = new Map<string, {
    unsub: () => void;
    refCount: number;
    label: string;
  }>();

  /**
   * Subscribe to a Firestore Query or DocumentReference in a centralized, deduplicated manner.
   * Max 3-5 simultaneous streams is the goal.
   */
  subscribe(
    key: string,
    target: Query | DocumentReference,
    options: SubscriptionOptions
  ): () => void {
    const existing = this.subscriptions.get(key);
    
    if (existing) {
      // Deduplicate: increment reference counter and immediately run callback with cached state if needed
      existing.refCount++;
      return () => this.unsubscribe(key);
    }

    // Attach new onSnapshot listener
    const unsub = onSnapshot(
      target as any, 
      (snapshot: QuerySnapshot | DocumentSnapshot) => {
        let result: any;
        if ('docs' in snapshot) {
          // It's a QuerySnapshot
          result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          // It's a DocumentSnapshot
          result = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
        }
        options.onSuccess(result);
      },
      (error) => {
        console.error(`[RealtimeManager Error in ${key}]:`, error);
        if (options.onError) {
          options.onError(error);
        } else {
          handleFirestoreError(error, OperationType.GET, key);
        }
      }
    );

    this.subscriptions.set(key, {
      unsub,
      refCount: 1,
      label: options.label || key
    });

    // Check ceiling of active subscriptions
    if (this.subscriptions.size > 5) {
      console.warn(`[RealtimeManager] High number of active streams (${this.subscriptions.size}). Consider optimizing to stay within 3-5 streams.`);
    }

    return () => this.unsubscribe(key);
  }

  /**
   * Unsubscribe / decrement references
   */
  unsubscribe(key: string): void {
    const existing = this.subscriptions.get(key);
    if (!existing) return;

    existing.refCount--;
    if (existing.refCount <= 0) {
      existing.unsub();
      this.subscriptions.delete(key);
      console.log(`[RealtimeManager] Cleared active snapshot stream for key: ${key}`);
    }
  }

  /**
   * Force clear all subscription listeners (e.g. on logout)
   */
  clearAll(): void {
    for (const [key, sub] of this.subscriptions.entries()) {
      sub.unsub();
    }
    this.subscriptions.clear();
    console.log('[RealtimeManager] All active subscriptions cleared successfully.');
  }

  /**
   * Get total count of active onSnapshot listeners
   */
  getActiveStreamCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get keys of active streams
   */
  getActiveKeys(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

export const realtimeManager = new RealtimeManager();
