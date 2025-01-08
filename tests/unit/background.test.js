import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("../../src/extension/utils/logger.js", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("../../src/extension/utils/api.js", () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    test: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("../../src/extension/utils/crypto.js", () => ({
  CryptoManager: vi.fn().mockImplementation(() => ({
    test: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("../../src/extension/utils/storage.js", () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    saveLocal: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("../../src/extension/utils/history.js", () => ({
  HistoryManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    getDeviceHistory: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../src/extension/utils/sync.js", () => ({
  SyncManager: vi.fn().mockImplementation(() => ({
    startSync: vi.fn().mockResolvedValue(true),
    forceSync: vi.fn().mockResolvedValue(true),
    history: {
      getDeviceHistory: vi.fn().mockResolvedValue([]),
    },
  })),
}));

// Mock chrome API
const mockChrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn((callback) => {
        mockChrome.runtime.onInstalled.callback = callback;
      }),
    },
    onMessage: {
      addListener: vi.fn((callback) => {
        mockChrome.runtime.onMessage.callback = callback;
      }),
    },
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    },
  },
  action: {
    setBadgeText: vi.fn().mockResolvedValue(),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(),
  },
};

vi.stubGlobal("chrome", mockChrome);

// Import background script
await import("../../src/extension/background.js");

describe("Background Script", () => {
  let sendResponse;

  beforeEach(async () => {
    vi.clearAllMocks();
    sendResponse = vi.fn();
    // Reset syncManager
    await mockChrome.runtime.onMessage.callback(
      { type: "INITIALIZE", password: "short" },
      {},
      vi.fn(),
    );
  });

  describe("onInstalled", () => {
    it("should set badge when not initialized", async () => {
      mockChrome.storage.local.get.mockResolvedValue({ initialized: false });
      await mockChrome.runtime.onInstalled.callback();
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: "!",
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: "#FF0000",
      });
    });

    it("should not set badge when already initialized", async () => {
      mockChrome.storage.local.get.mockResolvedValue({ initialized: true });
      await mockChrome.runtime.onInstalled.callback();
      expect(mockChrome.action.setBadgeText).not.toHaveBeenCalled();
      expect(mockChrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });
  });

  describe("Message Handling", () => {
    describe("INITIALIZE message", () => {
      it("should initialize successfully with valid password", async () => {
        const message = {
          type: "INITIALIZE",
          password: "validpassword123",
          environment: "development",
        };

        const keepAlive = mockChrome.runtime.onMessage.callback(
          message,
          {},
          sendResponse,
        );
        expect(keepAlive).toBe(true);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(sendResponse).toHaveBeenCalledWith({ success: true });
        expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
          text: "",
        });
      });

      it("should fail initialization with invalid password", async () => {
        const message = {
          type: "INITIALIZE",
          password: "short",
          environment: "development",
        };

        const keepAlive = mockChrome.runtime.onMessage.callback(
          message,
          {},
          sendResponse,
        );
        expect(keepAlive).toBe(true);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(sendResponse).toHaveBeenCalledWith({
          success: false,
          error: "Password must be at least 8 characters long",
        });
      });
    });

    describe("GET_HISTORY message", () => {
      it("should return history when initialized", async () => {
        // First initialize
        await mockChrome.runtime.onMessage.callback(
          { type: "INITIALIZE", password: "validpassword123" },
          {},
          vi.fn(),
        );

        const message = { type: "GET_HISTORY" };
        const keepAlive = mockChrome.runtime.onMessage.callback(
          message,
          {},
          sendResponse,
        );
        expect(keepAlive).toBe(true);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          history: [],
        });
      });

      it("should fail when not initialized", async () => {
        const message = { type: "GET_HISTORY" };
        const keepAlive = mockChrome.runtime.onMessage.callback(
          message,
          {},
          sendResponse,
        );
        expect(keepAlive).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(sendResponse).toHaveBeenCalledWith({
          success: false,
          error: "Sync not initialized",
        });
      });
    });

    describe("FORCE_SYNC message", () => {
      it("should sync successfully when initialized", async () => {
        // First initialize
        await mockChrome.runtime.onMessage.callback(
          { type: "INITIALIZE", password: "validpassword123" },
          {},
          vi.fn(),
        );

        const message = { type: "FORCE_SYNC" };
        const keepAlive = mockChrome.runtime.onMessage.callback(
          message,
          {},
          sendResponse,
        );
        expect(keepAlive).toBe(true);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });

      it("should fail when not initialized", async () => {
        const message = { type: "FORCE_SYNC" };
        const keepAlive = mockChrome.runtime.onMessage.callback(
          message,
          {},
          sendResponse,
        );
        expect(keepAlive).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(sendResponse).toHaveBeenCalledWith({
          success: false,
          error: "Sync not initialized",
        });
      });
    });

    it("should warn on unknown message type", () => {
      const message = { type: "UNKNOWN" };
      const result = mockChrome.runtime.onMessage.callback(
        message,
        {},
        sendResponse,
      );
      expect(result).toBeUndefined();
    });
  });
});
