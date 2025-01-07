import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome API before importing background script
const mockChrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn((callback) => {
        // Store the callback for later use
        mockChrome.runtime.onInstalled.callback = callback;
      })
    },
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue()
    }
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  }
};

vi.stubGlobal('chrome', mockChrome);

// Mock VERSION constant
vi.stubGlobal('VERSION', '1.0.0');

// Import background script
await import('../../src/extension/background.js');

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onInstalled', () => {
    it('should set badge when not initialized', async () => {
      // Mock storage.local.get to return not initialized
      mockChrome.storage.local.get.mockResolvedValue({ initialized: false });

      // Call the stored callback
      await mockChrome.runtime.onInstalled.callback();

      // Verify badge was set
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });

    it('should not set badge when already initialized', async () => {
      // Mock storage.local.get to return initialized
      mockChrome.storage.local.get.mockResolvedValue({ initialized: true });

      // Call the stored callback
      await mockChrome.runtime.onInstalled.callback();

      // Verify badge was not set
      expect(mockChrome.action.setBadgeText).not.toHaveBeenCalled();
      expect(mockChrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });
  });
});