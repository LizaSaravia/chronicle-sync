export class HistoryManager {
  constructor(storageManager, apiClient) {
    this.storage = storageManager;
    this.api = apiClient;
    this.syncInProgress = false;
  }

  async initialize() {
    // Get or generate device ID
    let deviceId = await this.storage.getLocal('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await this.storage.saveLocal('deviceId', deviceId);
    }

    // Get or create sync group
    let groupId = await this.storage.getLocal('groupId');
    if (!groupId) {
      const { groupId: newGroupId } = await this.api.createSyncGroup(deviceId);
      groupId = newGroupId;
      await this.storage.saveLocal('groupId', groupId);
    }

    this.deviceId = deviceId;
    this.groupId = groupId;
  }

  async getLocalHistory(startTime = null, maxResults = 100) {
    const query = {
      text: '',
      maxResults,
      startTime: startTime || (Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days by default
    };
    return await chrome.history.search(query);
  }

  async syncHistory() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      if (!this.deviceId || !this.groupId) {
        await this.initialize();
      }

      // Get last sync time
      const lastSync = await this.storage.getLocal('lastHistorySync') || 0;

      // Get new history items since last sync
      const newHistory = await this.getLocalHistory(lastSync);
      
      if (newHistory.length > 0) {
        // Encrypt and sync new history items
        const encryptedHistory = newHistory.map(item => ({
          ...item,
          title: await this.storage.crypto.encrypt(item.title),
          url: await this.storage.crypto.encrypt(item.url)
        }));

        await this.api.syncData(this.groupId, this.deviceId, encryptedHistory);
      }

      // Get updates from other devices
      const { updates } = await this.api.getUpdates(
        this.groupId,
        this.deviceId,
        lastSync
      );

      // Decrypt and merge updates
      const decryptedUpdates = await Promise.all(
        updates.map(async item => ({
          ...item,
          title: await this.storage.crypto.decrypt(item.title),
          url: await this.storage.crypto.decrypt(item.url)
        }))
      );

      // Get existing history and merge
      const existingHistory = await this.storage.getLocal('browserHistory') || [];
      const merged = this.mergeHistory(existingHistory, decryptedUpdates);

      // Save merged history locally
      await this.storage.saveLocal('browserHistory', merged);
      await this.storage.saveLocal('lastHistorySync', Date.now());
    } catch (error) {
      console.error('History sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  mergeHistory(existing, newItems) {
    const urlMap = new Map();
    
    // Index existing items by URL
    existing.forEach(item => {
      urlMap.set(item.url, item);
    });

    // Merge or add new items
    newItems.forEach(item => {
      const existingItem = urlMap.get(item.url);
      if (!existingItem || existingItem.lastVisitTime < item.lastVisitTime) {
        urlMap.set(item.url, item);
      }
    });

    // Convert back to array and sort by last visit time
    return Array.from(urlMap.values())
      .sort((a, b) => b.lastVisitTime - a.lastVisitTime);
  }

  async getDeviceHistory() {
    return await this.storage.getLocal('browserHistory') || [];
  }
}