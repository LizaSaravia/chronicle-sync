import { test as baseTest } from '@playwright/test';

/**
 * This file extends the base Playwright test object to include common configurations and setups.
 * Example: Setting a base URL for all tests.
 */
export const test = baseTest.extend({
  // Define common fixtures or context here.
});

export const baseURL = 'http://localhost:3000'; // Base URL for the application (replace as needed).