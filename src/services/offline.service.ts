import { IndexedDBStorage } from '../core/indexedDBStorage';

export const offlineService = {
  async saveCollection(colName: string, data: any[]): Promise<void> {
    await IndexedDBStorage.saveCollection(colName, data);
  },

  async getCollection<T>(colName: string): Promise<T[]> {
    return await IndexedDBStorage.getCollection<T>(colName);
  }
};
