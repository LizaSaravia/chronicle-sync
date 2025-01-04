export class SyncManager {
  constructor(historyManager) {
    this.history = historyManager;
    this.syncInterval = null;
  }

  async startSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    await this.history.syncHistory();

    // Set up periodic sync
    this.syncInterval = setInterval(
      () => this.history.syncHistory(),
      intervalMinutes * 60 * 1000
    );
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async forceSync() {
    await this.history.syncHistory();
  }
}