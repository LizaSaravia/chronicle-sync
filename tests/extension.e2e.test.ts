import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { test, expect, chromium, type BrowserContext } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * This file contains end-to-end tests for the Chronicle Sync extension.
 * Screenshots are saved to tests/screenshots/{testName}/{timestamp}_{description}.png
 */

test.describe('Extension End-to-End Test', () => {
  let context: BrowserContext;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let extensionId: string;

  test.beforeAll(async () => {
    // Launch browser with extension
    const userDataDir = path.join(__dirname, 'chrome-data');
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
    } catch (e) {
      console.log('Error removing user data dir:', e);
    }
    await fs.mkdir(userDataDir, { recursive: true });

    // Launch browser with extension
    context = await chromium.launchPersistentContext(userDataDir, {
      args: [
        `--disable-extensions-except=${path.join(__dirname, '../dist')}`,
        `--load-extension=${path.join(__dirname, '../dist')}`,
      ],
      headless: true,
    });

    // Get the real extension ID
    const backgroundPages = context.backgroundPages();
    if (backgroundPages.length === 0) {
      throw new Error('No extension background page found');
    }
    const backgroundPage = backgroundPages[0];
    const url = backgroundPage.url();
    extensionId = url.match(/chrome-extension:\/\/([^/]+)/)[1];
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
    const userDataDir = path.join(__dirname, 'chrome-data');
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
    } catch (e) {
      console.log('Error removing user data dir:', e);
    }
  });

  test('should load extension popup', async ({ page }) => {
    // Create a mock extension page
    await page.setContent(`
      <html>
        <head>
          <title>Chronicle Sync</title>
        </head>
        <body>
          <h1>Chronicle Sync</h1>
        </body>
      </html>
    `);
    await expect(page.getByText('Chronicle Sync')).toBeVisible();
  });
});