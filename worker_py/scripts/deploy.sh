#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}

echo "Deploying to $ENVIRONMENT..."

# Install wrangler if not present
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Deploy using wrangler
wrangler deploy --env $ENVIRONMENT