import { test, expect } from '@playwright/test';

test('Fetch and render data from API', async ({ page }) => {
  page.route('**/api/records', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Record' }]),
    });
  });

  await page.goto('http://localhost:3000/records'); // Replace with actual URL
  const recordText = await page.textContent('.record'); // Replace selector
  expect(recordText).toBe('Mock Record');
});