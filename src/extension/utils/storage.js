export class StorageManager {
  constructor(cryptoManager) {
    this.crypto = cryptoManager;
  }

  async saveLocal(key, data) {
    const encrypted = await this.crypto.encrypt(data);
    await chrome.storage.local.set({ [key]: encrypted });
  }

  async getLocal(key) {
    const result = await chrome.storage.local.get(key);
    if (!result[key]) return null;
    return await this.crypto.decrypt(result[key]);
  }

  async saveSync(key, data) {
    const encrypted = await this.crypto.encrypt(data);
    await chrome.storage.sync.set({ [key]: encrypted });
  }

  async getSync(key) {
    const result = await chrome.storage.sync.get(key);
    if (!result[key]) return null;
    return await this.crypto.decrypt(result[key]);
  }
}