export class SyncManager {
  constructor(historyManager) {
    this.history = historyManager;
    this.syncInterval = null;
    this.retryTimeout = null;
    this.intervalMinutes = 5;
    this.setupOnlineListener();
  }

  setupOnlineListener() {
    // Set up callback for when we come back online
    this.history.api.setOnlineCallback(() => {
      console.log('Back online, attempting sync');
      this.onBackOnline();
    });
  }

  async onBackOnline() {
    try {
      // Clear any existing retry timeout
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }

      // Try to sync
      await this.history.syncHistory();

      // If successful, restart normal sync interval
      this.restartSyncInterval();
    } catch (error) {
      console.error('Failed to sync after coming back online:', error);
      // Schedule a retry
      this.scheduleRetry();
    }
  }

  scheduleRetry(delayMinutes = 1) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.onBackOnline();
    }, delayMinutes * 60 * 1000);
  }

  restartSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.history.syncHistory().catch(error => {
        console.error('Periodic sync failed:', error);
        if (error.message.includes('Offline')) {
          // Don't retry - we'll sync when we're back online
          if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
          }
        }
      });
    }, this.intervalMinutes * 60 * 1000);
  }

  async startSync(intervalMinutes = 5) {
    this.intervalMinutes = intervalMinutes;

    try {
      // Initial sync
      await this.history.syncHistory();
      
      // Set up periodic sync
      this.restartSyncInterval();
    } catch (error) {
      console.error('Failed to start sync:', error);
      if (error.message.includes('Offline')) {
        // We'll sync when we're back online
        console.log('Offline, waiting for connection');
      } else {
        // Schedule a retry for other errors
        this.scheduleRetry();
      }
    }
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  async forceSync() {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    try {
      await this.history.syncHistory();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error; // Propagate error to UI
    }
  }
}