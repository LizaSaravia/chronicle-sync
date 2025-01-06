import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  forbidOnly: false,
  retries: 0,
  workers: undefined,
  reporter: 'list',
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'on'
  },
  globalSetup: './tests/e2e/setup.ts',
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  // Start a web server for dashboard tests
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'on'
  },
});