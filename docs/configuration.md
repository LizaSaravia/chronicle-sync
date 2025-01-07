# Configuration Structure

This document explains the organization and purpose of Chronicle Sync's testing and deployment configuration files.

## Testing Configuration

Chronicle Sync uses two separate Vitest configurations to handle different types of tests:

### 1. End-to-End Tests (`vitest.config.js`)

This configuration is optimized for end-to-end (E2E) testing:
```javascript
{
  test: {
    globals: true,
    environment: 'jsdom',
    maxConcurrency: 1,     // Run E2E tests sequentially
    isolate: false,        // Share browser instance between tests
    testTimeout: 30000,    // Longer timeouts for E2E tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
}
```

Key features:
- Sequential test execution
- Shared browser instance for efficiency
- Extended timeouts for complex operations
- Coverage reporting enabled

### 2. Unit Tests (`vitest.config.ts`)

This configuration is specialized for unit testing:
```javascript
{
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    isolate: true,        // Each test runs in isolation
    threads: false
  }
}
```

Key features:
- Isolated test execution
- Focused on unit test directory
- Simpler configuration for faster execution

## Deployment Configuration

The project uses multiple Wrangler configuration templates to manage different aspects of the Cloudflare deployment:

### 1. Main Configuration (`wrangler.toml.template`)

The primary configuration file that includes:
- Worker settings
- Pages configuration
- Environment-specific settings (staging/production)
- Resource bindings (R2, D1, KV)

Example structure:
```toml
name = "chronicle-sync"
main = "dist-worker/worker.js"

[env.staging]
# Staging-specific configurations

[env.production]
# Production-specific configurations
```

### 2. Component-Specific Templates

- `wrangler.worker.toml.template`: Dedicated configuration for Cloudflare Workers
- `wrangler.dashboard.toml.template`: Settings for the dashboard application
- `wrangler.pages.toml.template`: Cloudflare Pages specific configuration

This separation allows for:
- Independent deployment of different components
- Easier maintenance and updates
- Clear separation of concerns
- Environment-specific configurations

## Configuration Management

### Best Practices

1. **Testing**
   - Use the appropriate test configuration for your test type
   - E2E tests should use `vitest.config.js`
   - Unit tests should use `vitest.config.ts`

2. **Deployment**
   - Keep environment-specific values in appropriate sections
   - Use variables for sensitive information
   - Maintain separate configurations for different components

### Template Usage

The `.template` suffix indicates these are template files that should be:
1. Copied to their non-template name during deployment
2. Have their variables replaced with actual values
3. Used as the basis for the final configuration

For example:
```bash
# During deployment
cp wrangler.toml.template wrangler.toml
# Replace variables with actual values
```

## Workflow Configuration

### CI/CD Pipeline (`ci.yml`)

The main CI/CD pipeline is configured to:
- Run on push to main/staging branches
- Run on version tags (`v*`)
- Run on pull requests
- Support manual triggers via workflow_dispatch

Key features:
- Concurrent runs are cancelled via `concurrency` group
- Uses Turbo for caching and build optimization
- Supports SauceLabs for E2E testing
- Creates both beta (staging) and production releases

### Deployment Workflows

Both deployment workflows (`cloudflare-pages.yml` and `cloudflare-worker.yml`):
- Are triggered by successful CI/CD workflow completion
- Use environment protection rules (staging/production)
- Deploy to staging on main branch
- Deploy to production on version tags
- Include build verification steps

### Environment Variables and Secrets

Required secrets:
```yaml
CLOUDFLARE_API_TOKEN: Cloudflare API token
CLOUDFLARE_ACCOUNT_ID: Cloudflare account ID
STAGING_DB_ID: D1 database ID for staging
STAGING_KV_ID: KV namespace ID for staging
PROD_DB_ID: D1 database ID for production
PROD_KV_ID: KV namespace ID for production
SAUCE_USERNAME: SauceLabs username for E2E tests
SAUCE_ACCESS_KEY: SauceLabs access key for E2E tests
TURBO_TOKEN: Optional token for Turbo remote caching
```

### Artifact Retention

Build artifacts are retained with specific durations:
- Test artifacts: 14 days
  - Coverage reports
  - Test logs
  - E2E screenshots
- Build artifacts: 7 days
  - Extension files
  - Worker builds
  - Dashboard files

This allows sufficient time for debugging deployment issues while managing storage costs.

### Custom Domains

The Pages deployment workflow automatically configures custom domains:
- Staging: preview.chronicle-sync.pages.dev
- Production: Managed through Cloudflare dashboard

## Related Documentation

- [Deployment Guide](deployment.md) - For detailed deployment process
- [Test Results](test-results.md) - For understanding test output