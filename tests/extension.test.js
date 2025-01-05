const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { CryptoManager } = require('../src/extension/utils/crypto');

/**
 * This file contains end-to-end tests for the Chronicle Sync extension.
 * Screenshots are saved to tests/screenshots/{testName}/{timestamp}_{description}.png
 */

// Set timeout for all tests in this suite
if (process.env.CI) {
  jest.setTimeout(60000);
} else {
  jest.setTimeout(30000);
}

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
    jest.setTimeout(120000); // Increase timeout to 120 seconds
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
    
    // Wait for the popup to be reopened
    console.log('Waiting for popup to reopen...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a new page for the popup
    const newPage = await browser.newPage();
    newPage.on('console', msg => console.log('Browser log:', msg.text()));
    
    // Check background service worker status
    console.log('Checking service worker status...');
    const targets = await browser.targets();
    const serviceWorker = targets.find(target => 
      target.type() === 'service_worker' && 
      target.url().includes(extensionId)
    );
    
    if (serviceWorker) {
      console.log('Found service worker:', serviceWorker.url());
      const worker = await serviceWorker.worker();
      worker.on('console', msg => console.log('Service worker log:', msg.text()));
    } else {
      console.warn('No service worker found!');
    }
    
    await newPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await takeScreenshot(newPage, 'popup-after-setup');
    
    // Add test history entries
    console.log('Adding test history entries...');
    await newPage.evaluate(async () => {
      console.log('Starting history operations...');
      // Clear history first
      console.log('Clearing history...');
      try {
        await new Promise((resolve, reject) => {
          chrome.history.deleteAll(() => {
            if (chrome.runtime.lastError) {
              console.error('Error clearing history:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log('History cleared successfully');
              resolve();
            }
          });
        });
      } catch (e) {
        console.error('Failed to clear history:', e);
      }
      
      // Wait a bit for the clear to take effect
      console.log('Waiting after clear...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add new entries and wait for onVisited events
      console.log('Adding new history entries...');
      const entries = [
        { title: 'Test Page 1', url: 'https://example.com/1' },
        { title: 'Test Page 2', url: 'https://example.com/2' }
      ];
      
      // Create a promise that resolves when all onVisited events are received
      const visitedPromises = entries.map(entry => new Promise(resolve => {
        const listener = (historyItem) => {
          if (historyItem.url === entry.url) {
            chrome.history.onVisited.removeListener(listener);
            resolve();
          }
        };
        chrome.history.onVisited.addListener(listener);
      }));
      
      // Add entries to history with delay between each
      for (const entry of entries) {
        try {
          // First check if chrome.history is available
          console.log('chrome.history available:', !!chrome.history);
          console.log('chrome.history methods:', Object.keys(chrome.history));
          
          // Check permissions
          const hasPermissions = await new Promise(resolve => {
            chrome.permissions.contains({ permissions: ['history'] }, result => {
              console.log('History permission check result:', result);
              resolve(result);
            });
          });
          console.log('Has history permission:', hasPermissions);
          
          // Try to add URL with more detailed error handling
          await new Promise((resolve, reject) => {
            console.log('Attempting to add URL:', entry.url);
            chrome.history.addUrl({ url: entry.url }, () => {
              const error = chrome.runtime.lastError;
              if (error) {
                console.error('Error adding URL:', entry.url, error);
                console.error('Error details:', JSON.stringify(error));
                reject(error);
              } else {
                console.log('Successfully added URL:', entry.url);
                // Wait for onVisited event
                const listener = (historyItem) => {
                  if (historyItem.url === entry.url) {
                    chrome.history.onVisited.removeListener(listener);
                    // Add the entry directly to the database
                    chrome.runtime.sendMessage({
                      type: 'GET_HISTORY'
                    }, (response) => {
                      if (response.success) {
                        console.log('Current history:', response.history);
                        resolve();
                      } else {
                        console.error('Failed to get history:', response.error);
                        reject(response.error);
                      }
                    });
                  }
                };
                chrome.history.onVisited.addListener(listener);
              }
            });
          });
          
          // Wait for onVisited event to be processed
          console.log('Waiting for onVisited event...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if entry was added to database
          console.log('Checking database for entry:', entry.url);
          const dbEntry = await new Promise((resolve) => {
            const request = indexedDB.open('chronicle-sync', 1);
            request.onerror = (event) => {
              console.error('Database error:', event.target.error);
              resolve(null);
            };
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction('history', 'readonly');
              const store = tx.objectStore('history');
              const index = store.index('url');
              const getRequest = index.get(entry.url);
              getRequest.onsuccess = () => {
                console.log('Database lookup result:', getRequest.result);
                resolve(getRequest.result);
              };
              getRequest.onerror = (event) => {
                console.error('Database lookup error:', event.target.error);
                resolve(null);
              };
            };
          });
          console.log('Database entry for', entry.url, ':', dbEntry);
        } catch (e) {
          console.error('Failed to add URL:', entry.url);
          console.error('Error details:', e);
          console.error('Error stack:', e.stack);
        }
      }
      
      // Wait for all onVisited events
      console.log('Waiting for onVisited events...');
      await Promise.all(visitedPromises);
      console.log('All onVisited events received');
      
      // Wait for entries to be processed by HistoryManager
      console.log('Waiting for entries to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify entries are in the database
      console.log('Verifying entries in database...');
      const dbEntries = await new Promise((resolve) => {
        const request = indexedDB.open('chronicle-sync', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('history', 'readonly');
          const store = tx.objectStore('history');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        };
        request.onerror = () => {
          console.error('Failed to open database:', request.error);
          resolve([]);
        };
      });
      console.log('Database entries:', dbEntries);
    });
    
    // Wait for history div to be visible
    console.log('Waiting for history div...');
    await newPage.waitForSelector('.history', { visible: true });
    
    // Force sync
    console.log('Clicking sync button...');
    await newPage.waitForSelector('#sync-btn');
    await newPage.click('#sync-btn');
    
    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    try {
      // Wait for loading indicator to appear
      await newPage.waitForSelector('#sync-loading', { 
        visible: true,
        timeout: process.env.CI ? 10000 : 5000
      });
      console.log('Sync loading indicator appeared');
      await takeScreenshot(newPage, 'sync-in-progress');
      
      // Wait for loading indicator to disappear
      await newPage.waitForSelector('#sync-loading', { 
        hidden: true,
        timeout: process.env.CI ? 20000 : 10000
      });
      console.log('Sync loading indicator disappeared');
      
      // Check for any error messages
      const errorVisible = await newPage.evaluate(() => {
        const error = document.querySelector('#history-error');
        return error && window.getComputedStyle(error).display !== 'none';
      });
      
      if (errorVisible) {
        const errorText = await newPage.$eval('#history-error', el => el.textContent);
        console.error('Sync error detected:', errorText);
      } else {
        console.log('No sync errors detected');
      }
      
      // Log sync state
      const syncState = await newPage.evaluate(() => ({
        syncBtnDisabled: document.querySelector('#sync-btn').disabled,
        syncLoadingDisplay: document.querySelector('#sync-loading').style.display,
        historyErrorDisplay: document.querySelector('#history-error').style.display,
        historyItemCount: document.querySelectorAll('.history-item').length
      }));
      console.log('Sync state:', syncState);
      
    } catch (error) {
      console.error('Error during sync:', error);
      // Log the current page state
      const content = await newPage.content();
      console.log('Current page content:', content);
      throw error;
    }
    
    // Wait a bit for history to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for history entries to appear
    console.log('Waiting for history entries...');
    try {
      // Click the Force Sync button
      console.log('Clicking Force Sync button...');
      await newPage.waitForSelector('#sync-btn');
      await newPage.waitForFunction(() => {
        const btn = document.querySelector('#sync-btn');
        return btn && !btn.disabled;
      });
      await newPage.click('#sync-btn');

      // Wait for sync to complete
      console.log('Waiting for sync to complete...');
      await newPage.waitForSelector('#sync-loading', { visible: true });
      await newPage.waitForSelector('#sync-loading', { hidden: true });

      // Wait for UI to update
      await newPage.waitForFunction(
        () => {
          const items = Array.from(document.querySelectorAll('.history-item'));
          console.log('Current history items:', items.map(item => item.textContent));
          const hasTestPage1 = items.some(item => item.textContent.includes('Test Page 1'));
          const hasTestPage2 = items.some(item => item.textContent.includes('Test Page 2'));
          console.log('Found Test Page 1:', hasTestPage1, 'Test Page 2:', hasTestPage2);
          return hasTestPage1 && hasTestPage2;
        },
        { timeout: process.env.CI ? 30000 : 10000 }  // Longer timeout in CI
      );
    } catch (error) {
      console.error('Failed while waiting for history entries:', error);
      // Log the current page content and state
      const content = await newPage.content();
      console.log('Current page content:', content);
      const historyItems = await newPage.evaluate(() => {
        return {
          historyDivDisplay: document.querySelector('.history').style.display,
          historyItems: Array.from(document.querySelectorAll('.history-item')).map(item => ({
            text: item.textContent,
            display: window.getComputedStyle(item).display
          }))
        };
      });
      console.log('History state:', historyItems);
      throw error;
    }
    
    // Take screenshot after entries are found
    await takeScreenshot(newPage, 'history-entries');
    
    // Get all history items for debugging
    const allItems = await newPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.history-item')).map(el => el.textContent);
    });
    console.log('Found history items:', allItems);
    
    // Verify specific entries
    const items = await newPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.history-item'));
      return {
        testPage1: items.find(item => item.textContent.includes('Test Page 1'))?.textContent,
        testPage2: items.find(item => item.textContent.includes('Test Page 2'))?.textContent
      };
    });
    
    expect(items.testPage1).toBeDefined();
    expect(items.testPage2).toBeDefined();
    expect(items.testPage1).toContain('Test Page 1');
    expect(items.testPage2).toContain('Test Page 2');
    
  }, process.env.CI ? 60000 : 30000);
});