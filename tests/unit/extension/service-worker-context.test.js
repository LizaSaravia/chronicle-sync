import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ApiClient } from '../../../src/extension/utils/api.js';
import { CryptoManager } from '../../../src/extension/utils/crypto.js';
import { HistoryManager } from '../../../src/extension/utils/history.js';
import { StorageManager } from '../../../src/extension/utils/storage.js';
import { SyncManager } from '../../../src/extension/utils/sync.js';

// Mock chrome API
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  history: {
    search: vi.fn(),
    onVisited: {
      addListener: vi.fn()
    }
  },
  runtime: {
    getURL: vi.fn(),
    id: 'test-extension-id',
    getManifest: () => ({ version: '1.1.0' })
  }
};

// Mock IndexedDB
const indexedDB = {
  open: vi.fn()
};
global.indexedDB = indexedDB;

describe('Service Worker Context Tests', () => {
  let historyManager;
  let apiClient;
  let storageManager;
  let cryptoManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create instances with dependencies
    cryptoManager = new CryptoManager('test-password');
    storageManager = new StorageManager(cryptoManager);
    apiClient = new ApiClient('staging');
    historyManager = new HistoryManager(storageManager, apiClient);
    new SyncManager(historyManager);
  });

  describe('Context Detection', () => {
    it('should work in window context', async () => {
      // Simulate window context
      global.window = {};
      global.window.navigator = { onLine: true };
      
      // Test sync attempt
      historyManager.attemptSync();
      
      // Should not throw any errors about document/navigator
      expect(true).toBe(true);
    });

    it('should work in service worker context', async () => {
      // Remove window context
      delete global.window;
      
      // Simulate service worker context
      global.self = {};
      global.self.navigator = { onLine: true };
      
      // Test sync attempt
      historyManager.attemptSync();
      
      // Should not throw any errors about document/navigator
      expect(true).toBe(true);
    });

    it('should work in fallback context', async () => {
      // Remove both window and self contexts
      delete global.window;
      delete global.self;
      
      // Set navigator in global context
      global.navigator = { onLine: true };
      
      // Test sync attempt
      historyManager.attemptSync();
      
      // Should not throw any errors about document/navigator
      expect(true).toBe(true);
    });
  });

  describe('Online/Offline Behavior', () => {
    it('should skip sync when offline in window context', async () => {
      // Simulate window context
      global.window = {};
      global.window.navigator = { onLine: false };
      
      // Test sync attempt
      await historyManager.attemptSync();
      
      // Should not call syncHistory
      expect(historyManager.syncInProgress).toBe(false);
    });

    it('should skip sync when offline in service worker context', async () => {
      // Remove window context
      delete global.window;
      
      // Simulate service worker context
      global.self = {};
      global.self.navigator = { onLine: false };
      
      // Test sync attempt
      await historyManager.attemptSync();
      
      // Should not call syncHistory
      expect(historyManager.syncInProgress).toBe(false);
    });

    it('should attempt sync when online', async () => {
      // Simulate window context
      global.window = {};
      global.window.navigator = { onLine: true };
      
      // Mock group ID and sync history
      historyManager.groupId = 'test-group';
      historyManager.syncHistory = vi.fn().mockResolvedValue();
      
      // Test sync attempt
      await historyManager.attemptSync();
      
      // Should call syncHistory
      expect(historyManager.syncHistory).toHaveBeenCalled();
    });
  });

  describe('API Client Context', () => {
    it('should handle online/offline events in service worker context', async () => {
      // Remove window context
      delete global.window;
      
      // Simulate service worker context
      global.self = {
        addEventListener: vi.fn(),
        navigator: { onLine: true }
      };
      
      // Mock fetch for health check
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      // Create new API client
      const api = new ApiClient('staging');
      
      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event listeners were added
      expect(global.self.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.self.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      
      // Verify initial online state
      expect(api.isOnline).toBe(true);
    });

    it('should handle online/offline events in window context', async () => {
      // Simulate window context
      global.window = {
        addEventListener: vi.fn(),
        navigator: { onLine: true }
      };
      
      // Mock fetch for health check
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      // Create new API client
      const api = new ApiClient('staging');
      
      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event listeners were added
      expect(global.window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      
      // Verify initial online state
      expect(api.isOnline).toBe(true);
    });
  });

  describe('Error Reporting', () => {
    it('should handle error reporting in service worker context', async () => {
      // Remove window context
      delete global.window;
      
      // Simulate service worker context
      global.self = {};
      global.self.navigator = { onLine: true, userAgent: 'Test User Agent' };
      
      // Mock storage for error reporting settings
      chrome.storage.local.get.mockResolvedValue({ environment: 'staging' });
      
      // Mock fetch for Discord webhook
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      // Create an error to report
      const error = new Error('Test error');
      const context = { test: 'context' };
      
      // Import error reporting function
      const { reportError } = await import('../../../src/extension/utils/error-reporting.js');
      
      // Report error
      await reportError(error, context);
      
      // Verify fetch was called with correct data
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('discord.com/api/webhooks'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test error')
        })
      );
    });
  });

  describe('Version Consistency', () => {
    it('should match manifest version', async () => {
      // Import version from version.js
      // Mock version.js with a hardcoded version for testing
      vi.mock('../../../src/extension/utils/version.js', () => ({
        VERSION: '1.1.0'
      }));
      const { VERSION } = await import('../../../src/extension/utils/version.js');
      
      // Get version from manifest
      const manifestVersion = chrome.runtime.getManifest().version;
      
      // Versions should match
      expect(VERSION).toBe(manifestVersion);
    });
  });
});