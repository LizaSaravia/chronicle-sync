import { LocalDB } from "./db.js";

export class HistoryManager {
  constructor(storageManager, apiClient) {
    this.storage = storageManager;
    this.api = apiClient;
    this.syncInProgress = false;
    this.db = new LocalDB();
    this.setupHistoryListener();
  }

  async initialize() {
    await this.db.init();

    // Get or generate device ID
    let deviceId = await this.db.getSyncMeta("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await this.db.setSyncMeta("deviceId", deviceId);
    }

    // Get or create sync group
    let groupId = await this.db.getSyncMeta("groupId");
    const context =
      typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : globalThis;
    if (!groupId) {
      // Only try to create sync group if online
      if (context.navigator.onLine) {
        try {
          // Set up retry mechanism for creating sync group with exponential backoff
          const maxRetries = 5; // Increased from 3 to 5
          let retryCount = 0;
          let lastError = null;

          while (retryCount < maxRetries) {
            try {
              // Check online status before each attempt
              if (!context.navigator.onLine) {
                throw new Error("Offline: Cannot create sync group");
              }

              const { groupId: newGroupId } =
                await this.api.createSyncGroup(deviceId);
              groupId = newGroupId;
              await this.db.setSyncMeta("groupId", groupId);
              // Save to chrome.storage.local for the options page
              await chrome.storage.local.set({ groupId });
              console.log("Successfully created sync group:", groupId);
              break;
            } catch (error) {
              lastError = error;
              retryCount++;

              if (error.message.includes("Offline")) {
                console.warn(
                  `Offline while creating sync group (attempt ${retryCount}/${maxRetries})`,
                );
                // Exponential backoff for offline errors
                const backoffTime = Math.min(
                  1000 * Math.pow(2, retryCount),
                  30000,
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, backoffTime),
                );
              } else {
                console.warn(
                  `Failed to create sync group (attempt ${retryCount}/${maxRetries}):`,
                  error,
                );
                // Linear backoff for other errors
                await new Promise((resolve) =>
                  setTimeout(resolve, 2000 * retryCount),
                );
              }

              // If this is the last retry, throw the error
              if (retryCount === maxRetries) {
                console.error(
                  "Failed to create sync group after all retries:",
                  lastError,
                );
                throw lastError;
              }
            }
          }
        } catch (error) {
          console.warn(
            "Failed to create sync group, will retry during next sync:",
            error,
          );
          // Store the error to help with debugging
          await this.db.setSyncMeta("lastSyncError", {
            message: error.message,
            timestamp: Date.now(),
          });
        }
      } else {
        console.log("Offline - skipping sync group creation");
        // Store offline status
        await this.db.setSyncMeta("lastSyncError", {
          message: "Offline - skipped sync group creation",
          timestamp: Date.now(),
        });
      }
    }

    this.deviceId = deviceId;
    this.groupId = groupId;

    // Initial history load
    await this.loadInitialHistory();
  }

  setupHistoryListener() {
    chrome.history.onVisited.addListener(async (historyItem) => {
      // Get the full history item with title
      const [fullItem] = await this.getLocalHistory(
        historyItem.lastVisitTime,
        1,
        historyItem.url,
      );
      if (fullItem) {
        // Add title from history item if available
        const item = {
          ...fullItem,
          title: fullItem.title || historyItem.title || "Untitled",
          lastVisitTime: historyItem.lastVisitTime || Date.now(),
        };
        await this.db.addHistory([item]);
      } else {
        // Add with default title
        const item = {
          ...historyItem,
          title: historyItem.title || "Untitled",
          lastVisitTime: historyItem.lastVisitTime || Date.now(),
        };
        await this.db.addHistory([item]);
      }
      this.attemptSync();
    });
  }

  async getLocalHistory(startTime = null, maxResults = 1000, url = "") {
    const query = {
      text: url,
      maxResults,
      startTime: startTime || Date.now() - 90 * 24 * 60 * 60 * 1000, // Last 90 days by default
    };
    try {
      const items = await chrome.history.search(query);
      // Handle case where search fails or returns no results
      if (!items || !Array.isArray(items)) {
        console.warn("History search returned invalid result:", items);
        return [];
      }
      // Add titles if they're missing
      return items.map((item) => ({
        ...item,
        title: item.title || url.split("/").pop() || "Untitled",
      }));
    } catch (error) {
      console.error("Failed to search history:", error);
      return [];
    }
  }

  async loadInitialHistory() {
    const lastLoad = (await this.db.getSyncMeta("lastHistoryLoad")) || 0;
    const newHistory = await this.getLocalHistory(lastLoad);

    if (newHistory.length > 0) {
      await this.db.addHistory(newHistory);
      await this.db.setSyncMeta("lastHistoryLoad", Date.now());
    }
  }

  async attemptSync() {
    const context =
      typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : globalThis;
    if (!context.navigator.onLine) {
      console.log("Offline, skipping sync");
      return;
    }

    if (!this.groupId) {
      console.log("No sync group, skipping sync");
      return;
    }

    this.syncHistory().catch((error) => {
      console.error("Background sync failed:", error);
    });
  }

  async syncHistory() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      if (!this.deviceId || !this.groupId) {
        await this.initialize();
        if (!this.groupId) return; // Still no group ID, probably offline
      }

      // Get last sync time
      const lastSync = (await this.db.getSyncMeta("lastSync")) || 0;

      // Get unsynced items
      const unsynced = await this.db.getUnsyncedHistory();

      if (unsynced.length > 0) {
        // Encrypt history items
        const encryptedHistory = await Promise.all(
          unsynced.map(async (item) => ({
            ...item,
            title: await this.storage.crypto.encrypt(item.title || ""),
            url: await this.storage.crypto.encrypt(item.url),
          })),
        );

        // Sync to server
        await this.api.syncData(this.groupId, this.deviceId, encryptedHistory);

        // Mark as synced
        await this.db.markAsSynced(unsynced.map((item) => item.id));
      }

      // Get updates from other devices
      const response = await this.api.getUpdates(
        this.groupId,
        this.deviceId,
        lastSync,
      );
      const updates = response?.updates || [];

      if (updates.length > 0) {
        // Decrypt updates
        const decryptedUpdates = await Promise.all(
          updates.map(async (item) => ({
            ...item,
            title: await this.storage.crypto.decrypt(item.title),
            url: await this.storage.crypto.decrypt(item.url),
            syncStatus: "synced",
          })),
        );

        // Merge with local history
        await this.mergeRemoteHistory(decryptedUpdates);
      }

      // Update last sync time
      await this.db.setSyncMeta("lastSync", Date.now());
    } catch (error) {
      console.error("History sync failed:", error);
      // Don't rethrow - we want to keep running even if sync fails
    } finally {
      this.syncInProgress = false;
    }
  }

  async mergeRemoteHistory(remoteItems) {
    // Get all local history
    const localHistory = await this.db.getAllHistory();
    const urlMap = new Map();

    // Index local items
    localHistory.forEach((item) => {
      urlMap.set(item.url, item);
    });

    // Find new or updated items and handle duplicates
    const toAdd = [];
    for (const item of remoteItems) {
      const local = urlMap.get(item.url);
      if (!local || local.lastVisitTime < item.lastVisitTime) {
        try {
          // Try to delete any existing entry first to avoid constraint errors
          if (local) {
            await this.db.deleteHistory(local.id);
          }
          toAdd.push(item);
        } catch (error) {
          console.warn("Failed to delete existing history item:", error);
          // Continue with other items even if one fails
        }
      }
    }

    // Add items in smaller batches to reduce the chance of conflicts
    const batchSize = 50;
    for (let i = 0; i < toAdd.length; i += batchSize) {
      const batch = toAdd.slice(i, i + batchSize);
      try {
        await this.db.addHistory(batch);
      } catch (error) {
        console.error("Failed to add history batch:", error);
        // Try adding items one by one as fallback
        for (const item of batch) {
          try {
            await this.db.addHistory([item]);
          } catch (innerError) {
            console.error("Failed to add individual history item:", innerError);
          }
        }
      }
    }
  }

  async getDeviceHistory() {
    return await this.db.getAllHistory();
  }
}
