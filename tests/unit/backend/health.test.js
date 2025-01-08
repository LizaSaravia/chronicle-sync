import { describe, it, expect, vi, beforeEach } from "vitest";

import worker from "../../../src/backend/index.js";

describe("Health endpoint", () => {
  let env;

  beforeEach(() => {
    // Mock environment with all services
    env = {
      DB: {
        prepare: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ value: 1 }),
        })),
        exec: vi.fn(),
      },
      SYNC_KV: {
        put: vi.fn(),
        delete: vi.fn(),
      },
      SYNC_BUCKET: {
        put: vi.fn(),
        delete: vi.fn(),
      },
      ENVIRONMENT: "test",
    };
  });

  it("should return 200 and healthy status when all services are working", async () => {
    const request = new Request("https://api.chroniclesync.xyz/health");
    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: "healthy",
      services: {
        db: "ok",
        kv: "ok",
        r2: "ok",
      },
      environment: "test",
    });

    // Verify service checks were called
    expect(env.DB.prepare).toHaveBeenCalledWith("SELECT 1 AS health_check");
    expect(env.SYNC_KV.put).toHaveBeenCalledWith("health-check", "test");
    expect(env.SYNC_KV.delete).toHaveBeenCalledWith("health-check");
    expect(env.SYNC_BUCKET.put).toHaveBeenCalledWith("health-check", "test");
    expect(env.SYNC_BUCKET.delete).toHaveBeenCalledWith("health-check");
  });

  it("should return 500 and unhealthy status when DB fails", async () => {
    env.DB.prepare = vi.fn(() => {
      throw new Error("DB connection failed");
    });

    const request = new Request("https://api.chroniclesync.xyz/health");
    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: "unhealthy",
      services: {
        db: "error",
        kv: "ok",
        r2: "ok",
      },
      environment: "test",
      errors: ["DB error: DB connection failed"],
    });
  });

  it("should return 500 and unhealthy status when KV fails", async () => {
    env.SYNC_KV.put = vi.fn(() => {
      throw new Error("KV write failed");
    });

    const request = new Request("https://api.chroniclesync.xyz/health");
    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: "unhealthy",
      services: {
        db: "ok",
        kv: "error",
        r2: "ok",
      },
      environment: "test",
      errors: ["KV error: KV write failed"],
    });
  });

  it("should return 500 and unhealthy status when R2 fails", async () => {
    env.SYNC_BUCKET.put = vi.fn(() => {
      throw new Error("R2 write failed");
    });

    const request = new Request("https://api.chroniclesync.xyz/health");
    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: "unhealthy",
      services: {
        db: "ok",
        kv: "ok",
        r2: "error",
      },
      environment: "test",
      errors: ["R2 error: R2 write failed"],
    });
  });

  it("should return 500 and unhealthy status when multiple services fail", async () => {
    env.DB.prepare = vi.fn(() => {
      throw new Error("DB connection failed");
    });
    env.SYNC_KV.put = vi.fn(() => {
      throw new Error("KV write failed");
    });

    const request = new Request("https://api.chroniclesync.xyz/health");
    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: "unhealthy",
      services: {
        db: "error",
        kv: "error",
        r2: "ok",
      },
      environment: "test",
      errors: [
        "DB error: DB connection failed",
        "KV error: KV write failed",
      ],
    });
  });
});