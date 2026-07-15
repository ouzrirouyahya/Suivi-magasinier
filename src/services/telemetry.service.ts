import { collection, addDoc, db } from '../lib/db';
import { MessageTelemetry } from '../types';
import { logger } from '../lib/utils';

const QUEUE_KEY = 'hydromines_telemetry_queue';
const MAX_QUEUE_SIZE = 500;
const QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours max

function getQueue(): Omit<MessageTelemetry, 'id'>[] {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    
    // Purger les events > 7 jours automatiquement
    const now = Date.now();
    const fresh = parsed.filter((e: any) => {
      if (!e || typeof e !== 'object') return false;
      const ts = e.timestamp 
        ? new Date(e.timestamp).getTime() 
        : 0;
      return (now - ts) < QUEUE_TTL_MS;
    });
    
    // Si on a purgé, sauvegarder immédiatement
    if (fresh.length < parsed.length) {
      saveQueue(fresh);
    }
    
    return fresh;
  } catch {
    return [];
  }
}

function saveQueue(queue: Omit<MessageTelemetry, 'id'>[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    logger.warn('[TelemetryService] Failed to save queue to localStorage:', err);
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
        // Garder seulement les MAX_QUEUE_SIZE plus récents
        const trimmed = queue.length > MAX_QUEUE_SIZE
          ? queue.slice(-MAX_QUEUE_SIZE)
          : queue;
        saveQueue(trimmed);
      }
    } catch (error) {
      logger.warn('[TelemetryService] Silent error during direct record, queueing event:', error);
      const queue = getQueue();
      queue.push(event);
      const trimmed = queue.length > MAX_QUEUE_SIZE
        ? queue.slice(-MAX_QUEUE_SIZE)
        : queue;
      saveQueue(trimmed);
    }
  },

  // 2. Replay all queued events and clear queue upon success
  async flush(): Promise<void> {
    const queue = getQueue();
    if (queue.length === 0) return;
    
    const failed: Omit<MessageTelemetry, 'id'>[] = [];
    for (const event of queue) {
      try {
        await addDoc(collection(db, 'messageTelemetry'), event);
      } catch (error) {
        logger.warn('[TelemetryService] Failed to flush telemetry event, keeping in queue:', error);
        // Garder les events qui ont échoué pour retry ultérieur
        failed.push(event);
      }
    }
    saveQueue(failed); // [] si tout réussi, sinon les échoués
  }
};

// Set up online listener for automatic reconnection replay
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    telemetryService.flush().catch((err) => {
      logger.warn('[TelemetryService] Reconnection flush failed:', err);
    });
  });
}
