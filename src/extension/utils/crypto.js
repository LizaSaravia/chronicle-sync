export class CryptoManager {
  constructor(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    this.password = password;
  }

  // Simple key derivation
  async deriveKey(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
  }

  // Convert between string and bytes
  stringToBytes(str) {
    return new TextEncoder().encode(str);
  }

  bytesToString(bytes) {
    return new TextDecoder().decode(bytes);
  }

  // Convert between base64 and bytes
  base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
  }

  bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
  }

  async encrypt(data) {
    try {
      // Get encryption key
      const keyBytes = await this.deriveKey(this.password);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Create key object for encryption
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt
      const dataBytes = this.stringToBytes(JSON.stringify(data));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBytes
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encrypted), iv.length);

      return this.bytesToBase64(result);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptedData) {
    try {
      // Get encryption key
      const keyBytes = await this.deriveKey(this.password);
      
      // Decode base64
      const encrypted = this.base64ToBytes(encryptedData);
      
      // Extract IV and data
      const iv = encrypted.slice(0, 12);
      const data = encrypted.slice(12);

      // Create key object for decryption
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return JSON.parse(this.bytesToString(new Uint8Array(decrypted)));
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