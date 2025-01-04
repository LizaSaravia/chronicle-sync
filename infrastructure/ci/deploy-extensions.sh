#!/bin/bash
set -e

BRANCH=$1
CHROME_STORE_TOKEN=$2
CHROME_STORE_ITEM_ID=$3
AMO_JWT_ISSUER=$4
AMO_JWT_SECRET=$5

if [ "$BRANCH" = "refs/heads/main" ]; then
  # Production: Upload to main store channels
  curl -H "Authorization: Bearer $CHROME_STORE_TOKEN" \
       -H "x-goog-api-version: 2" \
       -X PUT -T chronicle-sync-chrome.zip \
       "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_STORE_ITEM_ID"
  
  web-ext sign \
    --api-key="$AMO_JWT_ISSUER" \
    --api-secret="$AMO_JWT_SECRET"
else
  # Staging: Upload to beta channels
  curl -H "Authorization: Bearer $CHROME_STORE_TOKEN" \
       -H "x-goog-api-version: 2" \
       -X PUT -T chronicle-sync-chrome.zip \
       "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_STORE_ITEM_ID"
  
  web-ext sign \
    --api-key="$AMO_JWT_ISSUER" \
    --api-secret="$AMO_JWT_SECRET" \
    --channel=beta
fi