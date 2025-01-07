async function globalSetup() {
  // Set up any global test environment here
  process.env.TEST_ENV = 'true';
  process.env.SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'test-results/screenshots';
}

export default globalSetup;