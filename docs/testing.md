# Testing Chronicle Sync

This document describes how to run tests for the Chronicle Sync extension.

## End-to-End Tests

The e2e tests use Playwright to test the extension in a real browser environment.

### Running Tests in Headless Mode

To run the e2e tests in headless mode:

1. Build the extension:
```bash
npm run build
```

2. Run the tests:
```bash
npm run test:e2e
```

The tests will run in headless mode by default. Test results and screenshots will be saved in the `playwright-report` directory.

### Running Tests with UI

To run tests with the Playwright UI:

```bash
npm run test:e2e -- --ui
```

### Test Configuration

The e2e test configuration is in `playwright.config.ts`. Key features:

- Runs in headless mode by default
- Uses real Chrome extension loading
- Automatically manages test user data
- Handles extension ID discovery
- Supports CI/CD environments

## Unit Tests

To run unit tests:

```bash
npm run test:unit
```

## Linting

To run linting:

```bash
npm run lint
```

## Continuous Integration

All tests are automatically run in CI/CD pipelines. The configuration ensures:

- Tests run in headless mode
- Retries are enabled for flaky tests
- Screenshots and traces are saved for failed tests