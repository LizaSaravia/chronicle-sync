import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import worker from '../../worker/worker.js';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012'
  }
});

describe('Worker', () => {
  let mockEnv;
  let mockDB;
  let mockKV;
  let mockBucket;
  let mockRequest;

  beforeEach(() => {
    // Mock D1 database
    mockDB = {
      exec: vi.fn().mockResolvedValue(undefined),
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn(),
        run: vi.fn()
      })
    };

    // Mock KV storage
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    // Mock R2 bucket
    mockBucket = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn()
    };

    // Mock environment
    mockEnv = {
      DB: mockDB,
      SYNC_KV: mockKV,
      SYNC_BUCKET: mockBucket
    };

    // Mock request
    mockRequest = {
      method: 'POST',
      url: 'http://example.com/api/sync',
      json: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSync', () => {
    it('should store sync data and update timestamps', async () => {
      const timestamp = Date.now();
      const syncData = {
        groupId: 'test-group',
        deviceId: 'test-device',
        data: [{ url: 'https://example.com', title: 'Example' }],
        timestamp
      };

      // Mock request data
      mockRequest.json.mockResolvedValue(syncData);

      // Mock group exists
      mockDB.prepare().first.mockResolvedValue({ id: 'test-group' });

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ success: true });

      // Verify data was stored in R2
      expect(mockBucket.put).toHaveBeenCalledWith(
        `test-group/${timestamp}.json`,
        JSON.stringify(syncData.data)
      );

      // Verify latest timestamp was stored in KV
      expect(mockKV.put).toHaveBeenCalledWith(
        'test-group:latest',
        timestamp.toString()
      );

      // Verify device sync time was updated
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)'
      );
      expect(mockDB.prepare().bind).toHaveBeenCalledWith('test-device', 'test-group', timestamp);

      // Verify group last_updated was updated
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'UPDATE sync_groups SET last_updated = ? WHERE id = ?'
      );
      expect(mockDB.prepare().bind).toHaveBeenCalledWith(timestamp, 'test-group');
    });

    it('should return 404 if group not found', async () => {
      const syncData = {
        groupId: 'nonexistent-group',
        deviceId: 'test-device',
        data: [],
        timestamp: Date.now()
      };

      // Mock request data
      mockRequest.json.mockResolvedValue(syncData);

      // Mock group does not exist
      mockDB.prepare().first.mockResolvedValue(null);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(result).toEqual({ error: 'Group not found' });

      // Verify no data was stored
      expect(mockBucket.put).not.toHaveBeenCalled();
      expect(mockKV.put).not.toHaveBeenCalled();
    });
  });

  describe('handleCreateGroup', () => {
    it('should create a new sync group and add device', async () => {
      const deviceId = 'test-device';
      const expectedGroupId = '12345678-1234-1234-1234-123456789012';

      // Mock request
      mockRequest.url = 'http://example.com/api/create-group';
      mockRequest.json.mockResolvedValue({ deviceId });

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ groupId: expectedGroupId });

      // Verify group was created
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)'
      );
      expect(mockDB.prepare().bind).toHaveBeenCalledWith(expectedGroupId, expect.any(Number), expect.any(Number));

      // Verify device was added to group
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)'
      );
      expect(mockDB.prepare().bind).toHaveBeenCalledWith(deviceId, expectedGroupId, expect.any(Number));
    });
  });

  describe('handleGetUpdates', () => {
    it('should return updates since last sync', async () => {
      const groupId = 'test-group';
      const deviceId = 'test-device';
      const since = Date.now() - 1000;
      const latestTimestamp = Date.now().toString();

      // Mock request
      mockRequest.method = 'GET';
      mockRequest.url = `http://example.com/api/get-updates?groupId=${groupId}&deviceId=${deviceId}&since=${since}`;

      // Mock device exists
      mockDB.prepare().first.mockResolvedValue({ id: deviceId });

      // Mock latest timestamp
      mockKV.get.mockResolvedValue(latestTimestamp);

      // Mock updates in R2
      const updates = [
        { url: 'https://example1.com', title: 'Example 1' },
        { url: 'https://example2.com', title: 'Example 2' }
      ];
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: `${groupId}/${parseInt(latestTimestamp) - 500}` },
          { key: `${groupId}/${latestTimestamp}` }
        ]
      });
      mockBucket.get.mockImplementation(async () => ({
        text: async () => JSON.stringify(updates)
      }));

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ updates: [updates, updates] });

      // Verify correct objects were fetched
      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: `${groupId}/`,
        cursor: `${groupId}/${since}`
      });
    });

    it('should return 404 if device not in group', async () => {
      const groupId = 'test-group';
      const deviceId = 'nonexistent-device';
      const since = Date.now() - 1000;

      // Mock request
      mockRequest.method = 'GET';
      mockRequest.url = `http://example.com/api/get-updates?groupId=${groupId}&deviceId=${deviceId}&since=${since}`;

      // Mock device does not exist
      mockDB.prepare().first.mockResolvedValue(null);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(result).toEqual({ error: 'Device not found in group' });
    });

    it('should return empty updates if no new data', async () => {
      const groupId = 'test-group';
      const deviceId = 'test-device';
      const since = Date.now();

      // Mock request
      mockRequest.method = 'GET';
      mockRequest.url = `http://example.com/api/get-updates?groupId=${groupId}&deviceId=${deviceId}&since=${since}`;

      // Mock device exists
      mockDB.prepare().first.mockResolvedValue({ id: deviceId });

      // Mock no new updates
      mockKV.get.mockResolvedValue(since.toString());

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ updates: [] });

      // Verify no objects were fetched
      expect(mockBucket.list).not.toHaveBeenCalled();
    });
  });

  describe('handleHealthCheck', () => {
    it('should return healthy when all services are working', async () => {
      // Mock request
      mockRequest.method = 'GET';
      mockRequest.url = 'http://example.com/health';

      // Mock successful service checks
      mockDB.prepare().first.mockResolvedValue({ '1': 1 });
      mockKV.get.mockResolvedValue('test');
      mockBucket.get.mockImplementation(async () => ({
        text: async () => 'test'
      }));

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({
        status: 'healthy',
        services: {
          d1: 'ok',
          kv: 'ok',
          r2: 'ok'
        }
      });

      // Verify service checks
      expect(mockDB.prepare().first).toHaveBeenCalled();
      expect(mockKV.get).toHaveBeenCalledWith('health-check-key');
      expect(mockBucket.get).toHaveBeenCalledWith('health-check.txt');
    });

    it('should return unhealthy when a service fails', async () => {
      // Mock request
      mockRequest.method = 'GET';
      mockRequest.url = 'http://example.com/health';

      // Mock D1 failure
      mockDB.prepare().first.mockResolvedValue(null);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(500);
      expect(result).toEqual({
        status: 'unhealthy',
        error: 'D1 test failed'
      });
    });
  });

  describe('handleMetrics', () => {
    it('should return current metrics', async () => {
      // Mock request
      mockRequest.method = 'GET';
      mockRequest.url = 'http://example.com/metrics';

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response structure
      expect(result).toHaveProperty('apiCalls');
      expect(result).toHaveProperty('errors');
      expect(result.apiCalls).toHaveProperty('sync');
      expect(result.apiCalls).toHaveProperty('createGroup');
      expect(result.apiCalls).toHaveProperty('getUpdates');
      expect(result.apiCalls).toHaveProperty('health');
      expect(result.apiCalls).toHaveProperty('metrics');
      expect(result.errors).toHaveProperty('sync');
      expect(result.errors).toHaveProperty('createGroup');
      expect(result.errors).toHaveProperty('getUpdates');
      expect(result.errors).toHaveProperty('health');
      expect(result.errors).toHaveProperty('metrics');

      // Verify metrics call was counted
      expect(result.apiCalls.metrics).toBe(1);
    });
  });
});