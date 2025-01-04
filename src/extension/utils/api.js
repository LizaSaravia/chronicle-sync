const API_BASE = {
  staging: 'https://chronicle-sync-staging.workers.dev',
  production: 'https://chronicle-sync.workers.dev'
};

export class ApiClient {
  constructor(environment = 'production') {
    this.baseUrl = API_BASE[environment];
  }

  async createSyncGroup(deviceId) {
    const response = await fetch(`${this.baseUrl}/api/create-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });

    if (!response.ok) {
      throw new Error(`Failed to create sync group: ${response.statusText}`);
    }

    return await response.json();
  }

  async syncData(groupId, deviceId, data) {
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
  }

  async getUpdates(groupId, deviceId, since) {
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
  }
}