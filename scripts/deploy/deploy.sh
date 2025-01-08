#!/bin/bash
set -e

# Check if environment is provided
if [ -z "$1" ]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

ENVIRONMENT=$1

# Install node-fetch if not already installed
npm install --no-save node-fetch

# Deploy to the specified environment
echo "🚀 Deploying worker to $ENVIRONMENT..."
npx wrangler deploy --env $ENVIRONMENT

# Verify the deployment
node scripts/deploy/verify-deployment.js $ENVIRONMENT