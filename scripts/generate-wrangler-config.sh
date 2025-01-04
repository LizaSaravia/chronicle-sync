#!/bin/bash

# Check if required environment variables are set
required_vars=(
    "CLOUDFLARE_ACCOUNT_ID"
    "CLOUDFLARE_API_TOKEN"
    "PROD_DB_ID"
    "PROD_KV_ID"
    "STAGING_DB_ID"
    "STAGING_KV_ID"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

# Create wrangler.toml with environment-specific values
envsubst > wrangler.toml << EOL
# This file is generated by generate-wrangler-config.sh
# Do not edit directly!
name = "chronicle-sync"
main = "dist-worker/worker.js"
compatibility_date = "2023-12-01"

[env.staging]
name = "chronicle-sync-staging"
vars = { ENVIRONMENT = "staging" }

[[env.staging.r2_buckets]]
binding = "SYNC_BUCKET"
bucket_name = "chronicle-sync-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "chronicle-sync-staging"
database_id = "$STAGING_DB_ID"

[[env.staging.kv_namespaces]]
binding = "SYNC_KV"
id = "$STAGING_KV_ID"

[env.production]
name = "chronicle-sync"
vars = { ENVIRONMENT = "production" }

[[env.production.r2_buckets]]
binding = "SYNC_BUCKET"
bucket_name = "chronicle-sync"

[[env.production.d1_databases]]
binding = "DB"
database_name = "chronicle-sync"
database_id = "$PROD_DB_ID"

[[env.production.kv_namespaces]]
binding = "SYNC_KV"
id = "$PROD_KV_ID"
EOL

echo "wrangler.toml has been generated successfully"