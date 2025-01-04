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
      return null;
    }
  }
}