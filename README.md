# Chronicle Sync

A secure, cross-platform browser extension for syncing your browsing data across devices. Built with modern web technologies and powered by Cloudflare's infrastructure (R2, D1, and KV store).

## Screenshots

<div align="center">

### Latest Screenshots
Screenshots are generated during E2E tests and are available as artifacts in the [latest successful CI run](https://github.com/posix4e/chronicle-sync/actions/workflows/ci.yml?query=branch%3Amain+is%3Asuccess).

To view the screenshots:
1. Click the link above to view the latest successful run
2. Scroll down to "Artifacts"
3. Download the "test-artifacts" zip file

</div>

[View CI/CD Status](https://github.com/posix4e/chronicle-sync/actions/workflows/ci.yml) | [View all releases](https://github.com/posix4e/chronicle-sync/releases)
## Features

- 🔒 End-to-end encryption using password-based keys
- 🌐 Cross-browser support (Chrome, Firefox, Safari iOS coming soon)
- 📱 Progressive Web App for mobile access
- 🔄 Real-time sync with offline support
- 🎯 Selective sync for specific data types
- 📊 Cross-device history viewing and management

## Quick Start

1. Install the extension:
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/chronicle-sync)
   - [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/chronicle-sync)

2. Create a sync group with a strong password
3. Start syncing your data across devices

## Development

### Prerequisites

- Node.js 20.x or later
- Wrangler CLI (for Cloudflare Workers deployment)
- A Cloudflare account with Workers, R2, D1, and KV access

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Copy `wrangler.example.toml` to `wrangler.toml` and configure your Cloudflare credentials
4. Run `npm run dev` for local development

### Testing and Linting

- Run unit tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Run E2E tests: `npm run test:e2e`
- Run linting: `npm run lint`
- Format code: `npm run format`

### Architecture

Chronicle Sync uses a distributed architecture:
- Browser Extension: Handles local data and encryption
- Cloudflare Workers: Backend API and data synchronization
- Cloudflare R2: Encrypted data storage
- Cloudflare D1: Metadata and user management
- Cloudflare KV: Real-time sync coordination

For detailed technical documentation, see the [/docs](/docs) directory.
