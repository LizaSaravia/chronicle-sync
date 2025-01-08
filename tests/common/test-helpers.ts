import { vi } from "vitest";

import { API_BASE, API_PATHS } from "../../src/shared/constants.js";

export function createMockDB() {
  return {
    exec: vi.fn().mockResolvedValue(undefined),
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      run: vi.fn(),
    }),
  };
}

export function createMockKV() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockBucket() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };
}

export function createMockEnv() {
  return {
    DB: createMockDB(),
    SYNC_KV: createMockKV(),
    SYNC_BUCKET: createMockBucket(),
  };
}

export function createMockRequest(
  method = "POST",
  url = `${API_BASE.development}${API_PATHS.sync}`,
) {
  return {
    method,
    url,
    json: vi.fn(),
  };
}

export function createMockAuthService() {
  return {
    isAuthenticated: vi.fn().mockReturnValue(true),
    getToken: vi.fn().mockReturnValue("mock-token"),
    getGroupId: vi.fn().mockReturnValue("mock-group"),
  };
}

export function mockFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  }) as unknown as typeof fetch;
}

export function mockConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}
