import { API_BASE, API_PATHS } from "../../shared/constants.js";

export class ApiClient {
  constructor(
    environment = process.env.NODE_ENV === "development"
      ? "staging"
      : "production",
    customApiUrl = null,
  ) {
    this.baseUrl =
      environment === "custom" ? customApiUrl : API_BASE[environment];
    this.setupOfflineDetection();
  }

  setupOfflineDetection() {
    // Use globalThis to work in both window and service worker contexts
    const context =
      typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : globalThis;

    const checkConnection = async (retryCount = 0) => {
      try {
        // First check navigator.onLine
        if (!context.navigator.onLine) {
          console.log("Browser reports offline");
          this.isOnline = false;
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout

        const healthUrl = `${this.baseUrl}${API_PATHS.health}`;
        console.log("Checking health endpoint:", healthUrl);

        const response = await fetch(healthUrl, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Origin: chrome.runtime.getURL(""),
            "X-Extension-ID": chrome.runtime.id,
            "Cache-Control": "no-cache",
          },
          credentials: "include",
        });

        clearTimeout(timeoutId);
        this.isOnline = response.ok;
        if (this.isOnline) {
          console.log("Connection check successful for", this.baseUrl);
          this.onOnline?.();
        } else {
          console.warn(
            "Health check failed for",
            this.baseUrl,
            "- Status:",
            response.status,
            response.statusText,
          );
          if (retryCount < 3) {
            console.log(`Retrying connection check (${retryCount + 1}/3)...`);
            setTimeout(() => checkConnection(retryCount + 1), 2000);
          }
        }
      } catch (error) {
        const errorDetails = {
          message: error.message,
          type: error.name,
          url: this.baseUrl,
          timeout: error.name === "AbortError" ? "10s" : "N/A",
        };
        console.warn("Connection check failed:", errorDetails);
        this.isOnline = false;
        if (retryCount < 3) {
          console.log(
            `Retrying connection check (${retryCount + 1}/3) for ${this.baseUrl}...`,
          );
          setTimeout(() => checkConnection(retryCount + 1), 2000);
        }
      }
    };

    // Initial check with retries
    checkConnection();

    // Listen for online/offline events
    if (typeof context.addEventListener === "function") {
      context.addEventListener("online", () => {
        console.log("Network event: online");
        checkConnection();
      });

      context.addEventListener("offline", () => {
        console.log("Network event: offline");
        this.isOnline = false;
      });

      // Periodic check every minute
      setInterval(() => checkConnection(), 60000);
    }
  }

  setOnlineCallback(callback) {
    this.onOnline = callback;
  }

  async createSyncGroup(deviceId) {
    if (!this.isOnline) {
      throw new Error("Offline: Cannot create sync group");
    }

    try {
      const response = await fetch(`${this.baseUrl}${API_PATHS.createGroup}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: chrome.runtime.getURL(""),
          "X-Extension-ID": chrome.runtime.id,
        },
        credentials: "include",
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create sync group: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!this.isOnline || error.message.includes("Failed to fetch")) {
        throw new Error("Offline: Cannot create sync group");
      }
      throw error;
    }
  }

  async syncData(groupId, deviceId, data) {
    if (!this.isOnline) {
      throw new Error("Offline: Cannot sync data");
    }

    try {
      const timestamp = Date.now();
      const response = await fetch(`${this.baseUrl}${API_PATHS.sync}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: chrome.runtime.getURL(""),
          "X-Extension-ID": chrome.runtime.id,
        },
        credentials: "include",
        body: JSON.stringify({
          groupId,
          deviceId,
          data,
          timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!this.isOnline || error.message.includes("Failed to fetch")) {
        throw new Error("Offline: Cannot sync data");
      }
      throw error;
    }
  }

  async getUpdates(groupId, deviceId, since) {
    if (!this.isOnline) {
      throw new Error("Offline: Cannot get updates");
    }

    try {
      const params = new URLSearchParams({
        groupId,
        deviceId,
        since: since.toString(),
      });

      const response = await fetch(
        `${this.baseUrl}${API_PATHS.getUpdates}?${params.toString()}`,
        {
          headers: {
            Origin: chrome.runtime.getURL(""),
            "X-Extension-ID": chrome.runtime.id,
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get updates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!this.isOnline || error.message.includes("Failed to fetch")) {
        throw new Error("Offline: Cannot get updates");
      }
      throw error;
    }
  }
}
