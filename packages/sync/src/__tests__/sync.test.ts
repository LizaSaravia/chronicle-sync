import { SyncManager, type SyncData } from '../index';

describe('SyncManager', () => {
  let syncManager: SyncManager;
  const mockPassword = 'test-password';

  beforeEach(() => {
    syncManager = new SyncManager({ password: mockPassword });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should encrypt and decrypt data correctly', async () => {
    const testData: SyncData = {
      id: 'test-1',
      data: { key: 'value' },
      timestamp: Date.now()
    };

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );

    await syncManager.sync(testData);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://sync.chronicle-sync.dev/api/sync');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(typeof body.data).toBe('string');
    expect(body.data).not.toContain('test-1');
  });

  it('should queue data when offline', async () => {
    const testData: SyncData = {
      id: 'test-2',
      data: { key: 'value' },
      timestamp: Date.now()
    };

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    await expect(syncManager.sync(testData)).rejects.toThrow('Network error');

    const queue = syncManager.getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toEqual(testData);
  });

  it('should sync offline queue when back online', async () => {
    const testData: SyncData = {
      id: 'test-3',
      data: { key: 'value' },
      timestamp: Date.now()
    };

    // First sync fails
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    await expect(syncManager.sync(testData)).rejects.toThrow('Network error');

    // Second sync succeeds
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );

    await syncManager.syncOfflineQueue();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(syncManager.getOfflineQueue()).toHaveLength(0);
  });
});