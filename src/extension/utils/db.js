export class LocalDB {
  constructor() {
    this.dbName = 'chronicle-sync';
    this.version = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // History store with URL index
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('url', 'url', { unique: false });
          historyStore.createIndex('lastVisitTime', 'lastVisitTime', { unique: false });
          historyStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      };
    });
  }

  async addHistory(items) {
    const db = await this.init();
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');

    const promises = items.map(item => new Promise((resolve, reject) => {
      // Add syncStatus field to track sync state
      const request = store.add({
        ...item,
        syncStatus: 'pending'
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));

    await Promise.all([...promises, new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    })]);
  }

  async getUnsyncedHistory() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(ids) {
    const db = await this.init();
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');

    const promises = ids.map(id => new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result;
        item.syncStatus = 'synced';
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      request.onerror = () => reject(request.error);
    }));

    await Promise.all([...promises, new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    })]);
  }

  async getHistorySince(timestamp) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const index = store.index('lastVisitTime');
      const request = index.getAll(IDBKeyRange.lowerBound(timestamp));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllHistory() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setSyncMeta(key, value) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncMeta', 'readwrite');
      const store = tx.objectStore('syncMeta');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncMeta(key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncMeta', 'readonly');
      const store = tx.objectStore('syncMeta');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }
}