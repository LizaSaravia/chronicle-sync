import { test as baseTest } from '@playwright/test';

export const test = baseTest.extend({
  // Add common fixtures or setup here
});

export const baseURL = 'http://localhost:3000'; // Replace with base URL