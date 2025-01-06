import { LocalDB } from './db.js';

export class HistoryManager {
  constructor(storageManager, apiClient) {
    this.storage = storageManager;
    this.api = apiClient;
    this.syncInProgress = false;
    this.db = new LocalDB();
    this.setupHistoryListener();
  }

  async initialize() {
    await this.db.init();

    // Get or generate device ID
    let deviceId = await this.db.getSyncMeta('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await this.db.setSyncMeta('deviceId', deviceId);
    }

    // Get or create sync group (only if online)
    let groupId = await this.db.getSyncMeta('groupId');
    if (!groupId && navigator.onLine) {
      try {
        const { groupId: newGroupId } = await this.api.createSyncGroup(deviceId);
        groupId = newGroupId;
        await this.db.setSyncMeta('groupId', groupId);
        // Save to chrome.storage.local for the options page
        await chrome.storage.local.set({ groupId });
      } catch (error) {
        console.warn('Failed to create sync group, will retry later:', error);
      }
    }

    this.deviceId = deviceId;
    this.groupId = groupId;

    // Initial history load
    await this.loadInitialHistory();
  }

  setupHistoryListener() {
    chrome.history.onVisited.addListener(async (historyItem) => {
      // Get the full history item with title
      const [fullItem] = await this.getLocalHistory(historyItem.lastVisitTime, 1, historyItem.url);
      if (fullItem) {
        // Add title from history item if available
        const item = {
          ...fullItem,
          title: fullItem.title || historyItem.title || 'Untitled',
          lastVisitTime: historyItem.lastVisitTime || Date.now()
        };
        await this.db.addHistory([item]);
      } else {
        // Add with default title
        const item = {
          ...historyItem,
          title: historyItem.title || 'Untitled',
          lastVisitTime: historyItem.lastVisitTime || Date.now()
        };
        await this.db.addHistory([item]);
      }
      this.attemptSync();
    });
  }

  async getLocalHistory(startTime = null, maxResults = 1000, url = '') {
    const query = {
      text: url,
      maxResults,
      startTime: startTime || (Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days by default
    };
    try {
      const items = await chrome.history.search(query);
      // Handle case where search fails or returns no results
      if (!items || !Array.isArray(items)) {
        console.warn('History search returned invalid result:', items);
        return [];
      }
      // Add titles if they're missing
      return items.map(item => ({
        ...item,
        title: item.title || url.split('/').pop() || 'Untitled'
      }));
    } catch (error) {
      console.error('Failed to search history:', error);
      return [];
    }
  }

  async loadInitialHistory() {
    const lastLoad = await this.db.getSyncMeta('lastHistoryLoad') || 0;
    const newHistory = await this.getLocalHistory(lastLoad);
    
    if (newHistory.length > 0) {
      await this.db.addHistory(newHistory);
      await this.db.setSyncMeta('lastHistoryLoad', Date.now());
    }
  }


  async attemptSync() {
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    if (!this.groupId) {
      console.log('No sync group, skipping sync');
      return;
    }

    this.syncHistory().catch(error => {
      console.error('Background sync failed:', error);
    });
  }

  async syncHistory() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      if (!this.deviceId || !this.groupId) {
        await this.initialize();
        if (!this.groupId) return; // Still no group ID, probably offline
      }

      // Get last sync time
      const lastSync = await this.db.getSyncMeta('lastSync') || 0;

      // Get unsynced items
      const unsynced = await this.db.getUnsyncedHistory();
      
      if (unsynced.length > 0) {
        // Encrypt history items
        const encryptedHistory = await Promise.all(
          unsynced.map(async item => ({
            ...item,
            title: await this.storage.crypto.encrypt(item.title || ''),
            url: await this.storage.crypto.encrypt(item.url)
          }))
        );

        // Sync to server
        await this.api.syncData(this.groupId, this.deviceId, encryptedHistory);
        
        // Mark as synced
        await this.db.markAsSynced(unsynced.map(item => item.id));
      }

      // Get updates from other devices
      const { updates } = await this.api.getUpdates(
        this.groupId,
        this.deviceId,
        lastSync
      );

      if (updates.length > 0) {
        // Decrypt updates
        const decryptedUpdates = await Promise.all(
          updates.map(async item => ({
            ...item,
            title: await this.storage.crypto.decrypt(item.title),
            url: await this.storage.crypto.decrypt(item.url),
            syncStatus: 'synced'
          }))
        );

        // Merge with local history
        await this.mergeRemoteHistory(decryptedUpdates);
      }

      // Update last sync time
      await this.db.setSyncMeta('lastSync', Date.now());
    } catch (error) {
      console.error('History sync failed:', error);
      // Don't rethrow - we want to keep running even if sync fails
    } finally {
      this.syncInProgress = false;
    }
  }

  async mergeRemoteHistory(remoteItems) {
    // Get all local history
    const localHistory = await this.db.getAllHistory();
    const urlMap = new Map();
    
    // Index local items
    localHistory.forEach(item => {
      urlMap.set(item.url, item);
    });

    // Find new or updated items
    const toAdd = remoteItems.filter(item => {
      const local = urlMap.get(item.url);
      return !local || local.lastVisitTime < item.lastVisitTime;
    });

    if (toAdd.length > 0) {
      await this.db.addHistory(toAdd);
    }
  }

  async getDeviceHistory() {
    return await this.db.getAllHistory();
  }
}