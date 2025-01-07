import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig, devices } from '@playwright/test';

import { baseConfig } from './tests/common/test-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e',
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--disable-extensions-except=${path.join(__dirname, 'dist')}`,
            `--load-extension=${path.join(__dirname, 'dist')}`,
          ],
        },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec http-server dist -p 3000',
      port: 3000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm run dev:worker',
      port: 8787,
      reuseExistingServer: false,
    }
  ],
});
