/**
 * HydroMines Storage Hardening Engine v2.0 (SRE Runtime Enforcement)
 * Encapsulates safe, multi-store IndexedDB operations with automated localStorage fallbacks.
 */

const DB_NAME = 'hydromines_secure_warehouse_v9';
const DB_VERSION = 5;
const STORES = [
  'articles', 'catalog', 'mouvements', 'maintenanceLogs', 'transferts', 
  'agents', 'engins', 'perfos', 'hydromines_catalog',
  'inventaires', 'auditLogs', 'notifications', 'distributions', 
  'purchaseRequests', 'anomalyReports', 'offlineQueue'
];

class IndexedDBStorageClass {
  private db: IDBDatabase | null = null;
  private isFallbackMode = false;

  constructor() {
    this.initDatabase().catch((err) => {
      console.warn('[STORAGE_HARDENING] IndexedDB initialization failed. LocalStorage fallback active.', err);
      this.isFallbackMode = true;
    });
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
          console.warn(`[STORAGE_HARDENING] Missing stores detected: ${missingStores.join(', ')}. Triggering self-healing upgrade...`);
          
          // ÉTAPE 1 : Sauvegarder la queue offline avant destruction
          const BACKUP_KEY = 'hydromines_idb_migration_backup_' + Date.now();
          try {
            // Lire les items offline depuis l'ancienne base
            const backupItems: any[] = [];
            const stores = ['offlineQueue'];
            for (const storeName of stores) {
              if (db.objectStoreNames.contains(storeName)) {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.getAll();
                await new Promise<void>((res) => {
                  request.onsuccess = () => {
                    if (request.result && request.result.length > 0) {
                      backupItems.push(...request.result.map((item: any) => ({
                        ...item,
                        _backupStore: storeName
                      })));
                    }
                    res();
                  };
                  request.onerror = () => res(); // Ne pas bloquer si erreur
                });
              }
            }
            if (backupItems.length > 0) {
              localStorage.setItem(BACKUP_KEY, JSON.stringify(backupItems));
              console.info(
                `[IDB Migration] Sauvegardé ${backupItems.length} items offline avant migration`
              );
            }
          } catch (backupErr) {
            console.warn('[IDB Migration] Backup échoué (non bloquant) :', backupErr);
          }

          // ÉTAPE 2 : Détruire et recréer la base
          db.close();
          await new Promise<void>((res, rej) => {
            const del = indexedDB.deleteDatabase(DB_NAME);
            del.onsuccess = () => res();
            del.onerror = () => rej(del.error);
          });

          const freshDb = await this.initDatabase(DB_VERSION);

          // ÉTAPE 3 : Restaurer la queue offline depuis le backup
          try {
            const backupRaw = localStorage.getItem(BACKUP_KEY);
            if (backupRaw) {
              const backupItems = JSON.parse(backupRaw);
              for (const item of backupItems) {
                const storeName = item._backupStore;
                delete item._backupStore;
                if (freshDb.objectStoreNames.contains(storeName)) {
                  const tx = freshDb.transaction(storeName, 'readwrite');
                  const store = tx.objectStore(storeName);
                  store.add(item);
                }
              }
              localStorage.removeItem(BACKUP_KEY); // Nettoyer après restauration
              console.info(
                `[IDB Migration] Restauré ${backupItems.length} items offline après migration`
              );
            }
          } catch (restoreErr) {
            console.warn('[IDB Migration] Restauration échouée :', restoreErr);
            // Ne pas bloquer — les items seront perdus mais l'app reste fonctionnelle
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

  /**
   * Saves a collection of entities of type T into IndexedDB.
   */
  public async saveCollection<T extends { id: any }>(storeName: string, items: T[]): Promise<void> {
    try {
      const db = await this.ensureDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        // Clear existing items in store first to ensure clean snapshot consistency
        const clearReq = store.clear();
        clearReq.onerror = () => reject(clearReq.error);

        clearReq.onsuccess = () => {
          let errorOccured = false;
          items.forEach((item) => {
            const req = store.put(item);
            req.onerror = () => {
              errorOccured = true;
              console.error(`[STORAGE_HARDENING] Error putting item into store ${storeName}:`, req.error);
            };
          });

          tx.oncomplete = () => {
            if (errorOccured) {
              console.warn(`[STORAGE_HARDENING] Some items were discarded in store ${storeName}.`);
            }
            // Keep a tiny quick reference / small cache in localStorage for instant boots
            this.updateLocalStorageCache(storeName, items.slice(0, 50));
            resolve();
          };

          tx.onerror = () => {
            reject(tx.error || new Error('Transaction aborted.'));
          };
        };
      });
    } catch (err) {
      this.isFallbackMode = true; // Downgrade to fallback
      console.warn(`[STORAGE_HARDENING_FALLBACK] IndexedDB write failed for '${storeName}'. Writing completely to LocalStorage.`, err);
      localStorage.setItem(`hydromines_cache_${storeName}`, JSON.stringify(items));
    }
  }

  /**
   * Saves a single item into IndexedDB.
   */
  public async saveItem<T extends { id: any }>(storeName: string, item: T): Promise<void> {
    try {
      const db = await this.ensureDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error(`Failed to save item to ${storeName}.`));
      });
    } catch (err) {
      console.warn(`[STORAGE_HARDENING_FALLBACK] IndexedDB saveItem failed for '${storeName}'.`, err);
      throw err;
    }
  }

  /**
   * Deletes a single item from IndexedDB by ID.
   */
  public async deleteItem(storeName: string, id: any): Promise<void> {
    try {
      const db = await this.ensureDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error(`Failed to delete item from ${storeName}.`));
      });
    } catch (err) {
      console.warn(`[STORAGE_HARDENING_FALLBACK] IndexedDB deleteItem failed for '${storeName}'.`, err);
      throw err;
    }
  }

  /**
   * Retrieves a full collection from IndexedDB, falling back to LocalStorage if needed.
   */
  public async getCollection<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.ensureDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          const result = req.result as T[];
          if (result && result.length > 0) {
            resolve(result);
          } else {
            // Check if there is cache in localStorage as backfill (unmigrated)
            const fallback = this.readLocalStorageCache<T>(storeName);
            resolve(fallback);
          }
        };

        req.onerror = () => {
          reject(req.error || new Error(`Failed to getAll elements from ${storeName}.`));
        };
      });
    } catch (err) {
      console.info(`[STORAGE_HARDENING_FALLBACK] IndexedDB read failed or inactive for '${storeName}'. Responding with LocalStorage backup.`, err);
      return this.readLocalStorageCache<T>(storeName);
    }
  }

  private updateLocalStorageCache<T>(storeName: string, items: T[]): void {
    try {
      // Keep only small caches (first 40 items) to guard quota space
      localStorage.setItem(`hydromines_cache_${storeName}_small`, JSON.stringify(items.slice(0, 40)));
    } catch (err) {
      console.warn('[STORAGE_HARDENING] LocalStorage tiny cache update failed:', err);
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
