#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}
BASE_URL="https://api${ENVIRONMENT:+-$ENVIRONMENT}.chroniclesync.xyz"

response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")

if [ "$response" = "200" ]; then
    echo "Health check passed"
    exit 0
else
    echo "Health check failed with status $response"
    exit 1
fi