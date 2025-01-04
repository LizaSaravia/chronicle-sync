# Chronicle Sync

A secure, cross-platform browser extension for syncing your browsing data across devices.

## Features

- 🔒 End-to-end encryption using password-based keys
- 🌐 Cross-browser support (Chrome, Firefox)
- 📱 Progressive Web App for mobile access
- 🔄 Real-time sync with offline support
- 🎯 Selective sync for specific data types

## Quick Start

1. Install the extension:
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/chronicle-sync)
   - [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/chronicle-sync)

2. Create a sync group with a strong password
3. Start syncing your data across devices

## Development

### Prerequisites

- Node.js 20+
- npm 9+
- Docker (optional, for local development)

### Setup

```bash
# Install dependencies
npm ci

# Build core packages
npm run build:packages

# Start development server
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run linting
npm run lint
```

### Building Extensions

```bash
# Build Chrome extension
npm run build:chrome

# Build Firefox extension
npm run build:firefox

# Build web interface
npm run build:web
```

## Architecture

Chronicle Sync uses a modular architecture with these key components:

- Core sync engine (packages/core)
- Browser extensions (apps/chrome, apps/firefox)
- Web interface (apps/web)
- Backend service (src/)

For detailed technical documentation, see the [docs](./docs) directory.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Security

All data is encrypted using AES-256-GCM before transmission. Keys are derived from user passwords using PBKDF2. For details, see our [security documentation](./docs/security.md).

## License

MIT License - see [LICENSE](./LICENSE) for details.
