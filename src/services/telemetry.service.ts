import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageTelemetry } from '../types';

const QUEUE_KEY = 'hydromines_telemetry_queue';

function getQueue(): Omit<MessageTelemetry, 'id'>[] {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: Omit<MessageTelemetry, 'id'>[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[TelemetryService] Failed to save queue to localStorage:', err);
  }
}

export const telemetryService = {
  // 1. Record a telemetry event silently (with offline local fallback)
  async record(event: Omit<MessageTelemetry, 'id'>): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await addDoc(collection(db, 'messageTelemetry'), event);
      } else {
        const queue = getQueue();
        queue.push(event);
        saveQueue(queue);
      }
    } catch (error) {
      console.warn('[TelemetryService] Silent error during direct record, queueing event:', error);
      const queue = getQueue();
      queue.push(event);
      saveQueue(queue);
    }
  },

  // 2. Replay all queued events and clear queue upon success
  async flush(): Promise<void> {
    const queue = getQueue();
    if (queue.length === 0) return;

    try {
      for (const event of queue) {
        await addDoc(collection(db, 'messageTelemetry'), event);
      }
      saveQueue([]);
    } catch (error) {
      console.warn('[TelemetryService] Failed to flush all queued telemetry events:', error);
    }
  }
};

// Set up online listener for automatic reconnection replay
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    telemetryService.flush().catch((err) => {
      console.warn('[TelemetryService] Reconnection flush failed:', err);
    });
  });
}
