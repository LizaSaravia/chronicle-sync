async function globalTeardown() {
  // Clean up any global test environment here
  delete process.env.TEST_ENV;
}

export default globalTeardown;
