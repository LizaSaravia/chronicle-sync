# Error Reporting Configuration

Chronicle Sync uses Discord webhooks for error reporting. The webhook URL is stored as a secret in Cloudflare Workers to keep it secure.

## Setting up the Discord Webhook

1. Create a Discord webhook in your server:

   - Go to Server Settings > Integrations > Webhooks
   - Click "New Webhook"
   - Name it "Chronicle Sync Error Reports"
   - Choose the channel for error reports
   - Copy the webhook URL

2. Set up the webhook URL as a secret in Cloudflare Workers:

```bash
# For staging environment
wrangler secret put DISCORD_WEBHOOK_URL --env staging
# Enter the webhook URL when prompted

# For production environment
wrangler secret put DISCORD_WEBHOOK_URL --env production
# Enter the webhook URL when prompted
```

## How Error Reporting Works

1. When an error occurs in the extension, it checks if error reporting is enabled:

   - Enabled by default in staging/beta
   - Disabled by default in production (user must opt-in)

2. If enabled, the error details are sent to our API endpoint `/api/report-error`

3. The worker proxies the error report to Discord using the webhook URL from secrets

4. The error appears in Discord with:
   - Error message and stack trace
   - Extension version and runtime context
   - Timestamp
   - Additional context if available

## Security Considerations

- The Discord webhook URL is never exposed to the client
- All error reports go through our API, which can rate limit and validate requests
- The extension only sends error reports when explicitly enabled
- Stack traces are truncated to 1000 characters to prevent large payloads
