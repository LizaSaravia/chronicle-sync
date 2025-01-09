#!/bin/bash
set -e

# Run linting
./scripts/lint.sh

# Run tests
poetry run pytest tests/

# Check if wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
    echo "wrangler.toml not found"
    exit 1
fi

# Install wrangler if not present
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Create dist directory
mkdir -p dist

# Verify worker can be built
wrangler deploy --dry-run --outdir=dist