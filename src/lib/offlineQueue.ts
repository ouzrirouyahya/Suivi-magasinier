import { IndexedDBStorage } from '../core/indexedDBStorage';

const STORAGE_KEY = 'hydromines_offline_queue_v10';

export interface QueuedOperation {
  id: string;
  timestamp: string;
  retryCount: number;      // ← nouveau : compter les échecs
  maxRetries: number;      // ← nouveau : 3 par défaut
  lastError?: string;      // ← nouveau : garder le dernier message d'erreur
  payload: any;
}

function validateItem(item: any): item is QueuedOperation {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.timestamp === 'string' &&
    typeof item.payload === 'object'
  );
}

export const offlineQueue = {
  async add(payload: any): Promise<QueuedOperation> {
    const newItem: QueuedOperation = {
      id: 'off_' + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      payload
    };
    
    // Primaire : IndexedDB (résistant aux crashes)
    try {
      await IndexedDBStorage.saveItem('offlineQueue', newItem);
    } catch {
      // Fallback : localStorage
      const queue = this.loadFromLocalStorage();
      queue.push(newItem);
      this.saveToLocalStorage(queue);
    }
    return newItem;
  },

  async load(): Promise<QueuedOperation[]> {
    try {
      const items = await IndexedDBStorage.getCollection<QueuedOperation>('offlineQueue');
      return items.filter(validateItem);
    } catch {
      return this.loadFromLocalStorage();
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await IndexedDBStorage.deleteItem('offlineQueue', id);
    } catch {
      const queue = this.loadFromLocalStorage().filter(i => i.id !== id);
      this.saveToLocalStorage(queue);
    }
  },

  async incrementRetry(id: string, errorMsg: string): Promise<void> {
    const items = await this.load();
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.retryCount += 1;
    item.lastError = errorMsg;
    try {
      await IndexedDBStorage.saveItem('offlineQueue', item);
    } catch {
      this.saveToLocalStorage(items);
    }
  },

  async getDeadLetters(): Promise<QueuedOperation[]> {
    const items = await this.load();
    return items.filter(i => i.retryCount >= i.maxRetries);
  },

  loadFromLocalStorage(): QueuedOperation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(validateItem) : [];
    } catch {
      // JSON corrompu : sauvegarder pour debug
      const corrupted = localStorage.getItem(STORAGE_KEY);
      if (corrupted) localStorage.setItem(STORAGE_KEY + '_corrupted_' + Date.now(), corrupted);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  },

  saveToLocalStorage(queue: QueuedOperation[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[OfflineQueue] localStorage quota dépassé :', e);
    }
  }
};
