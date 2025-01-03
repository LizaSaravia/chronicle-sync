# Chronicle Sync

A cross-platform browser history synchronization solution that works across iOS, Android (Firefox), and Chrome, with a web interface for viewing history.

## Features

- 🔄 Real-time synchronization across devices
- 📱 Support for multiple platforms:
  - iOS (App Store)
  - Firefox Android (Firefox Add-ons)
  - Chrome (Chrome Web Store)
  - Web Interface (Read-only history viewer)
- 🔒 Password-protected sync with offline support
- 🚀 Seamless sync between devices
- 🎯 Single codebase using React Native
- 💾 Local-first with offline queue
- 🔐 End-to-end encryption for sync data

## Development

### Prerequisites

- Node.js 20.x
- React Native development environment
- Xcode (for iOS development)
- Android Studio (for Android development)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/openhands/chronicle-sync.git
cd chronicle-sync
```

2. Install dependencies:
```bash
./scripts/setup.sh
```

3. Start the development server:
```bash
npm start
```

### Project Structure

```
chronicle-sync/
├── apps/
│   ├── mobile/          # React Native mobile app (iOS/Android)
│   ├── web/             # Web interface
│   ├── chrome/          # Chrome extension
│   └── firefox/         # Firefox extension
├── packages/
│   ├── core/            # Shared business logic
│   ├── ui/              # Shared UI components
│   └── sync/            # Sync implementation with offline support
├── e2e/                 # End-to-end tests
└── infrastructure/      # Backend services for sync
```

### Sync Functionality

Chronicle Sync uses a password-based synchronization system that works across all supported platforms:

1. **Password Protection**: Users set a sync password that is used to:
   - Encrypt all synced data end-to-end
   - Identify which sync group to connect to
   - Ensure data privacy and security

2. **Offline Support**:
   - All extensions work in offline mode by default
   - Changes are queued locally when offline
   - Automatic sync when connection is restored
   - Background sync attempts every 5 minutes

3. **Security**:
   - All data is encrypted before transmission
   - Passwords never leave the device
   - No server-side password storage
   - End-to-end encryption using AES

4. **Usage**:
   ```typescript
   // Initialize sync with password
   const syncManager = new SyncManager({ password: 'your-sync-password' });

   // Sync data
   await syncManager.sync({
     id: 'unique-id',
     data: { /* your data */ },
     timestamp: Date.now()
   });

   // Check offline queue
   const queuedItems = syncManager.getOfflineQueue();

   // Manually sync offline queue
   await syncManager.syncOfflineQueue();
   ```

### Testing

Run tests:
```bash
npm test               # Unit tests
npm run test:e2e      # End-to-end tests
npm run lint          # Linting
```

### Building

- iOS: `npm run build:ios`
- Android: `npm run build:android`
- Chrome Extension: `npm run build:chrome`
- Firefox Extension: `npm run build:firefox`
- Web Interface: `npm run build:web`

## Deployment Strategy

### Backend Environments

1. **Feature Environments**
   - Created automatically for feature branches
   - Format: `https://[branch-name].dev.chronicle-sync.dev`
   - Deployed via GitHub Actions when pushing to feature/* branches
   - Each environment gets its own Redis instance
   - Perfect for testing features in isolation

2. **Staging Environment**
   - URL: `https://staging.chronicle-sync.dev`
   - Automatically deployed from the `staging` branch
   - Mirrors production setup with staging data
   - Used for integration testing and pre-release validation

3. **Production Environment**
   - URL: `https://sync.chronicle-sync.dev`
   - Deployed from the `main` branch
   - Requires manual approval for deployments
   - Uses production-grade infrastructure with high availability

### Browser Extension Strategy

1. **Development Builds**
   - Built automatically for feature branches
   - Configure sync server URL via manifest environment variables
   - Available as artifacts in GitHub Actions
   - Can be loaded as unpacked extensions for testing

2. **Beta Channel**
   - Built from `staging` branch
   - Published to Chrome Web Store Beta channel
   - Published to Firefox Add-ons Beta channel
   - Used by early adopters and testers

3. **Production Releases**
   - Created from GitHub releases/tags
   - Published to main extension store channels
   - Version numbers follow semver
   - Release notes generated automatically

### Deployment Flow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/my-feature

   # Development
   npm run dev  # Uses feature environment

   # Push changes
   git push origin feature/my-feature
   # Automatically deploys to feature.dev.chronicle-sync.dev
   ```

2. **Staging Deployment**
   ```bash
   # Merge feature to staging
   git checkout staging
   git merge feature/my-feature
   git push origin staging
   # Automatically deploys to staging.chronicle-sync.dev
   # Publishes to beta channels
   ```

3. **Production Release**
   ```bash
   # Create release
   git checkout main
   git merge staging
   git tag v1.2.3
   git push origin main --tags
   # Creates GitHub release
   # Triggers production deployment after approval
   # Publishes to extension stores
   ```

### Infrastructure Management

- AWS ECS for containerized services
- Redis clusters per environment
- CloudFront for static assets
- Route53 for DNS management
- Terraform for infrastructure as code

### Extension Version Management

1. **Development**
   - Version format: `0.0.0-dev.[branch].[commit]`
   - Auto-configured to use feature environment
   - Debug logging enabled

2. **Beta**
   - Version format: `x.y.z-beta.n`
   - Uses staging environment
   - Telemetry enabled

3. **Production**
   - Version format: `x.y.z`
   - Uses production environment
   - Optimized builds

### Monitoring and Logging

- CloudWatch for server metrics
- Sentry for error tracking
- Extension telemetry in beta/prod
- Uptime monitoring for all environments

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details