import { expect } from "@playwright/test";

import { test } from "../../common/fixtures";

test.describe("Initial setup", () => {
  test("should pass basic test", async () => {
    expect(true).toBe(true);
  });

  test("should have Chrome extension APIs mocked", async ({ page }) => {
    // Set up a basic page for testing Chrome API
    await page.setContent(`
      <html>
        <head>
          <title>Chrome API Test</title>
        </head>
        <body>
          <h1>Chrome API Test</h1>
          <div id="status">Checking Chrome API...</div>
        </body>
      </html>
    `);

    // Use the screenshot directory from environment variable
    const screenshotDir =
      process.env.SCREENSHOT_DIR || "test-results/screenshots";

    // Take screenshot before checking API
    await page.screenshot({ path: `${screenshotDir}/chrome-api-before.png` });

    // Verify Chrome API is available
    const hasChromeApi = await page.evaluate(() => {
      const status = document.getElementById("status");
      if (window.chrome) {
        status.textContent = "Chrome API is available";
        return true;
      } else {
        status.textContent = "Chrome API is not available";
        return false;
      }
    });
    expect(hasChromeApi).toBe(true);

    // Take screenshot after checking API
    await page.screenshot({ path: `${screenshotDir}/chrome-api-after.png` });
  });
});
