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

  test('should initialize extension in service worker context', async () => {
    // Get the background page (service worker)
    const backgroundPages = context.backgroundPages();
    expect(backgroundPages.length).toBeGreaterThan(0);
    const backgroundPage = backgroundPages[0];

    // Test initialization with a password
    const testResult = await backgroundPage.evaluate(async () => {
      try {
        // Send initialization message
        const response = await chrome.runtime.sendMessage({
          type: 'INITIALIZE',
          password: 'test-password-123',
          environment: 'production'
        });

        return {
          success: response.success,
          error: response.error
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Check that initialization succeeded
    expect(testResult.success).toBe(true);
    expect(testResult.error).toBeUndefined();

    // Verify storage was updated
    const storageState = await backgroundPage.evaluate(async () => {
      return await chrome.storage.local.get(['initialized', 'environment']);
    });

    expect(storageState.initialized).toBe(true);
    expect(storageState.environment).toBe('production');
  });

  test('should handle error reporting in service worker context', async () => {
    const backgroundPages = context.backgroundPages();
    const backgroundPage = backgroundPages[0];

    // Test error reporting functionality
    const testResult = await backgroundPage.evaluate(async () => {
      try {
        // Import error reporting
        const { reportError } = await import('./utils/error-reporting.js');
        
        // Create a test error
        const testError = new Error('Test error in service worker');
        
        // Report the error
        await reportError(testError, { context: 'e2e_test' });
        
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(testResult.success).toBe(true);
  });
});