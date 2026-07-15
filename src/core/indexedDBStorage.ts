/**
 * HydroMines Storage Hardening Engine v2.0 (SRE Runtime Enforcement)
 * Encapsulates safe, multi-store IndexedDB operations with automated localStorage fallbacks.
 */
import { logger } from '../lib/utils';

const DB_NAME = 'hydromines_secure_warehouse_v9';
const DB_VERSION = 7;
const STORES = [
  'articles', 'catalog', 'mouvements', 'maintenanceLogs', 'transferts', 
  'agents', 'engins', 'perfos', 'hydromines_catalog', 'hydrominesCatalog',
  'inventaires', 'auditLogs', 'notifications', 'distributions', 
  'purchaseRequests', 'anomalyReports', 'offlineQueue'
];

class IndexedDBStorageClass {
  private db: IDBDatabase | null = null;
  private isFallbackMode = false;

  constructor() {
    this.initDatabase().catch((err) => {
      logger.warn('[STORAGE_HARDENING] IndexedDB initialization failed. LocalStorage fallback active.', err);
      this.isFallbackMode = true;
    });
  }

  private resolveStoreName(storeName: string): string {
    if (storeName === 'hydrominesCatalog') return 'hydromines_catalog';
    return storeName;
  }

  private initDatabase(forcedVersion?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this runtime environment.'));
        return;
      }

      const versionToOpen = forcedVersion || DB_VERSION;
      const request = indexedDB.open(DB_NAME, versionToOpen);

      request.onerror = (e) => {
        reject(request.error || new Error('Database opening request blocked.'));
      };

      request.onsuccess = async (e) => {
        const db = request.result;
        
        // Self-healing check: Do we have all required stores?
        const missingStores = STORES.filter(store => !db.objectStoreNames.contains(store));
        if (missingStores.length > 0) {
          logger.warn(`[STORAGE_HARDENING] Missing stores detected: ${missingStores.join(', ')}. Triggering self-healing upgrade...`);
          
          // ─── ÉTAPE 1 : Sauvegarder la queue offline ───
          const BACKUP_KEY = 'hydromines_idb_migration_backup_' + Date.now();
          try {
            const backupItems: any[] = [];
            if (db.objectStoreNames.contains('offlineQueue')) {
              await new Promise<void>((res) => {
                const tx = db.transaction('offlineQueue', 'readonly');
                const store = tx.objectStore('offlineQueue');
                const req = store.getAll();
                req.onsuccess = () => {
                  if (req.result?.length > 0) {
                    backupItems.push(...req.result);
                  }
                  res();
                };
                req.onerror = () => res();
              });
            }
            if (backupItems.length > 0) {
              localStorage.setItem(BACKUP_KEY, JSON.stringify(backupItems));
              logger.info(`[IDB Migration] ${backupItems.length} items offline sauvegardés`);
            }
          } catch (backupErr) {
            logger.warn('[IDB Migration] Backup échoué (non bloquant):', backupErr);
          }

          // ─── ÉTAPE 2 : Détruire et recréer la base ───
          db.close();
          await new Promise<void>((res, rej) => {
            const del = indexedDB.deleteDatabase(DB_NAME);
            del.onsuccess = () => res();
            del.onerror = () => rej(del.error);
          });
          const freshDb = await this.initDatabase(DB_VERSION);

          // ─── ÉTAPE 3 : Restaurer la queue offline ───
          try {
            const backupRaw = localStorage.getItem(BACKUP_KEY);
            if (backupRaw) {
              const items = JSON.parse(backupRaw);
              if (freshDb.objectStoreNames.contains('offlineQueue')) {
                const tx = freshDb.transaction('offlineQueue', 'readwrite');
                const store = tx.objectStore('offlineQueue');
                for (const item of items) {
                  store.put(item);
                }
              }
              localStorage.removeItem(BACKUP_KEY);
              logger.info(`[IDB Migration] ${items.length} items offline restaurés`);
            }
          } catch (restoreErr) {
            logger.warn('[IDB Migration] Restauration échouée:', restoreErr);
          }

          resolve(freshDb);
          return;
        }

        this.db = db;
        resolve(request.result);
      };

      request.onupgradeneeded = (e) => {
        const db = request.result;
        STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (this.isFallbackMode) {
      throw new Error('Storage is operating in Fallback LocalStorage mode.');
    }
    if (this.db) return this.db;
    return this.initDatabase();
  }

  private async verifyOrRecreateStore(storeName: string): Promise<IDBDatabase> {
    const db = await this.ensureDb();
    if (db.objectStoreNames.contains(storeName)) {
      return db;
    }

    logger.warn(`[STORAGE_HARDENING] Store '${storeName}' does not exist in current IndexedDB schema. Triggering self-healing recreation...`);
    if (!STORES.includes(storeName)) {
      STORES.push(storeName);
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const del = indexedDB.deleteDatabase(DB_NAME);
        del.onsuccess = () => resolve();
        del.onerror = () => reject(del.error || new Error('Delete database failed during self-healing.'));
        del.onblocked = () => {
          logger.warn('[STORAGE_HARDENING] Database deletion blocked by other tabs/connections.');
          resolve();
        };
      });
      const freshDb = await this.initDatabase();
      this.db = freshDb;
      return freshDb;
    } catch (err) {
      logger.warn(`[STORAGE_HARDENING_FALLBACK] Self-healing db recreation failed for store '${storeName}'.`, err);
      throw err;
    }
  }

  /**
   * Saves a collection of entities of type T into IndexedDB.
   */
  public async saveCollection<T extends { id: any }>(storeName: string, items: T[]): Promise<void> {
    const resolvedStoreName = this.resolveStoreName(storeName);
    try {
      const db = await this.verifyOrRecreateStore(resolvedStoreName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(resolvedStoreName, 'readwrite');
        const store = tx.objectStore(resolvedStoreName);

        // Clear existing items in store first to ensure clean snapshot consistency
        const clearReq = store.clear();
        clearReq.onerror = () => reject(clearReq.error);

        clearReq.onsuccess = () => {
          let errorOccured = false;
          items.forEach((item) => {
            const req = store.put(item);
            req.onerror = () => {
              errorOccured = true;
              logger.error(`[STORAGE_HARDENING] Error putting item into store ${resolvedStoreName}:`, req.error);
            };
          });

          tx.oncomplete = () => {
            if (errorOccured) {
              logger.warn(`[STORAGE_HARDENING] Some items were discarded in store ${resolvedStoreName}.`);
            }
            // Keep a tiny quick reference / small cache in localStorage for instant boots
            this.updateLocalStorageCache(resolvedStoreName, items.slice(0, 50));
            resolve();
          };

          tx.onerror = () => {
            reject(tx.error || new Error('Transaction aborted.'));
          };
        };
      });
    } catch (err) {
      this.isFallbackMode = true; // Downgrade to fallback
      logger.warn(`[STORAGE_HARDENING_FALLBACK] IndexedDB write failed for '${resolvedStoreName}'. Writing completely to LocalStorage.`, err);
      try {
        localStorage.setItem(`hydromines_cache_${resolvedStoreName}`, JSON.stringify(items));
      } catch (storageErr) {
        logger.error('[STORAGE_HARDENING] LocalStorage write fallback failed:', storageErr);
      }
    }
  }

  /**
   * Saves a single item into IndexedDB.
   */
  public async saveItem<T extends { id: any }>(storeName: string, item: T): Promise<void> {
    const resolvedStoreName = this.resolveStoreName(storeName);
    try {
      const db = await this.verifyOrRecreateStore(resolvedStoreName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(resolvedStoreName, 'readwrite');
        const store = tx.objectStore(resolvedStoreName);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error(`Failed to save item to ${resolvedStoreName}.`));
      });
    } catch (err) {
      logger.warn(`[STORAGE_HARDENING_FALLBACK] IndexedDB saveItem failed for '${resolvedStoreName}'.`, err);
      // LocalStorage fallback for single item
      try {
        const current = this.readLocalStorageCache<T>(resolvedStoreName) || [];
        const filtered = current.filter((x: any) => x.id !== item.id);
        filtered.push(item);
        this.updateLocalStorageCache(resolvedStoreName, filtered);
      } catch (storageErr) {
        logger.error('[STORAGE_HARDENING] LocalStorage saveItem fallback failed:', storageErr);
      }
    }
  }

  /**
   * Deletes a single item from IndexedDB by ID.
   */
  public async deleteItem(storeName: string, id: any): Promise<void> {
    const resolvedStoreName = this.resolveStoreName(storeName);
    try {
      const db = await this.verifyOrRecreateStore(resolvedStoreName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(resolvedStoreName, 'readwrite');
        const store = tx.objectStore(resolvedStoreName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error(`Failed to delete item from ${resolvedStoreName}.`));
      });
    } catch (err) {
      logger.warn(`[STORAGE_HARDENING_FALLBACK] IndexedDB deleteItem failed for '${resolvedStoreName}'.`, err);
      try {
        const current = this.readLocalStorageCache<any>(resolvedStoreName) || [];
        const filtered = current.filter((x: any) => x.id !== id);
        this.updateLocalStorageCache(resolvedStoreName, filtered);
      } catch (storageErr) {
        logger.error('[STORAGE_HARDENING] LocalStorage deleteItem fallback failed:', storageErr);
      }
    }
  }

  /**
   * Retrieves a full collection from IndexedDB, falling back to LocalStorage if needed.
   */
  public async getCollection<T>(storeName: string): Promise<T[]> {
    const resolvedStoreName = this.resolveStoreName(storeName);
    try {
      const db = await this.verifyOrRecreateStore(resolvedStoreName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(resolvedStoreName, 'readonly');
        const store = tx.objectStore(resolvedStoreName);
        const req = store.getAll();

        req.onsuccess = () => {
          const result = req.result as T[];
          if (result && result.length > 0) {
            resolve(result);
          } else {
            // Check if there is cache in localStorage as backfill (unmigrated)
            const fallback = this.readLocalStorageCache<T>(resolvedStoreName);
            resolve(fallback);
          }
        };

        req.onerror = () => {
          reject(req.error || new Error(`Failed to getAll elements from ${resolvedStoreName}.`));
        };
      });
    } catch (err) {
      logger.info(`[STORAGE_HARDENING_FALLBACK] IndexedDB read failed or inactive for '${resolvedStoreName}'. Responding with LocalStorage backup.`, err);
      return this.readLocalStorageCache<T>(resolvedStoreName);
    }
  }

  private updateLocalStorageCache<T>(storeName: string, items: T[]): void {
    try {
      // Keep only small caches (first 40 items) to guard quota space
      localStorage.setItem(`hydromines_cache_${storeName}_small`, JSON.stringify(items.slice(0, 40)));
    } catch (err) {
      logger.warn('[STORAGE_HARDENING] LocalStorage tiny cache update failed:', err);
    }
  }

  private readLocalStorageCache<T>(storeName: string): T[] {
    try {
      const rawSmall = localStorage.getItem(`hydromines_cache_${storeName}_small`);
      if (rawSmall) return JSON.parse(rawSmall);

      // If no small cache, try old full cached keys
      const rawFull = localStorage.getItem(`hydromines_cache_${storeName}`);
      return rawFull ? JSON.parse(rawFull) : [];
    } catch (_) {
      return [];
    }
  }
}

export const IndexedDBStorage = new IndexedDBStorageClass();
