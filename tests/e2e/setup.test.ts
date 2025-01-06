import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Initial setup', () => {
  test('should pass basic test', async () => {
    expect(true).toBe(true);
  });

  test('should have Chrome extension APIs mocked', async ({ page }) => {
    // Verify Chrome API is available
    const hasChromeApi = await page.evaluate(() => !!window.chrome);
    expect(hasChromeApi).toBe(true);
  });
});