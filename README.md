# Chronicle Sync

A secure, cross-platform browser extension for syncing your browsing data across devices. Built with modern web technologies and powered by Cloudflare's infrastructure.

[![CI/CD Status](https://github.com/posix4e/chronicle-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/posix4e/chronicle-sync/actions/workflows/ci.yml)

## Overview

Chronicle Sync provides secure, real-time synchronization of your browsing data across multiple devices and browsers. Built on Cloudflare's infrastructure (R2, D1, and KV store), it ensures both performance and security.

📸 **Quick Links:**
- [Production Dashboard](https://dashboard.chroniclesync.xyz)
- [Staging Dashboard](https://preview.chronicle-sync.pages.dev)

[View Latest Release](https://github.com/posix4e/chronicle-sync/releases/latest) | [Documentation](/docs)
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

## Architecture

Chronicle Sync uses a distributed architecture for security and performance:

- 🔐 **Browser Extension**: Local data handling and encryption
- ⚡ **Cloudflare Workers**: Backend API and sync
- 💾 **Cloudflare R2**: Encrypted storage
- 📊 **Cloudflare D1**: User management
- 🔄 **Cloudflare KV**: Real-time coordination

## Development

See our [Development Guide](DEVELOPMENT.md) for detailed setup instructions and contribution guidelines.

## Documentation

- [Technical Documentation](/docs)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Development Guide](DEVELOPMENT.md)
