import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { LocalDB } from "../../src/extension/utils/db.js";
import { HistoryManager } from "../../src/extension/utils/history.js";

// Mock chrome.history API
const mockChrome = {
  history: {
    onVisited: {
      addListener: vi.fn(),
    },
    search: vi.fn().mockResolvedValue([]),
  },
};
global.chrome = mockChrome;

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "12345678-1234-1234-1234-123456789012",
  },
});

// Mock navigator.onLine
let isOnline = false;
Object.defineProperty(global.navigator, "onLine", {
  get: () => isOnline,
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
};
global.indexedDB = mockIndexedDB;

describe("HistoryManager in disconnected mode", () => {
  let historyManager;
  let mockStorageManager;
  let mockApiClient;
  let mockDB;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock storage manager
    mockStorageManager = {
      crypto: {
        encrypt: vi.fn((text) => Promise.resolve(`encrypted:${text}`)),
        decrypt: vi.fn((text) =>
          Promise.resolve(text.replace("encrypted:", "")),
        ),
      },
    };

    // Mock API client
    mockApiClient = {
      createSyncGroup: vi.fn(),
      syncData: vi.fn(),
      getUpdates: vi.fn(),
    };

    // Mock LocalDB
    mockDB = {
      init: vi.fn(() => Promise.resolve()),
      addHistory: vi.fn(() => Promise.resolve()),
      getUnsyncedHistory: vi.fn(() => Promise.resolve([])),
      markAsSynced: vi.fn(() => Promise.resolve()),
      getAllHistory: vi.fn(() => Promise.resolve([])),
      setSyncMeta: vi.fn(() => Promise.resolve()),
      getSyncMeta: vi.fn(() => Promise.resolve(null)),
    };

    // Mock the LocalDB constructor
    vi.spyOn(LocalDB.prototype, "init").mockImplementation(mockDB.init);
    vi.spyOn(LocalDB.prototype, "addHistory").mockImplementation(
      mockDB.addHistory,
    );
    vi.spyOn(LocalDB.prototype, "getUnsyncedHistory").mockImplementation(
      mockDB.getUnsyncedHistory,
    );
    vi.spyOn(LocalDB.prototype, "markAsSynced").mockImplementation(
      mockDB.markAsSynced,
    );
    vi.spyOn(LocalDB.prototype, "getAllHistory").mockImplementation(
      mockDB.getAllHistory,
    );
    vi.spyOn(LocalDB.prototype, "setSyncMeta").mockImplementation(
      mockDB.setSyncMeta,
    );
    vi.spyOn(LocalDB.prototype, "getSyncMeta").mockImplementation(
      mockDB.getSyncMeta,
    );

    // Create history manager
    historyManager = new HistoryManager(mockStorageManager, mockApiClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize without creating sync group when offline", async () => {
    isOnline = false;
    mockDB.getSyncMeta.mockImplementation((key) => {
      if (key === "deviceId") return null;
      if (key === "groupId") return null;
      if (key === "lastHistoryLoad") return 0;
      return null;
    });

    await historyManager.initialize();

    // Should generate device ID
    expect(mockDB.setSyncMeta).toHaveBeenCalledWith(
      "deviceId",
      expect.any(String),
    );

    // Should not create sync group when offline
    expect(mockApiClient.createSyncGroup).not.toHaveBeenCalled();
  });

  it("should store history locally when offline", async () => {
    isOnline = false;
    const historyItem = {
      url: "https://example.com",
      title: "Example Site",
      lastVisitTime: Date.now(),
    };

    // Mock chrome.history.search to return the item
    mockChrome.history.search.mockResolvedValueOnce([historyItem]);

    // Get the onVisited listener callback
    const [listenerCallback] =
      mockChrome.history.onVisited.addListener.mock.calls[0];

    // Simulate history visit
    await listenerCallback(historyItem);

    // Should store in local DB
    expect(mockDB.addHistory).toHaveBeenCalledWith([
      {
        ...historyItem,
        title: "Example Site",
      },
    ]);

    // Should not attempt to sync
    expect(mockApiClient.syncData).not.toHaveBeenCalled();
  });

  it("should queue items for sync when offline", async () => {
    isOnline = false;
    const historyItems = [
      {
        url: "https://example1.com",
        title: "Example 1",
        lastVisitTime: Date.now(),
      },
      {
        url: "https://example2.com",
        title: "Example 2",
        lastVisitTime: Date.now(),
      },
    ];

    // Mock unsynced items
    mockDB.getUnsyncedHistory.mockResolvedValueOnce(historyItems);

    // Try to sync
    await historyManager.syncHistory();

    // Should not sync to server
    expect(mockApiClient.syncData).not.toHaveBeenCalled();

    // Items should remain in unsynced state
    expect(mockDB.markAsSynced).not.toHaveBeenCalled();
  });

  it("should sync queued items when coming back online", async () => {
    // Start offline with queued items
    isOnline = false;
    const historyItems = [
      {
        url: "https://example1.com",
        title: "Example 1",
        lastVisitTime: Date.now(),
        id: 1,
      },
      {
        url: "https://example2.com",
        title: "Example 2",
        lastVisitTime: Date.now(),
        id: 2,
      },
    ];

    // Mock DB responses for initialization
    mockDB.getSyncMeta.mockImplementation((key) => {
      if (key === "deviceId") return "test-device";
      if (key === "groupId") return "test-group";
      if (key === "lastHistoryLoad") return 0;
      if (key === "lastSync") return 0;
      return null;
    });

    // Mock empty search results
    mockChrome.history.search.mockResolvedValue([]);

    // Initialize history manager
    await historyManager.initialize();

    // Reset mocks after initialization
    vi.clearAllMocks();

    // Mock unsynced items for offline sync
    mockDB.getUnsyncedHistory.mockResolvedValueOnce([]);
    mockApiClient.getUpdates.mockResolvedValueOnce(undefined); // Simulate offline failure

    // Try to sync while offline
    await historyManager.syncHistory();
    expect(mockApiClient.syncData).not.toHaveBeenCalled();

    // Come back online and try to sync again
    isOnline = true;
    mockDB.getUnsyncedHistory.mockResolvedValueOnce(historyItems);
    mockApiClient.syncData.mockResolvedValueOnce({});
    mockApiClient.getUpdates.mockResolvedValueOnce({ updates: [] });

    await historyManager.syncHistory();

    // Should sync queued items
    expect(mockApiClient.syncData).toHaveBeenCalledWith(
      "test-group",
      "test-device",
      expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringContaining("encrypted:https://example1.com"),
          title: expect.stringContaining("encrypted:Example 1"),
        }),
        expect.objectContaining({
          url: expect.stringContaining("encrypted:https://example2.com"),
          title: expect.stringContaining("encrypted:Example 2"),
        }),
      ]),
    );

    // Should mark items as synced
    expect(mockDB.markAsSynced).toHaveBeenCalledWith([1, 2]);
  });

  it("should merge remote history when coming back online", async () => {
    // Start offline
    isOnline = false;
    historyManager.deviceId = "test-device";
    historyManager.groupId = "test-group";

    // Mock local history
    const localHistory = [
      { url: "https://example1.com", title: "Example 1", lastVisitTime: 1000 },
      { url: "https://example2.com", title: "Example 2", lastVisitTime: 2000 },
    ];
    mockDB.getAllHistory.mockResolvedValueOnce(localHistory);

    // Come back online with remote updates
    isOnline = true;
    const remoteUpdates = [
      {
        url: "https://example1.com",
        title: "encrypted:Example 1 Updated",
        lastVisitTime: 3000,
      },
      {
        url: "https://example3.com",
        title: "encrypted:Example 3",
        lastVisitTime: 4000,
      },
    ];
    mockApiClient.getUpdates.mockResolvedValueOnce({ updates: remoteUpdates });
    mockDB.getUnsyncedHistory.mockResolvedValueOnce([]);

    await historyManager.syncHistory();

    // Should merge remote updates
    expect(mockDB.addHistory).toHaveBeenCalledWith([
      expect.objectContaining({
        url: "https://example1.com",
        title: "Example 1 Updated",
        lastVisitTime: 3000,
      }),
      expect.objectContaining({
        url: "https://example3.com",
        title: "Example 3",
        lastVisitTime: 4000,
      }),
    ]);
  });
});
