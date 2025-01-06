const API_BASE = {
  staging: 'https://api-staging.chroniclesync.xyz',
  production: 'https://api.chroniclesync.xyz'
};

export class ApiClient {
  constructor(environment = process.env.NODE_ENV === 'development' ? 'staging' : 'production', customApiUrl = null) {
    this.baseUrl = environment === 'custom' ? customApiUrl : API_BASE[environment];
    this.setupOfflineDetection();
  }

  setupOfflineDetection() {
    // Use globalThis to work in both window and service worker contexts
    const context = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis;
    
    // Default to online if we can't detect
    this.isOnline = context.navigator?.onLine ?? true;
    
    if (typeof context.addEventListener === 'function') {
      context.addEventListener('online', () => {
        console.log('Network is online');
        this.isOnline = true;
        this.onOnline?.();
      });
      context.addEventListener('offline', () => {
        console.log('Network is offline');
        this.isOnline = false;
      });
    }
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
      if (!this.isOnline || error.message.includes('Failed to fetch')) {
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
      if (!this.isOnline || error.message.includes('Failed to fetch')) {
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
      if (!this.isOnline || error.message.includes('Failed to fetch')) {
        throw new Error('Offline: Cannot get updates');
      }
      throw error;
    }
  }
}