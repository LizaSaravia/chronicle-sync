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
    // Register event handlers immediately during script evaluation
    const onlineHandler = () => {
      console.log("Network event: online");
      checkConnection();
    };
    const offlineHandler = () => {
      console.log("Network event: offline");
      this.isOnline = false;
    };

    // Only add event listeners if the context supports them
    if (typeof context.addEventListener === "function") {
      // Remove any existing listeners to avoid duplicates
      if (typeof context.removeEventListener === "function") {
        context.removeEventListener("online", onlineHandler);
        context.removeEventListener("offline", offlineHandler);
      }

      // Add the event listeners
      context.addEventListener("online", onlineHandler);
      context.addEventListener("offline", offlineHandler);
    }

    // Periodic check every minute
    setInterval(() => checkConnection(), 60000);
  }

  setOnlineCallback(callback) {
    this.onOnline = callback;
  }

  /**
   * Makes an API request with standardized error handling and offline checks
   * @param {string} endpoint - The API endpoint to call
   * @param {Object} options - Fetch options and additional configuration
   * @param {string} options.operation - Description of the operation for error messages
   * @param {Object} [options.params] - URL parameters to append
   * @returns {Promise<any>} The parsed JSON response
   */
  async makeRequest(endpoint, options = {}) {
    const { operation, params, ...fetchOptions } = options;

    if (!this.isOnline) {
      throw new Error(`Offline: Cannot ${operation}`);
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value.toString());
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          Origin: chrome.runtime.getURL(""),
          "X-Extension-ID": chrome.runtime.id,
          ...fetchOptions.headers,
        },
        credentials: "include",
        ...fetchOptions,
      });

      if (!response.ok) {
        throw new Error(`Failed to ${operation}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!this.isOnline || error.message.includes("Failed to fetch")) {
        throw new Error(`Offline: Cannot ${operation}`);
      }
      throw error;
    }
  }

  async createSyncGroup(deviceId) {
    return this.makeRequest(API_PATHS.createGroup, {
      method: "POST",
      body: JSON.stringify({ deviceId }),
      operation: "create sync group",
    });
  }

  async syncData(groupId, deviceId, data) {
    const timestamp = Date.now();
    return this.makeRequest(API_PATHS.sync, {
      method: "POST",
      body: JSON.stringify({
        groupId,
        deviceId,
        data,
        timestamp,
      }),
      operation: "sync data",
    });
  }

  async getUpdates(groupId, deviceId, since) {
    return this.makeRequest(API_PATHS.getUpdates, {
      operation: "get updates",
      params: {
        groupId,
        deviceId,
        since,
      },
    });
  }
}
