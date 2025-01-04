import { CryptoManager } from './utils/crypto';
import { StorageManager } from './utils/storage';
import { HistoryManager } from './utils/history';
import { SyncManager } from './utils/sync';

const VERSION = '1.0.0';
let syncManager = null;

// Initialize sync with password
async function initializeSync(password) {
  const crypto = new CryptoManager(password);
  const storage = new StorageManager(crypto);
  const history = new HistoryManager(storage);
  syncManager = new SyncManager(history);
  
  await syncManager.startSync();
  
  // Store initialization status
  await storage.saveLocal('initialized', true);
}

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(async () => {
  console.log(`Chronicle Sync ${VERSION} installed`);
  
  // Check if already initialized
  const storage = await chrome.storage.local.get('initialized');
  if (!storage.initialized) {
    // Extension needs setup - this will trigger the popup
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INITIALIZE') {
    initializeSync(message.password)
      .then(() => {
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Initialization failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'GET_HISTORY') {
    if (!syncManager) {
      sendResponse({ success: false, error: 'Sync not initialized' });
      return;
    }
    
    syncManager.history.getDeviceHistory()
      .then(history => sendResponse({ success: true, history }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'FORCE_SYNC') {
    if (!syncManager) {
      sendResponse({ success: false, error: 'Sync not initialized' });
      return;
    }
    
    syncManager.forceSync()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});