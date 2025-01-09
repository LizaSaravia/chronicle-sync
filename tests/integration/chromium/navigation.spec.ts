import { test, expect } from '@playwright/test';

test('Navigate to Dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000'); // Replace with actual URL
  const title = await page.title();
  expect(title).toBe('Web Dashboard'); // Replace with expected title
});