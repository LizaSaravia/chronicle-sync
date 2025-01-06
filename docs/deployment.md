# Deployment Guide

This document describes the deployment process for Chronicle Sync, including the CI/CD pipeline and Cloudflare deployment workflow.

## Overview

Chronicle Sync uses GitHub Actions for continuous integration and deployment, with three main workflows:

1. **CI/CD Pipeline** (`ci.yml`)
   - Runs tests and builds all components
   - Creates GitHub releases
   - Deploys documentation to GitHub Pages
   - Triggers deployment workflows on success

2. **Cloudflare Pages Deployment** (`cloudflare-pages.yml`)
   - Triggered by successful CI/CD workflow
   - Deploys dashboard to staging on main branch
   - Deploys to production on version tags
   - Configures custom domains

3. **Cloudflare Worker Deployment** (`cloudflare-worker.yml`)
   - Triggered by successful CI/CD workflow
   - Deploys worker to staging on main branch
   - Deploys to production on version tags
   - Includes syntax validation

For details about the testing and deployment configuration structure, see the [Configuration Guide](configuration.md).

## Build Process

The build process is handled by the CI workflow (`ci.yml`) and includes:

### 1. Extension Build
```bash
pnpm turbo build
```
This creates the browser extension files in the `dist` directory.

### 2. Worker Build
```bash
pnpm webpack --config webpack.worker.js --mode production
```
This creates the Cloudflare Worker in `dist/worker/worker.js`.

## Deployment Process

The deployment process is triggered automatically when:
- Changes are merged to `main` (deploys to staging)
- A new version tag is pushed (deploys to production)

### Staging Deployment
- Triggered on merges to `main`
- Deploys to `staging.$DOMAIN`
- Uses staging Cloudflare resources (DB, KV)

### Production Deployment
- Triggered on version tags (`v*`)
- Deploys to main domain and `www` subdomain
- Uses production Cloudflare resources

## Required Secrets

The following secrets must be configured in GitHub:

```yaml
CLOUDFLARE_API_TOKEN: Cloudflare API token with appropriate permissions
CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
STAGING_DB_ID: D1 database ID for staging
STAGING_KV_ID: KV namespace ID for staging
PROD_DB_ID: D1 database ID for production
PROD_KV_ID: KV namespace ID for production
CLOUDFLARE_DOMAIN: Your domain name (optional)
```

## Deployment Validation

The deployment workflow includes several validation steps:

1. **Artifact Verification**
   - Checks if build artifacts exist
   - Verifies directory structure
   - Lists contents for debugging

2. **Worker Validation**
   - Verifies worker.js exists and has content
   - Performs JavaScript syntax validation
   - Checks for basic structural requirements

3. **Dashboard Validation**
   - Verifies dashboard files exist
   - Checks for required HTML files
   - Validates asset structure

## Troubleshooting

### Common Issues

1. **Missing Worker Directory**
   ```
   Error: dist/worker directory does not exist
   ```
   **Solution**: Ensure the worker build step completed successfully. Check the build logs for webpack errors.

2. **Invalid Worker File**
   ```
   Error: worker.js contains syntax errors
   ```
   **Solution**: Check the worker source code for syntax errors. The build process should catch these during compilation.

3. **Missing Dashboard Files**
   ```
   Error: dist/dashboard directory does not exist
   ```
   **Solution**: Verify the dashboard build step completed and files were moved correctly.

### Debug Steps

1. Check build artifacts:
   ```bash
   ls -la dist/
   ls -la dist/worker/
   ls -la dist/dashboard/
   ```

2. Verify worker syntax:
   ```bash
   node --check dist/worker/worker.js
   ```

3. Review build logs in GitHub Actions for any error messages.

## Best Practices

1. **Testing**
   - Always run tests locally before pushing
   - Use `pnpm turbo test:all` for comprehensive testing
   - Include E2E tests for critical paths

2. **Version Control**
   - Use semantic versioning for releases
   - Include meaningful commit messages
   - Create detailed PR descriptions

3. **Monitoring**
   - Check Cloudflare logs after deployment
   - Monitor worker performance metrics
   - Set up alerts for critical errors

## Development Workflow

1. Create a feature branch
2. Make changes and test locally
3. Push changes and create a PR
4. Wait for CI checks to pass
5. Get PR review and approval
6. Merge to main (deploys to staging)
7. Test in staging environment
8. Create version tag for production release

## Artifact Retention

Build artifacts are retained for:
- Test artifacts: 14 days
- Build artifacts: 7 days

This allows sufficient time for debugging deployment issues while managing storage costs.