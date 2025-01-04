import { enc, AES, PBKDF2, lib } from 'crypto-js';

// Use Node.js crypto for generating random values in background script
function getRandomValues(count) {
  // Check if we're in a background script (no window object)
  if (typeof window === 'undefined') {
    const array = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      array[i] = Math.floor(Math.random() * 256); // Simple random for now, could be improved
    }
    return array;
  }
  // In content script or popup, use the standard Web Crypto API
  return window.crypto.getRandomValues(new Uint8Array(count));
}

// Override the crypto-js WordArray random generator
lib.WordArray.random = function (numberOfBytes) {
  const randomBytes = getRandomValues(numberOfBytes);
  const words = [];
  for (let i = 0; i < numberOfBytes; i += 4) {
    words.push(
      (randomBytes[i] << 24) |
      (randomBytes[i + 1] << 16) |
      (randomBytes[i + 2] << 8) |
      randomBytes[i + 3]
    );
  }
  return new lib.WordArray.init(words, numberOfBytes);
};

export class CryptoManager {
  constructor(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    try {
      this.key = PBKDF2(password, 'chronicle-sync', {
        keySize: 256 / 32,
        iterations: 10000
      });
    } catch (error) {
      console.error('Failed to initialize crypto:', error);
      throw new Error('Failed to initialize encryption');
    }
  }

  async encrypt(data) {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }

    try {
      const encrypted = AES.encrypt(JSON.stringify(data), this.key.toString());
      return encrypted.toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptedData) {
    if (!encryptedData) {
      throw new Error('Data to decrypt cannot be empty');
    }

    try {
      const decrypted = AES.decrypt(encryptedData, this.key.toString());
      const decryptedStr = decrypted.toString(enc.Utf8);
      if (!decryptedStr) {
        throw new Error('Decryption produced empty result');
      }
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data. The password may be incorrect.');
    }
  }

  async test() {
    try {
      const testData = { test: 'Chronicle Sync Test' };
      const encrypted = await this.encrypt(testData);
      const decrypted = await this.decrypt(encrypted);
      
      if (!decrypted || decrypted.test !== testData.test) {
        throw new Error('Encryption test failed: data mismatch');
      }
    } catch (error) {
      console.error('Crypto test failed:', error);
      throw new Error('Failed to initialize encryption: ' + error.message);
    }
  }
}