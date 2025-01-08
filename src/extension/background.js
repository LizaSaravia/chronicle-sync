// Import logger statically since it's needed immediately
import { Logger } from './utils/logger.js';
import { VERSION } from './utils/version.js';

// Use dynamic imports for service worker compatibility
let ApiClient, CryptoManager, HistoryManager, StorageManager, SyncManager;

async function importDependencies() {
  const api = await import('./utils/api.js');
  const crypto = await import('./utils/crypto.js');
  const history = await import('./utils/history.js');
  const storage = await import('./utils/storage.js');
  const sync = await import('./utils/sync.js');

  ApiClient = api.ApiClient;
  CryptoManager = crypto.CryptoManager;
  HistoryManager = history.HistoryManager;
  StorageManager = storage.StorageManager;
  SyncManager = sync.SyncManager;
}

// Create logger instance
const log = new Logger('Background');
let syncManager = null;

// Initialize sync with password
async function initializeSync(password, environment = 'production', customApiUrl = null) {
  await importDependencies();
  log.info('Starting initialization', { environment });
  
  try {
    if (!password || typeof password !== 'string' || password.length < 8) {
      log.error('Invalid password', { passwordLength: password?.length });
      throw new Error('Password must be at least 8 characters long');
    }

    log.debug('Creating managers');
    const crypto = new CryptoManager(password);
    const storage = new StorageManager(crypto);
    const api = new ApiClient(environment, customApiUrl);
    const history = new HistoryManager(storage, api);
    
    // Test crypto initialization
    log.debug('Testing crypto initialization');
    await crypto.test();
    log.info('Crypto test successful');
    
    // Create sync manager
    log.debug('Creating sync manager');
    syncManager = new SyncManager(history);
    
    // Initialize history manager (create/join sync group)
    log.debug('Initializing history manager');
    await history.initialize();
    log.info('History manager initialized');
    
    // Start periodic sync
    log.debug('Starting periodic sync');
    await syncManager.startSync();
    log.info('Periodic sync started');
    
    // Store initialization status
    log.debug('Saving initialization status');
    await storage.saveLocal('initialized', true);
    
    log.info('Chronicle Sync initialized successfully');
  } catch (error) {
    log.error('Initialization failed', { 
      error: error.message,
      stack: error.stack,
      environment,
      customApiUrl 
    });
    // Clean up any partial initialization
    syncManager = null;
    await chrome.storage.local.remove('initialized');
    throw error;
  }
}

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(async () => {
  log.info(`Chronicle Sync ${VERSION} installed`, { version: VERSION });
  
  // Check if already initialized
  const storage = await chrome.storage.local.get('initialized');
  log.debug('Checking initialization status', { initialized: storage.initialized });
  
  if (!storage.initialized) {
    log.info('Extension needs setup, showing badge');
    // Extension needs setup - this will trigger the popup
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    log.info('Extension already initialized');
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log.debug('Message received', { type: message.type, sender: sender.id });

  if (message.type === 'INITIALIZE') {
    log.info('Initializing extension', { environment: message.environment });
    initializeSync(message.password, message.environment, message.customApiUrl)
      .then(() => {
        log.info('Initialization successful, clearing badge');
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      })
      .catch(error => {
        log.error('Initialization failed in message handler', { 
          error: error.message,
          stack: error.stack 
        });
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'GET_HISTORY') {
    if (!syncManager) {
      log.warn('History request failed - sync not initialized');
      sendResponse({ success: false, error: 'Sync not initialized' });
      return;
    }
    
    log.debug('Getting device history');
    syncManager.history.getDeviceHistory()
      .then(history => {
        log.debug('Got device history', { entryCount: history.length });
        sendResponse({ success: true, history });
      })
      .catch(error => {
        log.error('Failed to get history', { error: error.message });
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'FORCE_SYNC') {
    if (!syncManager) {
      log.warn('Force sync failed - sync not initialized');
      sendResponse({ success: false, error: 'Sync not initialized' });
      return;
    }
    
    log.info('Starting force sync');
    syncManager.forceSync()
      .then(() => {
        log.info('Force sync completed successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        log.error('Force sync failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }

  log.warn('Unknown message type received', { type: message.type });
});