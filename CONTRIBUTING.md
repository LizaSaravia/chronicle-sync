# Contributing to Chronicle Sync

Thank you for your interest in contributing to Chronicle Sync! This document provides guidelines and explains our development workflow.

## Development Workflow

### Getting Started

See the [Development section in README.md](README.md#development) for setup instructions and basic development commands.

### Screenshots and Documentation

Screenshots are automatically generated during E2E tests and are handled as follows:

1. **Generation**: Screenshots are captured during E2E test runs using Playwright
2. **Storage**: Screenshots are saved as artifacts in GitHub Actions
3. **Deployment**: When changes are merged to main:
   - Screenshots are downloaded from artifacts
   - `test-results.md` is generated with links to the screenshots
   - Everything is deployed to our documentation site at chroniclesync.xyz

> **Important:** Screenshots should never be committed to the repository. They are automatically generated and hosted on our documentation site.

#### Viewing Screenshots

- Latest screenshots: https://chroniclesync.xyz/test-results.html
- Screenshots in PRs: Available as artifacts in GitHub Actions workflow runs

#### Adding New Screenshots

To add new screenshots to the documentation:

1. Add screenshot capture code in your E2E tests:
   ```typescript
   await page.screenshot({
     path: `docs/screenshots/your-feature/${timestamp}_description.png`
   });
   ```

2. The CI workflow will automatically:
   - Generate the screenshots during test runs
   - Upload them as artifacts
   - Deploy them to the documentation site
   - Update test-results.md with links to the new screenshots

3. To reference screenshots in documentation:
   - Use the URL pattern: `https://chroniclesync.xyz/screenshots/...`
   - Example: `![Feature Name](https://chroniclesync.xyz/screenshots/your-feature/description.png)`
   - Never reference screenshots as if they were in the repository

## Pull Request Process

1. Create a new branch for your changes
2. Make your changes and add tests
3. Run the test suite locally
4. Push your changes and create a PR
5. Wait for CI checks to pass
6. Request review

## Code Style

- Follow the existing code style
- Use TypeScript for type safety
- Add comments only when necessary to explain non-obvious behavior
- Keep functions small and focused
- Write meaningful commit messages

## Questions?

If you have questions about contributing, please:

1. Check existing issues
2. Read the [documentation](/docs)
3. Open a new issue if needed

Thank you for contributing to Chronicle Sync!