import { describe, it, expect, vi, beforeEach } from "vitest";

import { CryptoManager } from "../../src/extension/utils/crypto.js";

// Mock crypto API before importing CryptoManager
const mockCrypto = {
  subtle: {
    digest: vi.fn().mockImplementation(async () => {
      // Return a deterministic hash for testing
      return new Uint8Array([1, 2, 3, 4]).buffer;
    }),
    importKey: vi.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
    encrypt: vi.fn().mockImplementation(async () => {
      // Return a deterministic encrypted value for testing
      return new Uint8Array([9, 10, 11, 12]).buffer;
    }),
    decrypt: vi.fn().mockImplementation(async () => {
      // Return the test data for successful decryption
      const testData = { test: "Chronicle Sync Test" };
      return new TextEncoder().encode(JSON.stringify(testData)).buffer;
    }),
  },
  getRandomValues: vi.fn().mockImplementation((arr) => {
    arr.set(new Uint8Array(arr.length).fill(1));
    return arr;
  }),
};

vi.stubGlobal("crypto", mockCrypto);

// Mock TextEncoder/TextDecoder if not available
if (typeof TextEncoder === "undefined") {
  vi.stubGlobal(
    "TextEncoder",
    class {
      encode(str) {
        return Uint8Array.from(str, (c) => c.charCodeAt(0));
      }
    },
  );
}

if (typeof TextDecoder === "undefined") {
  vi.stubGlobal(
    "TextDecoder",
    class {
      decode(bytes) {
        return String.fromCharCode(...bytes);
      }
    },
  );
}

describe("CryptoManager", () => {
  let cryptoManager;
  const testPassword = "test-password-123";

  beforeEach(() => {
    vi.clearAllMocks();
    cryptoManager = new CryptoManager(testPassword);
  });

  describe("constructor", () => {
    it("should throw error for empty password", () => {
      expect(() => new CryptoManager("")).toThrow(
        "Password must be a non-empty string",
      );
    });

    it("should throw error for non-string password", () => {
      expect(() => new CryptoManager(123)).toThrow(
        "Password must be a non-empty string",
      );
    });

    it("should create instance with valid password", () => {
      expect(new CryptoManager("validpassword")).toBeInstanceOf(CryptoManager);
    });
  });

  describe("deriveKey", () => {
    it("should derive key from password", async () => {
      const key = await cryptoManager.deriveKey(testPassword);

      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
        "SHA-256",
        expect.any(Object),
      );
      expect(key).toBeInstanceOf(Uint8Array);
    });
  });

  describe("string/bytes conversion", () => {
    it("should convert string to bytes", () => {
      const str = "test";
      const bytes = cryptoManager.stringToBytes(str);
      expect(Object.prototype.toString.call(bytes)).toBe("[object Uint8Array]");
      expect(bytes.length).toBe(str.length);
    });

    it("should convert bytes to string", () => {
      const bytes = new Uint8Array([116, 101, 115, 116]); // "test"
      const str = cryptoManager.bytesToString(bytes);
      expect(str).toBe("test");
    });
  });

  describe("base64 conversion", () => {
    it("should convert base64 to bytes", async () => {
      const base64 = "dGVzdA=="; // "test"
      const bytes = await cryptoManager.base64ToBytes(base64);
      expect(Object.prototype.toString.call(bytes)).toBe("[object Uint8Array]");
      expect(bytes.length).toBe(4);
    });

    it("should convert bytes to base64", async () => {
      const bytes = new Uint8Array([116, 101, 115, 116]); // "test"
      const base64 = await cryptoManager.bytesToBase64(bytes);
      expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64 characters
    });

    it("should handle empty input", async () => {
      const bytes = new Uint8Array(0);
      const base64 = await cryptoManager.bytesToBase64(bytes);
      const roundTrip = await cryptoManager.base64ToBytes(base64);
      expect(roundTrip.length).toBe(0);
    });

    it("should handle special characters", async () => {
      const bytes = new Uint8Array([0xff, 0x00, 0xaa, 0x55]);
      const base64 = await cryptoManager.bytesToBase64(bytes);
      const roundTrip = await cryptoManager.base64ToBytes(base64);
      expect(roundTrip).toEqual(bytes);
    });
  });

  describe("encrypt", () => {
    it("should encrypt data", async () => {
      const data = { test: "data" };
      const encrypted = await cryptoManager.encrypt(data);

      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(typeof encrypted).toBe("string");
    });

    it("should handle encryption errors", async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      await expect(cryptoManager.encrypt({ test: "data" })).rejects.toThrow(
        "Failed to encrypt data",
      );
    });
  });

  describe("decrypt", () => {
    it("should decrypt data", async () => {
      const encrypted = "AQEBAQEBAQEFBgcI"; // Mock encrypted data
      const decrypted = await cryptoManager.decrypt(encrypted);

      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
      expect(decrypted).toEqual({ test: "Chronicle Sync Test" });
    });

    it("should handle decryption errors", async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      await expect(cryptoManager.decrypt("invalid-data")).rejects.toThrow(
        "Failed to decrypt data",
      );
    });
  });

  describe("test", () => {
    beforeEach(() => {
      // Reset mocks to their default implementations
      mockCrypto.subtle.encrypt.mockImplementation(async () => {
        return new Uint8Array([9, 10, 11, 12]).buffer;
      });
      mockCrypto.subtle.decrypt.mockImplementation(async () => {
        const testData = { test: "Chronicle Sync Test" };
        return new TextEncoder().encode(JSON.stringify(testData)).buffer;
      });
    });

    it("should pass encryption test", async () => {
      await expect(cryptoManager.test()).resolves.not.toThrow();
    });

    it("should fail if encryption fails", async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      await expect(cryptoManager.test()).rejects.toThrow(
        "Failed to initialize encryption",
      );
    });

    it("should fail if decryption fails", async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      await expect(cryptoManager.test()).rejects.toThrow(
        "Failed to initialize encryption",
      );
    });

    it("should fail if decrypted data does not match", async () => {
      mockCrypto.subtle.decrypt.mockImplementation(async () => {
        const testData = { test: "wrong data" };
        return new TextEncoder().encode(JSON.stringify(testData)).buffer;
      });

      await expect(cryptoManager.test()).rejects.toThrow(
        "Failed to initialize encryption: Encryption test failed: data mismatch",
      );
    });
  });
});
