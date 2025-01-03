
import browser from 'webextension-polyfill';
import { SyncManager, type SyncData } from '@chronicle-sync/sync';

let syncManager: SyncManager | null = null;

// Store history items locally
const historyItems = new Map<string, browser.History.HistoryItem>();

interface StorageResult {
  syncPassword?: string;
}

function initSyncManager(password: string) {
  if (syncManager) {
    syncManager.disconnect();
  }

  syncManager = new SyncManager({
    password,
    serverUrl: 'wss://sync.chronicle-sync.dev',
    onSync: (data: SyncData) => {
      const historyItem = data.data as browser.History.HistoryItem;
      if (historyItem.url && !historyItems.has(historyItem.url)) {
        historyItems.set(historyItem.url, historyItem);
        browser.history.addUrl({
          url: historyItem.url
        });
      }
    }
  });
}

browser.storage.local.get(['syncPassword']).then((result: StorageResult) => {
  if (result.syncPassword) {
    initSyncManager(result.syncPassword);
  }
});

// Listen for history updates
browser.history.onVisited.addListener((result) => {
  if (!syncManager) return;

  const historyItem = {
    id: result.id,
    url: result.url,
    title: result.title,
    lastVisitTime: result.lastVisitTime,
    visitCount: result.visitCount
  };

  // Only sync if we haven't seen this URL before
  if (result.url && !historyItems.has(result.url)) {
    historyItems.set(result.url, historyItem);
    const syncData: SyncData = {
      id: `local-${Date.now()}`,
      data: historyItem,
      timestamp: Date.now()
    };
    syncManager.sync(syncData).catch(console.error);
  }
});

interface SyncMessage {
  type: 'SYNC_DATA' | 'SET_SYNC_PASSWORD' | 'SYNC_OFFLINE_QUEUE';
  id?: string;
  data?: unknown;
  password?: string;
}

browser.runtime.onMessage.addListener((message: SyncMessage, _sender, _sendResponse) => {
  if (message.type === 'SYNC_DATA' && message.id && message.data) {
    if (!syncManager) {
      return Promise.resolve({ error: 'Sync not configured. Please set password.' });
    }

    const syncData: SyncData = {
      id: message.id,
      data: message.data,
      timestamp: Date.now()
    };

    return syncManager.sync(syncData)
      .then(() => ({ success: true }))
      .catch((error) => ({ error: error.message }));
  }

  if (message.type === 'SET_SYNC_PASSWORD' && message.password) {
    initSyncManager(message.password);
    return browser.storage.local.set({ syncPassword: message.password })
      .then(() => ({ success: true }));
  }

  if (message.type === 'SYNC_OFFLINE_QUEUE') {
    if (!syncManager) {
      return Promise.resolve({ error: 'Sync not configured. Please set password.' });
    }

    return syncManager.syncOfflineQueue()
      .then(() => ({ success: true }))
      .catch((error) => ({ error: error.message }));
  }

  return Promise.resolve(undefined);
});

browser.runtime.onInstalled.addListener(() => {
  console.log('Chronicle Sync extension installed');
});

// Try to sync offline queue periodically
setInterval(() => {
  if (syncManager) {
    syncManager.syncOfflineQueue().catch(() => {
      // Ignore errors during background sync
    });
  }
}, 5 * 60 * 1000); // Every 5 minutes