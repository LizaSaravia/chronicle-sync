import CryptoJS from 'crypto-js';
import WebSocket from 'isomorphic-ws';

export interface SyncData {
  id: string;
  data: unknown;
  timestamp: number;
}

export interface SyncOptions {
  password: string;
  serverUrl?: string;
  onSync?: (data: SyncData) => void;
}

interface SyncMessage {
  type: 'sync' | 'get' | 'history';
  groupId?: string;
  data?: string;
  timestamp?: number;
  items?: Array<{ data: string; timestamp: number }>;
  error?: string;
}

export class SyncManager {
  private password: string;
  private serverUrl: string;
  private offlineQueue: SyncData[] = [];
  private ws: WebSocket | null = null;
  private onSync?: (data: SyncData) => void;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private groupId: string;

  constructor(options: SyncOptions) {
    this.password = options.password;
    this.serverUrl = options.serverUrl || 'wss://sync.chronicle-sync.dev';
    this.onSync = options.onSync;
    this.groupId = CryptoJS.SHA256(this.password).toString();
    this.connect();
  }

  private connect() {
    const wsUrl = this.serverUrl.replace(/^http/, 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to sync server');
      // Get latest sync data
      this.ws?.send(JSON.stringify({
        type: 'get',
        groupId: this.groupId,
        timestamp: Date.now()
      }));
      // Try to sync offline queue
      this.syncOfflineQueue().catch(console.error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString()) as SyncMessage;
        
        if (message.error) {
          console.error('Sync error:', message.error);
          return;
        }

        if (message.type === 'sync' && message.data) {
          const decryptedData = this.decrypt(message.data);
          if (this.onSync && message.timestamp) {
            this.onSync({
              id: `remote-${message.timestamp}`,
              data: decryptedData,
              timestamp: message.timestamp
            });
          }
        }

        if (message.type === 'history' && message.items) {
          for (const item of message.items) {
            const decryptedData = this.decrypt(item.data);
            if (this.onSync) {
              this.onSync({
                id: `remote-${item.timestamp}`,
                data: decryptedData,
                timestamp: item.timestamp
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing sync message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from sync server');
      // Try to reconnect after 5 seconds
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private encrypt(data: unknown): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.password).toString();
  }

  private decrypt(encryptedData: string): unknown {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.password);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  async sync(data: SyncData): Promise<void> {
    const encryptedData = this.encrypt(data);
    
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'sync',
          groupId: this.groupId,
          data: encryptedData,
          timestamp: data.timestamp
        }));
      } else {
        // If WebSocket is not connected, use REST API fallback
        const response = await fetch(`${this.serverUrl.replace(/^ws/, 'http')}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            groupId: this.groupId,
            data: encryptedData,
            timestamp: data.timestamp
          }),
        });

        if (!response.ok) {
          throw new Error('Sync failed');
        }
      }

      // Clear any queued items that were successfully synced
      this.offlineQueue = this.offlineQueue.filter(item => item.id !== data.id);
    } catch (error) {
      // Store in offline queue if sync fails
      this.offlineQueue.push(data);
      throw error;
    }
  }

  async syncOfflineQueue(): Promise<void> {
    const queueCopy = [...this.offlineQueue];
    for (const item of queueCopy) {
      try {
        await this.sync(item);
      } catch (error) {
        // Stop processing if we're still offline
        break;
      }
    }
  }

  getOfflineQueue(): SyncData[] {
    return [...this.offlineQueue];
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}