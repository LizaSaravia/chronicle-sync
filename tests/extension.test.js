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
      product: 'chrome',
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${path.join(__dirname, '../dist')}`,
        `--load-extension=${path.join(__dirname, '../dist')}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      executablePath: '/usr/bin/chromium'
    });

    // Get extension ID
    let extensionTarget;
    let retries = 0;
    const maxRetries = 5;
    
    while (!extensionTarget && retries < maxRetries) {
      const targets = await browser.targets();
      extensionTarget = targets.find(target => {
        try {
          return target.type() === 'service_worker' && target.url().includes('chrome-extension://');
        } catch (e) {
          return false;
        }
      });
      
      if (!extensionTarget) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    if (!extensionTarget) {
      const targets = await browser.targets();
      // Try to find any extension-related target as fallback
      extensionTarget = targets.find(target => {
        try {
          return target.url().includes('chrome-extension://');
        } catch (e) {
          return false;
        }
      });
    }

    if (!extensionTarget) {
      throw new Error('Could not find extension target. Available targets: ' + 
        JSON.stringify(await Promise.all((await browser.targets()).map(async t => ({
          type: t.type(),
          url: await t.url().catch(() => 'unknown')
        }))), null, 2));
    }

    const extensionUrl = await extensionTarget.url();
    extensionId = extensionUrl.split('/')[2];
    console.log('Found extension ID:', extensionId);

    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    // Clear storage and databases
    const context = browser.defaultBrowserContext();
    await context.clearPermissionOverrides();
    
    // Navigate to extension page first to ensure we have the right permissions
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Grant necessary permissions
    await context.overridePermissions(`chrome-extension://${extensionId}`, [
      'clipboard-read',
      'clipboard-write'
    ]);
    
    try {
      await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('chronicle-sync');
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.clear();
        }
      });
    } catch (e) {
      console.log('Warning: Could not clear all storage:', e.message);
    }
  });

  test('complete setup and sync flow', async () => {
    // Visit popup page and wait for it to load
    console.log('Navigating to extension popup...');
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle0' });
    console.log('Waiting for extension to initialize...');
    await page.waitForFunction(() => document.readyState === 'complete');
    
    // Log the page content to help debug issues
    const content = await page.content();
    console.log('Page content:', content.slice(0, 500) + '...');
    
    await takeScreenshot(page, 'initial-popup');
    
    // Verify initial state
    try {
      await page.waitForSelector('.not-setup', { visible: true, timeout: 5000 });
      const setupBtn = await page.waitForSelector('#setup-btn', { visible: true, timeout: 5000 });
      if (!setupBtn) {
        throw new Error('Setup button not found');
      }
      console.log('Found initial state elements');
    } catch (e) {
      console.error('Failed to find initial state selectors:', e.message);
      console.log('Current page content:', await page.content());
      throw e;
    }
    
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