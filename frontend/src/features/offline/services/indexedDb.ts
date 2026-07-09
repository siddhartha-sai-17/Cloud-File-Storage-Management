const DB_NAME = 'CloudEnterpriseOffline';
const DB_VERSION = 1;

export class OfflineDb {
  private db: IDBDatabase | null = null;

  private initDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Favorites store
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'id' });
        }
        
        // Recent files store
        if (!db.objectStoreNames.contains('recent')) {
          db.createObjectStore('recent', { keyPath: 'id' });
        }

        // Workspaces metadata store
        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', { keyPath: 'id' });
        }

        // Search history store
        if (!db.objectStoreNames.contains('searchHistory')) {
          db.createObjectStore('searchHistory', { keyPath: 'query' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.initDb();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic Save items list helper
  public async saveAll<T>(storeName: string, items: T[]): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      
      // Clear existing records
      store.clear();
      
      // Insert new records
      items.forEach((item) => {
        store.put(item);
      });
    } catch (err) {
      console.error(`Failed to cache ${storeName} to IndexedDB`, err);
    }
  }

  // Generic Get items list helper
  public async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const store = await this.getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  // Search History custom additions
  public async addSearchQuery(query: string): Promise<void> {
    try {
      const store = await this.getStore('searchHistory', 'readwrite');
      store.put({ query, timestamp: new Date().toISOString() });
    } catch {
      // Fail silently
    }
  }
}

export const offlineDb = new OfflineDb();
export default offlineDb;
