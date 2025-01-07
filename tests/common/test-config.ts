import { defineConfig } from '@playwright/test';

export const baseConfig = {
  testDir: '../',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: 'test-results',
  preserveOutput: 'always',
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
};

export default defineConfig(baseConfig);