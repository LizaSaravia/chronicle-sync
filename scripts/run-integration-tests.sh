#!/bin/bash

# Run integration tests for staging and production environments
# Usage: ./scripts/run-integration-tests.sh [staging|production]

# Default to running both environments if none specified
ENVIRONMENT=${1:-"all"}

case "$ENVIRONMENT" in
  "staging")
    echo "Running integration tests for staging environment..."
    npx jest tests/integration/dashboard.test.js -t "Staging Environment"
    ;;
  "production")
    echo "Running integration tests for production environment..."
    npx jest tests/integration/dashboard.test.js -t "Production Environment"
    ;;
  "all")
    echo "Running integration tests for all environments..."
    npx jest tests/integration/dashboard.test.js
    ;;
  *)
    echo "Invalid environment specified. Use: staging, production, or leave empty for all environments"
    exit 1
    ;;
esac