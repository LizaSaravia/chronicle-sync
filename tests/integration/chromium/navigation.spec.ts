import { test, expect } from '@playwright/test';

/**
 * This test validates navigation to the main dashboard of the application.
 * It ensures that the dashboard loads correctly and the title matches the expected value.
 */
test('Navigate to Dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000'); // replace with actual URL
  const title = await page.title();
  expect(title).toBe('Chronicle Sync Dashboard');
});