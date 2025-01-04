const API_BASE = {
  staging: 'https://chronicle-sync-staging.workers.dev',
  production: 'https://chronicle-sync.workers.dev'
};

export class ApiClient {
  constructor(environment = 'production') {
    this.baseUrl = API_BASE[environment];
    this.setupOfflineDetection();
  }

  setupOfflineDetection() {
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => {
      console.log('Network is online');
      this.isOnline = true;
      this.onOnline?.();
    });
    window.addEventListener('offline', () => {
      console.log('Network is offline');
      this.isOnline = false;
    });
  }

  setOnlineCallback(callback) {
    this.onOnline = callback;
  }

  async createSyncGroup(deviceId) {
    if (!this.isOnline) {
      throw new Error('Offline: Cannot create sync group');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/create-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) {
        throw new Error(`Failed to create sync group: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!navigator.onLine || error.message.includes('Failed to fetch')) {
        throw new Error('Offline: Cannot create sync group');
      }
      throw error;
    }
  }

  async syncData(groupId, deviceId, data) {
    if (!this.isOnline) {
      throw new Error('Offline: Cannot sync data');
    }

    try {
      const timestamp = Date.now();
      const response = await fetch(`${this.baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          deviceId,
          data,
          timestamp
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!navigator.onLine || error.message.includes('Failed to fetch')) {
        throw new Error('Offline: Cannot sync data');
      }
      throw error;
    }
  }

  async getUpdates(groupId, deviceId, since) {
    if (!this.isOnline) {
      throw new Error('Offline: Cannot get updates');
    }

    try {
      const params = new URLSearchParams({
        groupId,
        deviceId,
        since: since.toString()
      });

      const response = await fetch(
        `${this.baseUrl}/api/get-updates?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get updates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!navigator.onLine || error.message.includes('Failed to fetch')) {
        throw new Error('Offline: Cannot get updates');
      }
      throw error;
    }
  }
}