import { test, expect } from '@playwright/test';

test('Perform a complex workflow', async ({ page }) => {
  await page.goto('http://localhost:3000/login'); // Replace with login URL
  await page.fill('#username', 'testuser'); // Replace selectors
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
});