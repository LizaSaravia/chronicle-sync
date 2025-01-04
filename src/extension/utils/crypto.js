import CryptoJS from 'crypto-js';

export class CryptoManager {
  constructor(password) {
    this.key = CryptoJS.PBKDF2(password, 'chronicle-sync', {
      keySize: 256 / 32,
      iterations: 10000
    });
  }

  async encrypt(data) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.key.toString());
    return encrypted.toString();
  }

  async decrypt(encryptedData) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.key.toString());
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
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
      throw new Error('Failed to initialize encryption: ' + error.message);
    }
  }
}