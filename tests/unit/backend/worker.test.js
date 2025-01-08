import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let worker;
import { createMockEnv, createMockRequest } from "../../common/test-helpers";

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "12345678-1234-1234-1234-123456789012",
  },
});

describe("Worker", () => {
  let mockEnv;
  let mockRequest;

  beforeEach(async () => {
    // Reset worker module state
    vi.resetModules();
    worker = (await import("../../../worker/worker.js")).default;

    mockEnv = createMockEnv();
    mockRequest = createMockRequest();

    // Set up default successful responses
    mockEnv.DB.prepare().first.mockResolvedValue({ id: "test-group" });
    mockEnv.SYNC_KV.get.mockResolvedValue("test");
    mockEnv.SYNC_BUCKET.get.mockImplementation(async () => ({
      text: async () =>
        JSON.stringify([{ url: "https://example.com", title: "Example" }]),
    }));
    mockEnv.SYNC_BUCKET.list.mockResolvedValue({
      objects: [
        { key: "test-group/1234567890" },
        { key: "test-group/1234567891" },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("handleSync", () => {
    it("should store sync data and update timestamps", async () => {
      const timestamp = Date.now();
      const syncData = {
        groupId: "test-group",
        deviceId: "test-device",
        data: [{ url: "https://example.com", title: "Example" }],
        timestamp,
      };

      // Mock request data
      mockRequest.url = "http://example.com/api/sync";
      mockRequest.json.mockResolvedValue(syncData);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ success: true });

      // Verify data was stored in R2
      expect(mockEnv.SYNC_BUCKET.put).toHaveBeenCalledWith(
        `test-group/${timestamp}.json`,
        JSON.stringify(syncData.data),
      );

      // Verify latest timestamp was stored in KV
      expect(mockEnv.SYNC_KV.put).toHaveBeenCalledWith(
        "test-group:latest",
        timestamp.toString(),
      );

      // Verify device sync time was updated
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        "INSERT OR REPLACE INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)",
      );
      expect(mockEnv.DB.prepare().bind).toHaveBeenCalledWith(
        "test-device",
        "test-group",
        timestamp,
      );

      // Verify group last_updated was updated
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        "UPDATE sync_groups SET last_updated = ? WHERE id = ?",
      );
      expect(mockEnv.DB.prepare().bind).toHaveBeenCalledWith(
        timestamp,
        "test-group",
      );
    });

    it("should return 404 if group not found", async () => {
      const syncData = {
        groupId: "nonexistent-group",
        deviceId: "test-device",
        data: [],
        timestamp: Date.now(),
      };

      // Mock request data
      mockRequest.url = "http://example.com/api/sync";
      mockRequest.json.mockResolvedValue(syncData);

      // Mock group does not exist
      mockEnv.DB.prepare().first.mockResolvedValue(null);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(result).toEqual({ error: "Group not found" });

      // Verify no data was stored
      expect(mockEnv.SYNC_BUCKET.put).not.toHaveBeenCalled();
      expect(mockEnv.SYNC_KV.put).not.toHaveBeenCalled();
    });
  });

  describe("handleCreateGroup", () => {
    it("should create a new sync group and add device", async () => {
      const deviceId = "test-device";
      const expectedGroupId = "12345678-1234-1234-1234-123456789012";

      // Mock request
      mockRequest.url = "http://example.com/api/create-group";
      mockRequest.json.mockResolvedValue({ deviceId });

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ groupId: expectedGroupId });

      // Verify group was created
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        "INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)",
      );
      expect(mockEnv.DB.prepare().bind).toHaveBeenCalledWith(
        expectedGroupId,
        expect.any(Number),
        expect.any(Number),
      );

      // Verify device was added to group
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        "INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)",
      );
      expect(mockEnv.DB.prepare().bind).toHaveBeenCalledWith(
        deviceId,
        expectedGroupId,
        expect.any(Number),
      );
    });
  });

  describe("handleGetUpdates", () => {
    it("should return updates since last sync", async () => {
      const groupId = "test-group";
      const deviceId = "test-device";
      const since = Date.now() - 1000;
      const latestTimestamp = Date.now().toString();

      // Mock request
      mockRequest.method = "GET";
      mockRequest.url = `http://example.com/api/get-updates?groupId=${groupId}&deviceId=${deviceId}&since=${since}`;

      // Mock device exists
      mockEnv.DB.prepare().first.mockResolvedValue({ id: deviceId });

      // Mock latest timestamp
      mockEnv.SYNC_KV.get.mockResolvedValue(latestTimestamp);

      // Mock updates in R2
      const updates = [
        { url: "https://example1.com", title: "Example 1" },
        { url: "https://example2.com", title: "Example 2" },
      ];
      mockEnv.SYNC_BUCKET.list.mockResolvedValue({
        objects: [
          { key: `${groupId}/${parseInt(latestTimestamp) - 500}` },
          { key: `${groupId}/${latestTimestamp}` },
        ],
      });
      mockEnv.SYNC_BUCKET.get.mockImplementation(async () => ({
        text: async () => JSON.stringify(updates),
      }));

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ updates: [updates, updates] });

      // Verify correct objects were fetched
      expect(mockEnv.SYNC_BUCKET.list).toHaveBeenCalledWith({
        prefix: `${groupId}/`,
        cursor: `${groupId}/${since}`,
      });
    });

    it("should return 404 if device not in group", async () => {
      const groupId = "test-group";
      const deviceId = "nonexistent-device";
      const since = Date.now() - 1000;

      // Mock request
      mockRequest.method = "GET";
      mockRequest.url = `http://example.com/api/get-updates?groupId=${groupId}&deviceId=${deviceId}&since=${since}`;

      // Mock device does not exist
      mockEnv.DB.prepare().first.mockResolvedValue(null);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(result).toEqual({ error: "Device not found in group" });
    });

    it("should return empty updates if no new data", async () => {
      const groupId = "test-group";
      const deviceId = "test-device";
      const since = Date.now();

      // Mock request
      mockRequest.method = "GET";
      mockRequest.url = `http://example.com/api/get-updates?groupId=${groupId}&deviceId=${deviceId}&since=${since}`;

      // Mock device exists
      mockEnv.DB.prepare().first.mockResolvedValue({ id: deviceId });

      // Mock no new updates
      mockEnv.SYNC_KV.get.mockResolvedValue(since.toString());

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({ updates: [] });

      // Verify no objects were fetched
      expect(mockEnv.SYNC_BUCKET.list).not.toHaveBeenCalled();
    });
  });

  describe("handleHealthCheck", () => {
    it("should return healthy when all services are working", async () => {
      // Mock request
      mockRequest.method = "GET";
      mockRequest.url = "http://example.com/health";

      // Mock successful service checks
      mockEnv.DB.prepare().first.mockResolvedValue({ 1: 1 });
      mockEnv.SYNC_KV.get.mockResolvedValue("test");
      mockEnv.SYNC_BUCKET.get.mockImplementation(async () => ({
        text: async () => "test",
      }));

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(result).toEqual({
        status: "healthy",
        services: {
          d1: "ok",
          kv: "ok",
          r2: "ok",
        },
      });

      // Verify service checks
      expect(mockEnv.DB.prepare().first).toHaveBeenCalled();
      expect(mockEnv.SYNC_KV.get).toHaveBeenCalledWith("health-check-key");
      expect(mockEnv.SYNC_BUCKET.get).toHaveBeenCalledWith("health-check.txt");
    });

    it("should return unhealthy when a service fails", async () => {
      // Mock request
      mockRequest.method = "GET";
      mockRequest.url = "http://example.com/health";

      // Mock D1 failure
      mockEnv.DB.prepare().first.mockResolvedValue(null);

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(500);
      expect(result).toEqual({
        status: "unhealthy",
        error: "D1 test failed",
      });
    });
  });

  describe("handleMetrics", () => {
    it("should return current metrics", async () => {
      // Mock request
      mockRequest.method = "GET";
      mockRequest.url = "http://example.com/metrics";

      // Make the request
      const response = await worker.fetch(mockRequest, mockEnv);
      const result = await response.json();

      // Verify response structure
      expect(result).toEqual({
        apiCalls: {
          sync: 0,
          createGroup: 0,
          getUpdates: 0,
          health: 0,
          metrics: 1,
        },
        errors: {
          sync: 0,
          createGroup: 0,
          getUpdates: 0,
          health: 0,
          metrics: 0,
        },
      });
    });
  });
});
