# Chronicle Sync Development Guide

This guide provides detailed information for developers working on Chronicle Sync.

## Repository Structure

```
chronicle-sync/
├── src/                    # Source code
│   ├── backend/           # Backend API
│   ├── dashboard/         # React dashboard
│   └── extension/         # Browser extension
│       ├── icons/        # Extension icons
│       └── utils/        # Utility functions
├── worker/                # Cloudflare Workers code
├── tests/                 # Test suites
│   ├── dashboard/        # Dashboard tests
│   ├── e2e/             # End-to-end tests
│   └── integration/     # Integration tests
├── docs/                 # Documentation
│   └── assets/          # Documentation assets
├── scripts/              # Build and utility scripts
└── .github/              # GitHub Actions workflows
```

## Development Setup

1. **Prerequisites**

   - Node.js 20.x or later
   - Wrangler CLI (for Cloudflare Workers)
   - Cloudflare account with Workers, R2, D1, and KV access

2. **Initial Setup**

   ```bash
   # Clone and install dependencies
   git clone https://github.com/posix4e/chronicle-sync.git
   cd chronicle-sync
   npm install

   # Configure Cloudflare credentials
   cp wrangler.example.toml wrangler.toml
   # Edit wrangler.toml with your credentials
   ```

3. **Development Commands**

   ```bash
   # Start local development
   npm run dev

   # Run tests
   npm test                # Unit tests
   npm run test:watch      # Watch mode
   npm run test:e2e       # E2E tests

   # Code quality
   npm run lint           # Run ESLint
   npm run format         # Format with Prettier
   ```

## Build System

### Extension Build (`webpack.config.js`)

- Builds browser extension components
- Handles background worker, popup UI, options page
- Includes extension assets
- Outputs to `dist` directory

### Worker Build (`webpack.worker.js`)

- Builds Cloudflare Worker backend
- Targets webworker environment
- Single entry point
- Outputs to `worker` directory

## Testing Guidelines

1. **Unit Tests**

   - Write tests using Vitest
   - Test individual components and utilities
   - Run with `npm test`

2. **E2E Tests**

   - Use Playwright for browser automation
   - Test complete user flows
   - Run tests:
     - `pnpm run test:e2e` - Run tests with Xvfb (default)
     - `pnpm run test:e2e:sauce` - Run tests on SauceLabs
     - `pnpm run test:e2e:dashboard` - Run dashboard tests
   - Test configurations:
     - `playwright.ci.config.ts` - Local/CI config with Xvfb
     - `playwright.sauce.config.ts` - SauceLabs config
     - Both extend base config from `tests/common/test-config.ts`
   - Uses Xvfb for headless testing in CI when SauceLabs is not available
   - Requires Xvfb and xauth for local headless testing

3. **Screenshots**
   - Generated during E2E tests
   - Stored as GitHub Actions artifacts
   - Never commit to repository
   - Use URLs from chroniclesync.xyz in docs

## Security Requirements

- End-to-end encryption using PBKDF2
- All sync data encrypted before storage
- No plaintext data in Cloudflare storage
- Input validation on both client and worker
- Regular dependency audits

## CI/CD and Deployment Process

### CI/CD Pipeline (ci.yml)

1. **Triggers**:

   - Push to main/staging branches
   - Version tags (v\*)
   - Pull requests
   - Manual workflow dispatch

2. **Build and Test**:

   - Uses pnpm and Node.js 20.x
   - Installs Playwright browsers
   - Runs linting and unit tests
   - Builds extension, dashboard, and worker
   - Runs E2E tests with screenshot capture:
     - Uses SauceLabs when credentials are available
     - Falls back to Xvfb for headless testing
   - Uploads test and build artifacts

3. **Releases**:
   - Beta release on main branch:
     - Creates/updates beta tag
     - Uploads extension zip
     - Marks as prerelease
   - Production release on version tags:
     - Creates new release
     - Uploads extension zip
     - Auto-generates release notes

### Cloudflare Deployments

Triggered automatically after successful CI/CD workflow:

1. **Pages Deployment (cloudflare-pages.yml)**:

   - Staging: Deploys dashboard to staging branch
   - Production: Deploys to main branch on version tags
   - Uses Wrangler for deployment
   - Requires Cloudflare API token and account ID

2. **Worker Deployment (cloudflare-worker.yml)**:
   - Staging: Deploys worker from main branch
   - Production: Deploys on version tags
   - Includes JS syntax validation
   - Generates environment-specific Wrangler configs
   - Uses staging/production DB and KV namespaces

### Deployment Flow

1. **Staging Environment**:

   - Triggered by merges to main branch
   - Deploys to staging Cloudflare environment
   - Creates/updates beta release
   - Useful for testing before production

2. **Production Environment**:
   - Triggered by version tags (vX.Y.Z)
   - Deploys to production Cloudflare environment
   - Creates GitHub release with changelog
   - Requires manual extension store updates

## Version Control

- Branch from main for features
- PRs require tests and review
- Follow semver for versions
- Update changelog for releases
