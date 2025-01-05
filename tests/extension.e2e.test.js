import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

import puppeteer from 'puppeteer-core';
import { vi } from 'vitest';

/**
 * This file contains end-to-end tests for the Chronicle Sync extension.
 * Screenshots are saved to tests/screenshots/{testName}/{timestamp}_{description}.png
 */

// Set timeout for all tests in this suite
const timeout = process.env.CI ? 30000 : 15000;

describe('Extension End-to-End Test', () => {
  vi.setConfig({ hookTimeout: timeout });
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
    if (!process.env.SCREENSHOTS_FOR_DOCS) {
      return; // Skip screenshots unless explicitly requested
    }
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
    // Create screenshots directory only if needed
    if (process.env.SCREENSHOTS_FOR_DOCS) {
      screenshotDir = process.env.SCREENSHOT_DIR
        ? path.join(process.env.SCREENSHOT_DIR, 'setup-flow')
        : path.join(__dirname, 'screenshots', 'setup-flow');
      await fs.mkdir(screenshotDir, { recursive: true });
    }

    // Check if extension is built
    try {
      await fs.access(path.join(__dirname, '../dist'));
    } catch {
      console.log('Extension not built, skipping E2E tests');
      return;
    }

    // Log extension directory contents
    const distPath = path.join(__dirname, '../dist');
    console.log('Extension directory contents:', await fs.readdir(distPath));

    // Launch browser with extension
    const userDataDir = path.join(__dirname, 'chrome-data');
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
    } catch (e) {
      console.log('Error removing user data dir:', e.message);
    }
    await fs.mkdir(userDataDir, { recursive: true });

    // Launch Chrome with extensions enabled
    browser = await puppeteer.launch({
      headless: false, // Extensions don't work in headless mode
      userDataDir,
      args: [
        `--disable-extensions-except=${path.join(__dirname, '../dist')}`,
        `--load-extension=${path.join(__dirname, '../dist')}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ],
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome'
    });

    // Wait for extension to be loaded
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get extension ID
    const targets = await browser.targets();
    console.log('Browser targets:', targets.map(t => {
      try {
        return { type: t.type(), url: t.url() };
      } catch (e) {
        return { type: t.type(), error: e.message };
      }
    }));
    
    const extensionTarget = targets.find(target => {
      try {
        const url = target.url();
        console.log('Checking target:', { type: target.type(), url });
        return url.includes('chrome-extension://');
      } catch (e) {
        console.log('Error checking target:', e.message);
        return false;
      }
    });

    if (!extensionTarget) {
      throw new Error('Could not find extension target');
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
    const userDataDir = path.join(__dirname, 'chrome-data');
    try {
      // Kill any remaining Chrome processes
      await execSync('pkill -f chrome');
    } catch (e) {
      console.log('Error killing Chrome processes:', e.message);
    }
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
    } catch (e) {
      console.log('Error removing user data dir:', e.message);
    }
  });

  beforeEach(async () => {
    // Navigate to extension page first to ensure we have the right permissions
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
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
    
    // Click setup button and wait for options page
    console.log('Clicking setup button...');
    const [optionsPage] = await Promise.all([
      browser.waitForTarget(target => target.url().includes('chrome-extension://') && target.url().includes('options.html')).then(target => target.page()),
      page.click('#setup-btn')
    ]);
    
    // Set up options page
    console.log('Options page URL:', await optionsPage.url());
    optionsPage.on('console', msg => console.log('Browser log:', msg.text()));
    await optionsPage.waitForFunction(() => document.readyState === 'complete');
    
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
    
    // Wait for success message
    console.log('Waiting for success message...');
    await optionsPage.waitForSelector('.success', { visible: true });
    const successText = await optionsPage.$eval('.success', el => el.textContent);
    console.log('Success text:', successText);
    await takeScreenshot(optionsPage, 'setup-success');
    expect(successText).toContain('Chronicle Sync has been successfully set up');
    
  }, timeout);
});