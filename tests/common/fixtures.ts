import { test as base } from '@playwright/test';

// Create a test fixture that includes the mocked chrome API
export const test = base.extend({
  context: async ({ context }, use) => {
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

    await use(context);
  },
});