import { describe, it, expect, vi, beforeEach } from "vitest";

import { StorageManager } from "../../src/extension/utils/storage.js";

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

global.chrome = mockChrome;

describe("StorageManager", () => {
  let storageManager;
  let mockCryptoManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock crypto manager
    mockCryptoManager = {
      encrypt: vi.fn().mockResolvedValue("encrypted-data"),
      decrypt: vi.fn().mockResolvedValue("decrypted-data"),
    };

    // Create storage manager instance
    storageManager = new StorageManager(mockCryptoManager);
  });

  describe("saveLocal", () => {
    it("should encrypt and save data locally", async () => {
      const key = "test-key";
      const data = { test: "data" };

      // Mock chrome.storage.local.set to resolve
      mockChrome.storage.local.set.mockResolvedValue();

      // Call saveLocal
      await storageManager.saveLocal(key, data);

      // Verify data was encrypted
      expect(mockCryptoManager.encrypt).toHaveBeenCalledWith(data);

      // Verify encrypted data was saved
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        [key]: "encrypted-data",
      });
    });

    it("should handle encryption errors", async () => {
      const key = "test-key";
      const data = { test: "data" };

      // Mock encryption failure
      mockCryptoManager.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      // Verify error is thrown
      await expect(storageManager.saveLocal(key, data)).rejects.toThrow(
        "Encryption failed",
      );

      // Verify storage was not called
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe("getLocal", () => {
    it("should retrieve and decrypt local data", async () => {
      const key = "test-key";
      const encryptedData = "encrypted-data";

      // Mock chrome.storage.local.get to return encrypted data
      mockChrome.storage.local.get.mockResolvedValue({ [key]: encryptedData });

      // Call getLocal
      const result = await storageManager.getLocal(key);

      // Verify data was retrieved
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(key);

      // Verify data was decrypted
      expect(mockCryptoManager.decrypt).toHaveBeenCalledWith(encryptedData);

      // Verify decrypted data was returned
      expect(result).toBe("decrypted-data");
    });

    it("should return null for missing data", async () => {
      const key = "missing-key";

      // Mock chrome.storage.local.get to return empty object
      mockChrome.storage.local.get.mockResolvedValue({});

      // Call getLocal
      const result = await storageManager.getLocal(key);

      // Verify null was returned
      expect(result).toBeNull();

      // Verify decrypt was not called
      expect(mockCryptoManager.decrypt).not.toHaveBeenCalled();
    });

    it("should handle decryption errors", async () => {
      const key = "test-key";
      const encryptedData = "encrypted-data";

      // Mock chrome.storage.local.get to return encrypted data
      mockChrome.storage.local.get.mockResolvedValue({ [key]: encryptedData });

      // Mock decryption failure
      mockCryptoManager.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      // Verify error is thrown
      await expect(storageManager.getLocal(key)).rejects.toThrow(
        "Decryption failed",
      );
    });
  });

  describe("saveSync", () => {
    it("should encrypt and save data to sync storage", async () => {
      const key = "test-key";
      const data = { test: "data" };

      // Mock chrome.storage.sync.set to resolve
      mockChrome.storage.sync.set.mockResolvedValue();

      // Call saveSync
      await storageManager.saveSync(key, data);

      // Verify data was encrypted
      expect(mockCryptoManager.encrypt).toHaveBeenCalledWith(data);

      // Verify encrypted data was saved
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        [key]: "encrypted-data",
      });
    });

    it("should handle encryption errors", async () => {
      const key = "test-key";
      const data = { test: "data" };

      // Mock encryption failure
      mockCryptoManager.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      // Verify error is thrown
      await expect(storageManager.saveSync(key, data)).rejects.toThrow(
        "Encryption failed",
      );

      // Verify storage was not called
      expect(mockChrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe("getSync", () => {
    it("should retrieve and decrypt sync data", async () => {
      const key = "test-key";
      const encryptedData = "encrypted-data";

      // Mock chrome.storage.sync.get to return encrypted data
      mockChrome.storage.sync.get.mockResolvedValue({ [key]: encryptedData });

      // Call getSync
      const result = await storageManager.getSync(key);

      // Verify data was retrieved
      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(key);

      // Verify data was decrypted
      expect(mockCryptoManager.decrypt).toHaveBeenCalledWith(encryptedData);

      // Verify decrypted data was returned
      expect(result).toBe("decrypted-data");
    });

    it("should return null for missing data", async () => {
      const key = "missing-key";

      // Mock chrome.storage.sync.get to return empty object
      mockChrome.storage.sync.get.mockResolvedValue({});

      // Call getSync
      const result = await storageManager.getSync(key);

      // Verify null was returned
      expect(result).toBeNull();

      // Verify decrypt was not called
      expect(mockCryptoManager.decrypt).not.toHaveBeenCalled();
    });

    it("should handle decryption errors", async () => {
      const key = "test-key";
      const encryptedData = "encrypted-data";

      // Mock chrome.storage.sync.get to return encrypted data
      mockChrome.storage.sync.get.mockResolvedValue({ [key]: encryptedData });

      // Mock decryption failure
      mockCryptoManager.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      // Verify error is thrown
      await expect(storageManager.getSync(key)).rejects.toThrow(
        "Decryption failed",
      );
    });
  });
});
