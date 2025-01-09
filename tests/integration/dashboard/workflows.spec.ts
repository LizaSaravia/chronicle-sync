import { test, expect } from '@playwright/test';

test('Verify a CRUD operation', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('button#add-record'); // Replace selector
  await page.fill('#record-name', 'Test Record');
  await page.click('button#save-record');
  const recordText = await page.textContent('.record:last-child'); // Replace selector
  expect(recordText).toBe('Test Record');
});