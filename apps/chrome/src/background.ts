/// <reference types="chrome"/>

import { SyncManager, type SyncData } from '@chronicle-sync/sync';

let syncManager: SyncManager | null = null;

// Store history items locally
const historyItems = new Map<string, chrome.history.HistoryItem>();

function initSyncManager(password: string) {
  if (syncManager) {
    syncManager.disconnect();
  }

  syncManager = new SyncManager({
    password,
    serverUrl: 'wss://sync.chronicle-sync.dev',
    onSync: (data: SyncData) => {
      const historyItem = data.data as chrome.history.HistoryItem;
      if (historyItem.url && !historyItems.has(historyItem.url)) {
        historyItems.set(historyItem.url, historyItem);
        chrome.history.addUrl({
          url: historyItem.url
        });
      }
    }
  });
}

chrome.storage.local.get(['syncPassword'], (result) => {
  if (result.syncPassword) {
    initSyncManager(result.syncPassword);
  }
});

// Listen for history updates
chrome.history.onVisited.addListener((result) => {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_DATA' && message.id && message.data) {
    if (!syncManager) {
      sendResponse({ error: 'Sync not configured. Please set password.' });
      return;
    }

    const syncData: SyncData = {
      id: message.id,
      data: message.data,
      timestamp: Date.now()
    };

    syncManager.sync(syncData)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ error: error.message }));

    return true; // Will respond asynchronously
  }

  if (message.type === 'SET_SYNC_PASSWORD' && message.password) {
    initSyncManager(message.password);
    chrome.storage.local.set({ syncPassword: message.password }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SYNC_OFFLINE_QUEUE') {
    if (!syncManager) {
      sendResponse({ error: 'Sync not configured. Please set password.' });
      return;
    }

    syncManager.syncOfflineQueue()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
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
