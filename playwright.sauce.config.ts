import { defineConfig } from "@playwright/test";

import { baseConfig } from "./tests/common/test-config";

export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  workers: process.env.CI ? 3 : undefined,
  use: {
    ...baseConfig.use,
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "on",
    _screenshotDir: process.env.SCREENSHOT_DIR || "./test-results/screenshots",
  },
  projects: [
    {
      name: "chrome@sauce:Windows 11",
      use: {
        browserName: "chromium",
        channel: "chrome",
        platform: "Windows 11",
      },
    },
  ],
  // We don't need a web server for extension tests
  webServer: null,
});
