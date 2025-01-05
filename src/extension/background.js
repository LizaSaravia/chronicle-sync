import { ApiClient } from './utils/api.js';
import { CryptoManager } from './utils/crypto.js';
import { HistoryManager } from './utils/history.js';
import { StorageManager } from './utils/storage.js';
import { SyncManager } from './utils/sync.js';

const VERSION = '1.0.0';
let syncManager = null;

// Initialize sync with password
async function initializeSync(password) {
  try {
    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const crypto = new CryptoManager(password);
    const storage = new StorageManager(crypto);
    const api = new ApiClient(process.env.NODE_ENV === 'production' ? 'production' : 'staging');
    const history = new HistoryManager(storage, api);
    
    // Test crypto initialization
    await crypto.test();
    
    // Create sync manager
    syncManager = new SyncManager(history);
    
    // Initialize history manager (create/join sync group)
    await history.initialize();
    
    // Start periodic sync
    await syncManager.startSync();
    
    // Store initialization status
    await storage.saveLocal('initialized', true);
    
    console.log('Chronicle Sync initialized successfully');
  } catch (error) {
    console.error('Initialization failed:', error);
    // Clean up any partial initialization
    syncManager = null;
    await chrome.storage.local.remove('initialized');
    throw error;
  }
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