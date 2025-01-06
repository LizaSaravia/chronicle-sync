import { chromium } from '@playwright/test';

// Mock chrome API
declare global {
  interface Window {
    chrome: {
      runtime: {
        onInstalled: {
          addListener: () => void;
        };
        sendMessage: () => void;
        onMessage: {
          addListener: () => void;
          removeListener: () => void;
        };
      };
      storage: {
        local: {
          get: () => Promise<Record<string, unknown>>;
          set: () => Promise<void>;
        };
      };
    };
  }
}

// Global setup function
export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Add chrome API mock to all pages
  await context.addInitScript(() => {
    window.chrome = {
      runtime: {
        onInstalled: {
          addListener: () => {},
        },
        sendMessage: () => {},
        onMessage: {
          addListener: () => {},
          removeListener: () => {},
        },
      },
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
        },
      },
    };
  });

  await context.close();
  await browser.close();
}