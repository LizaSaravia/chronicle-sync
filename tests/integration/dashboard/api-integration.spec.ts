import { test, expect } from '@playwright/test';

/**
 * This test validates that the dashboard correctly interacts with the backend API.
 * It mocks an API response and ensures the front-end renders the data accurately.
 */
test('Fetch and render data from API', async ({ page }) => {
  page.route('**/api/records', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Record' }]), // Simulate backend response with test data.
    });
  });

  await page.goto('http://localhost:3000/records'); // replace with actual endpoint
  const recordText = await page.textContent('.record'); 
  expect(recordText).toBe('Mock Record'); 
});