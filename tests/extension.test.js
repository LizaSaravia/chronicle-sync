const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { CryptoManager } = require('../src/extension/utils/crypto');

/**
 * This file contains end-to-end tests for the Chronicle Sync extension.
 * Screenshots are saved to tests/screenshots/{testName}/{timestamp}_{description}.png
 */

describe('Extension End-to-End Test', () => {
  let browser;
  let page;
  let extensionId;
  let screenshotDir;

  /**
   * Takes a screenshot and saves it with a descriptive name
   * @param {puppeteer.Page} targetPage - The page to screenshot
   * @param {string} description - Description of the screenshot
   */
  async function takeScreenshot(targetPage, description) {
    if (process.env.CI) return; // Skip screenshots in CI

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${description}.png`;
    const filePath = path.join(screenshotDir, fileName);
    
    await targetPage.screenshot({
      path: filePath,
      fullPage: true
    });
    console.log(`Screenshot saved: ${filePath}`);
  }

  beforeAll(async () => {
    // Skip in CI environment for now
    if (process.env.CI) {
      console.log('Skipping E2E tests in CI environment');
      return;
    }

    // Create screenshots directory
    screenshotDir = path.join(__dirname, 'screenshots', 'setup-flow');
    await fs.mkdir(screenshotDir, { recursive: true });

    // Build the extension
    await new Promise((resolve, reject) => {
      require('child_process').exec('npm run build', (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Launch browser with extension
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${path.join(__dirname, '../dist')}`,
        `--load-extension=${path.join(__dirname, '../dist')}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      executablePath: process.env.CHROME_PATH || undefined
    });

    // Get extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'service_worker' && 
      target.url().includes('chrome-extension://')
    );
    const extensionUrl = extensionTarget.url();
    extensionId = extensionUrl.split('/')[2];

    page = await browser.newPage();
  });

  afterAll(async () => {
    if (process.env.CI) return;

    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    if (process.env.CI) return;

    // Clear storage and databases
    const context = browser.defaultBrowserContext();
    await context.clearPermissionOverrides();
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('chronicle-sync');
      chrome.storage.local.clear();
    });
  });

  test('complete setup and sync flow', async () => {
    // Skip in CI environment for now
    if (process.env.CI) {
      console.log('Skipping E2E test in CI environment');
      return;
    }

    // Visit popup page
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await takeScreenshot(page, 'initial-popup');
    
    // Verify initial state
    await page.waitForSelector('.not-setup');
    await page.waitForSelector('#setup-btn');
    
    // Click setup button
    await page.click('#setup-btn');
    
    // Switch to options page
    const pages = await browser.pages();
    const optionsPage = pages[pages.length - 1];
    await optionsPage.waitForSelector('#password');
    await takeScreenshot(optionsPage, 'setup-form');
    
    // Set up password
    await optionsPage.type('#password', 'ValidPassword123!');
    await optionsPage.type('#confirm-password', 'ValidPassword123!');
    await optionsPage.click('#setup-btn');
    
    // Wait for success message
    await optionsPage.waitForSelector('.success');
    await takeScreenshot(optionsPage, 'setup-success');
    const successText = await optionsPage.$eval('.success', el => el.textContent);
    expect(successText).toContain('Chronicle Sync has been successfully set up');
    
    // Go back to popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await takeScreenshot(page, 'popup-after-setup');
    
    // Add test history entries
    await page.evaluate(() => {
      const entries = [
        { title: 'Test Page 1', url: 'https://example.com/1' },
        { title: 'Test Page 2', url: 'https://example.com/2' }
      ];
      
      entries.forEach(entry => {
        chrome.history.addUrl({ url: entry.url });
      });
    });
    
    // Force sync
    await page.waitForSelector('#sync-btn');
    await page.click('#sync-btn');
    
    // Wait for sync to complete
    await page.waitForSelector('#sync-loading');
    await takeScreenshot(page, 'sync-in-progress');
    await page.waitForSelector('#sync-loading', { hidden: true });
    
    // Verify history entries
    const historyItems = await page.$$('.history-item');
    expect(historyItems.length).toBe(2);
    await takeScreenshot(page, 'history-entries');
    
    const firstItemText = await page.$eval('.history-item:first-child', el => el.textContent);
    const lastItemText = await page.$eval('.history-item:last-child', el => el.textContent);
    expect(firstItemText).toContain('Test Page 1');
    expect(lastItemText).toContain('Test Page 2');
    
    // Test sync between devices
    await page.evaluate(async () => {
      const crypto = new CryptoManager('ValidPassword123!');
      const newHistory = [
        { title: 'Test Page 1', url: 'https://example.com/1' },
        { title: 'Test Page 2', url: 'https://example.com/2' },
        { title: 'Test Page 3', url: 'https://example.com/3' }
      ];
      
      const encryptedData = await crypto.encrypt(newHistory);
      
      await fetch('http://localhost:3000/sync/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: 'default',
          encryptedData
        })
      });
    });
    
    // Force sync again
    await page.click('#sync-btn');
    
    // Verify updated history
    await page.waitForFunction(
      () => document.querySelectorAll('.history-item').length === 3
    );
    await takeScreenshot(page, 'updated-history');
    
    const lastItemTextAfterSync = await page.$eval('.history-item:last-child', el => el.textContent);
    expect(lastItemTextAfterSync).toContain('Test Page 3');
  }, 30000);
});