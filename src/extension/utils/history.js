export class HistoryManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.syncInProgress = false;
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
      // Get last sync time
      const lastSync = await this.storage.getLocal('lastHistorySync') || 0;

      // Get new history items since last sync
      const newHistory = await this.getLocalHistory(lastSync);
      
      // Get existing synced history
      const syncedHistory = await this.storage.getSync('browserHistory') || [];

      // Merge new items with existing ones, avoiding duplicates
      const merged = this.mergeHistory(syncedHistory, newHistory);

      // Save merged history back to sync storage
      await this.storage.saveSync('browserHistory', merged);

      // Update last sync time
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
    return await this.storage.getSync('browserHistory') || [];
  }
}