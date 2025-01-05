import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    maxConcurrency: 1, // Run E2E tests sequentially
    maxThreads: 2, // Limit parallel test files
    minThreads: 1,
    isolate: false, // Share browser instance between tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/setup.js']
    }
  }
});