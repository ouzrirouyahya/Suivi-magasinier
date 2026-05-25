export interface QueuedOperation {
  id: string;
  timestamp: string;
  payload: any;
}

const STORAGE_KEY = 'hydromines_offline_queue_v10';

export const offlineQueue = {
  add(payload: any): QueuedOperation {
    const queue = this.load();
    const newItem: QueuedOperation = {
      id: 'off_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
      timestamp: new Date().toISOString(),
      payload
    };
    queue.push(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return newItem;
  },

  load(): QueuedOperation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  remove(id: string): void {
    const queue = this.load().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
};
