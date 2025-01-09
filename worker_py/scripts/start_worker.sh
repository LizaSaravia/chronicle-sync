#!/bin/bash
set -e

# Install wrangler if not present
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Start the worker in development mode
wrangler dev --local