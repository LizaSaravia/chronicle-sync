#!/bin/bash
set -e

BRANCH=$1
CHROME_STORE_TOKEN=$2
CHROME_STORE_ITEM_ID=$3
AMO_JWT_ISSUER=$4
AMO_JWT_SECRET=$5

# Install required dependencies
npm install --no-save google-auth-library
npm install -g web-ext

# Get access token from service account credentials
export GOOGLE_APPLICATION_CREDENTIALS=$(mktemp)
echo "$CHROME_STORE_TOKEN" > "$GOOGLE_APPLICATION_CREDENTIALS"
ACCESS_TOKEN=$(node infrastructure/ci/get-chrome-token.js)
rm "$GOOGLE_APPLICATION_CREDENTIALS"

if [ "$BRANCH" = "refs/heads/main" ]; then
  # Production: Upload to main store channels
  curl -H "Authorization: Bearer $ACCESS_TOKEN" \
       -H "x-goog-api-version: 2" \
       -X PUT -T chronicle-sync-chrome.zip \
       "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_STORE_ITEM_ID"
  
  web-ext sign \
    --api-key="$AMO_JWT_ISSUER" \
    --api-secret="$AMO_JWT_SECRET"
else
  # Staging: Upload to beta channels
  curl -H "Authorization: Bearer $ACCESS_TOKEN" \
       -H "x-goog-api-version: 2" \
       -X PUT -T chronicle-sync-chrome.zip \
       "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_STORE_ITEM_ID"
  
  web-ext sign \
    --api-key="$AMO_JWT_ISSUER" \
    --api-secret="$AMO_JWT_SECRET" \
    --channel=beta
fi