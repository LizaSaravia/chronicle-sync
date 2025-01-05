import puppeteer from 'puppeteer';
import { beforeAll, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom';

let browser;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  global.__BROWSER__ = browser;
});

afterAll(async () => {
  if (browser) {
    await browser.close();
  }
});

// Mock chrome API
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
};

// Setup and teardown for Puppeteer tests
if (process.env.RUN_E2E === 'true') {
  beforeAll(async () => {
    // Any E2E setup code
  });

  afterAll(async () => {
    // Any E2E cleanup code
  });
}