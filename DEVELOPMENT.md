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
   - Use Puppeteer for browser automation
   - Test complete user flows
   - Run with `npm run test:e2e`

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

## Deployment Process

### Staging
1. Merge to main branch
2. Automated deployment to staging
3. Beta release created on GitHub
4. Uses staging Cloudflare resources

### Production
1. Tag release (vX.Y.Z)
2. Automated deployment to production
3. GitHub release with changelog
4. Manual extension store updates

## Version Control

- Branch from main for features
- PRs require tests and review
- Follow semver for versions
- Update changelog for releases