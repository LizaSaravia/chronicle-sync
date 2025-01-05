describe('Dashboard Integration Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = global.__BROWSER__;
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterEach(async () => {
    await page.close();
  });

  // Use local dev server for testing
  const testUrls = {
    staging: 'http://localhost:3000',
    production: 'http://localhost:3000'
  };

  const runTestsForEnvironment = (environment) => {
    const baseUrl = testUrls[environment];

    it(`should load the dashboard page in ${environment}`, async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('h6');
      
      const title = await page.$eval('h6', el => el.textContent);
      expect(title).toBe('Chronicle Sync Dashboard');
    });

    it(`should open and close add dialog in ${environment}`, async () => {
      await page.goto(baseUrl);
      
      // Click add button
      await page.waitForSelector('[aria-label="add history entry"]');
      await page.click('[aria-label="add history entry"]');
      
      // Verify dialog is open
      await page.waitForSelector('div[role="dialog"]');
      const dialogTitle = await page.$eval('div[role="dialog"] h2', el => el.textContent);
      expect(dialogTitle).toBe('Add History Entry');
      
      // Close dialog
      await page.click('button:has-text("Cancel")');
      
      // Verify dialog is closed
      const dialog = await page.$('div[role="dialog"]');
      expect(dialog).toBeNull();
    });

    it(`should add a new history entry in ${environment}`, async () => {
      await page.goto(baseUrl);
      
      // Open add dialog
      await page.click('[aria-label="add history entry"]');
      await page.waitForSelector('div[role="dialog"]');
      
      // Fill form
      await page.type('input[aria-label="URL"]', 'https://example.com');
      await page.type('input[aria-label="Title"]', 'Example Website');
      await page.type('input[aria-label="Host Name"]', 'test-machine');
      await page.type('input[aria-label="Operating System"]', 'Linux');
      
      // Submit form
      await page.click('button:has-text("Add")');
      
      // Wait for table update
      await page.waitForSelector('td:has-text("Example Website")');
      
      // Verify entry is in table
      const cells = await page.$$eval('td', cells => cells.map(cell => cell.textContent));
      expect(cells).toContain('Example Website');
      expect(cells).toContain('https://example.com');
      expect(cells).toContain('test-machine');
      expect(cells).toContain('Linux');
    });
  };

  describe('Staging Environment', () => {
    runTestsForEnvironment('staging');
  });

  describe('Production Environment', () => {
    runTestsForEnvironment('production');
  });
});