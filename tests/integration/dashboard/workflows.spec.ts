import { test, expect } from '@playwright/test';

/**
 * This test verifies the functionality of a CRUD operation on the dashboard.
 * It ensures a new record can be added and is displayed in the record list.
 */
test('Verify a CRUD operation', async ({ page }) => {
  await page.goto('http://localhost:3000'); // Navigate to the main dashboard.
  await page.click('button#add-record'); // replace selector
  await page.fill('#record-name', 'Test Record'); // replace selector
  await page.click('button#save-record'); // replace selector
  const recordText = await page.textContent('.record:last-child');
  expect(recordText).toBe('Test Record');
});