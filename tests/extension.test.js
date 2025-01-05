import fs from 'fs/promises';
import path from 'path';

import puppeteer from 'puppeteer';

/**
 * This file contains end-to-end tests for the Chronicle Sync extension.
 * Screenshots are saved to tests/screenshots/{testName}/{timestamp}_{description}.png
 */

// Set timeout for all tests in this suite
const timeout = process.env.CI ? 60000 : 30000;

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
      import('child_process').then(({ exec }) => {
        exec('npm run build', (error) => {
          if (error) reject(error);
          else resolve();
        });
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
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium'
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
    page.on('console', msg => console.log('Browser log:', msg.text()));
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
        // Clear all storage
        localStorage.clear();
        indexedDB.deleteDatabase('chronicle-sync');
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.clear();
        }
        
        // Clear browser history
        if (chrome && chrome.history) {
          chrome.history.deleteAll();
        }
      });
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
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
      await page.waitForSelector('.not-setup', { visible: true, timeout: process.env.CI ? 15000 : 5000 });
      const setupBtn = await page.waitForSelector('#setup-btn', { visible: true, timeout: process.env.CI ? 15000 : 5000 });
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
    console.log('Clicking setup button...');
    await page.click('#setup-btn');
    
    // Wait a bit for the options page to open
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Switch to options page
    console.log('Switching to options page...');
    const pages = await browser.pages();
    console.log('Found pages:', pages.length);
    
    // Log all pages
    for (let i = 0; i < pages.length; i++) {
      const url = await pages[i].url();
      console.log(`Page ${i}: ${url}`);
    }
    
    const optionsPage = pages[pages.length - 1];
    optionsPage.on('console', msg => console.log('Browser log:', msg.text()));
    console.log('Options page URL:', await optionsPage.url());
    
    try {
      await optionsPage.waitForSelector('#password', { timeout: process.env.CI ? 15000 : 5000 });
      console.log('Found password field');
      await takeScreenshot(optionsPage, 'setup-form');
    } catch (e) {
      console.error('Failed to find password field:', e.message);
      console.log('Options page content:', await optionsPage.content());
      throw e;
    }
    
    // Set up password
    console.log('Setting up password...');
    await optionsPage.type('#password', 'ValidPassword123!');
    await optionsPage.type('#confirm-password', 'ValidPassword123!');
    
    // Add error listener before clicking
    await optionsPage.evaluate(() => {
      window.addEventListener('error', (e) => {
        console.error('Page error:', e.message);
      });
      window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled rejection:', e.reason);
      });
    });
    
    // Click and wait for either success or error
    console.log('Submitting setup form...');
    await optionsPage.click('#setup-btn');
    
    // Wait for response
    await optionsPage.waitForFunction(() => {
      const success = document.querySelector('.success');
      const error = document.querySelector('.error');
      return (success && success.style.display === 'block') || 
             (error && error.style.display === 'block');
    }, { timeout: process.env.CI ? 30000 : 10000 });
    
    // Wait for success message
    console.log('Waiting for success message...');
    try {
      await optionsPage.waitForSelector('.success', { 
        visible: true,
        timeout: process.env.CI ? 30000 : 10000  // Longer timeout in CI for success message
      });
      console.log('Success element found, checking content...');
      
      const successText = await optionsPage.$eval('.success', el => el.textContent);
      console.log('Success text:', successText);
      
      // Check if there are any errors
      const errorText = await optionsPage.$eval('.error', el => el.textContent).catch(() => null);
      if (errorText) {
        console.log('Error message found:', errorText);
      }
      
      await takeScreenshot(optionsPage, 'setup-success');
      expect(successText).toContain('Chronicle Sync has been successfully set up');
    } catch (e) {
      console.error('Failed to verify success:', e.message);
      console.log('Current page content:', await optionsPage.content());
      throw e;
    }
    
  }, timeout);
});