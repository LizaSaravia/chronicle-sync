import { API_BASE, API_PATHS } from "../../src/shared/constants.js";

describe("Worker Health Check", () => {
  async function checkHealth(url) {
    const response = await fetch(`${url}${API_PATHS.health}`);
    const data = await response.json();
    return { response, data };
  }

  test("staging health check returns healthy status", async () => {
    const { response, data } = await checkHealth(API_BASE.staging);
    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services).toEqual({
      d1: "ok",
      kv: "ok",
      r2: "ok",
    });
  });

  test("production health check returns healthy status", async () => {
    const { response, data } = await checkHealth(API_BASE.production);
    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services).toEqual({
      d1: "ok",
      kv: "ok",
      r2: "ok",
    });
  });
});
