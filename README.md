# Chronicle Sync

A secure, cross-platform browser extension for syncing your browsing data across devices. Built with modern web technologies and powered by Cloudflare's infrastructure (R2, D1, and KV store).

## Screenshots

<div align="center">

### Initial Setup
![Initial Setup](https://posix4e.github.io/chronicle-sync/releases/latest/screenshots/setup-flow/initial-popup.png)

### Password Configuration
![Password Setup](https://posix4e.github.io/chronicle-sync/releases/latest/screenshots/setup-flow/setup-form.png)

### History Sync
![History Sync](https://posix4e.github.io/chronicle-sync/releases/latest/screenshots/setup-flow/history-entries.png)

</div>

[View more screenshots](https://posix4e.github.io/chronicle-sync/latest-release) | [View all releases](https://posix4e.github.io/chronicle-sync/releases/)

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

### Architecture

Chronicle Sync uses a distributed architecture:
- Browser Extension: Handles local data and encryption
- Cloudflare Workers: Backend API and data synchronization
- Cloudflare R2: Encrypted data storage
- Cloudflare D1: Metadata and user management
- Cloudflare KV: Real-time sync coordination

For detailed technical documentation, see the [/docs](/docs) directory.
