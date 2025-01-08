import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  forbidOnly: false,
  retries: 0,
  workers: undefined,
  reporter: "list",
  use: {
    trace: "on",
    video: "on",
    screenshot: "on",
    // Use the environment variable for screenshot directory if provided
    _screenshotDir: process.env.SCREENSHOT_DIR || "./test-results/screenshots",
  },
  globalSetup: "./tests/e2e/setup.ts",
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
