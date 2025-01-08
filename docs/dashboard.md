# Chronicle Sync Dashboard

The Chronicle Sync Dashboard is a web interface for managing browsing history across all synchronized devices.

## Features

- View complete browsing history across all machines
- Add and edit history entries manually
- See which host sent each history entry, including its operating system
- Real-time updates using Cloudflare Workers

## Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start development server:

   ```bash
   npm run dev:dashboard
   ```

3. Run tests:

   ```bash
   # Unit tests
   npm test

   # E2E tests
   npm run test:e2e:dashboard
   ```

## Deployment

The dashboard is deployed using Cloudflare Pages:

1. Staging:

   ```bash
   npm run deploy:dashboard:staging
   ```

2. Production:
   ```bash
   npm run deploy:dashboard:prod
   ```

## Architecture

- Frontend: React with Material-UI
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Hosting: Cloudflare Pages

## API Endpoints

### GET /api/history

Returns all history entries sorted by visit time.

### POST /api/history

Creates a new history entry.

Request body:

```json
{
  "url": "https://example.com",
  "title": "Example Site",
  "visitTime": 1704477600000,
  "hostName": "laptop-1",
  "os": "Windows 10",
  "syncGroupId": "group-123"
}
```

### PUT /api/history/:id

Updates an existing history entry.

Request body:

```json
{
  "url": "https://example.com",
  "title": "Updated Title",
  "visitTime": 1704477600000,
  "hostName": "laptop-1",
  "os": "Windows 10"
}
```
