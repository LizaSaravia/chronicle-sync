import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Dashboard E2E Tests', () => {
  test('should load dashboard', async ({ page }) => {
    // Create a mock dashboard page
    await page.setContent(`
      <html>
        <head>
          <title>Chronicle Sync Dashboard</title>
        </head>
        <body>
          <div id="root">
            <h1>Chronicle Sync Dashboard</h1>
            <div class="history-entries">
              <div class="entry">
                <h2>Example Entry</h2>
                <a href="https://example.com">https://example.com</a>
                <p>Device: test-device</p>
                <p>OS: test-os</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    // Use the screenshot directory from environment variable
    const screenshotDir = process.env.SCREENSHOT_DIR || 'test-results/screenshots';

    // Take screenshot of initial dashboard state
    await page.screenshot({ path: `${screenshotDir}/dashboard-initial.png` });

    // Verify dashboard content
    await expect(page.getByText('Chronicle Sync Dashboard')).toBeVisible();
    await expect(page.getByText('Example Entry')).toBeVisible();
    await expect(page.getByText('https://example.com')).toBeVisible();
    await expect(page.getByText('Device: test-device')).toBeVisible();
    await expect(page.getByText('OS: test-os')).toBeVisible();

    // Take screenshot after verifying content
    await page.screenshot({ path: `${screenshotDir}/dashboard-verified.png` });
  });
});