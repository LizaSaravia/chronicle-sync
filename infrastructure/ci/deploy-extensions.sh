#!/bin/bash
set -e

BRANCH=$1
CHROME_STORE_TOKEN=$2
CHROME_STORE_ITEM_ID=$3
AMO_JWT_ISSUER=$4
AMO_JWT_SECRET=$5

# Install required dependencies
command -v jq >/dev/null 2>&1 || {
    echo "Installing jq..."
    apt-get update && apt-get install -y jq
}
npm install --no-save google-auth-library
npm install -g web-ext

# Get access token from service account credentials
export GOOGLE_APPLICATION_CREDENTIALS=$(mktemp)
# Format JSON properly with jq
echo "$CHROME_STORE_TOKEN" | jq '.' > "$GOOGLE_APPLICATION_CREDENTIALS" || {
    echo "Failed to parse JSON credentials. Make sure CHROME_STORE_TOKEN contains valid JSON"
    exit 1
}

# Debug: Check if JSON is valid
if ! jq . "$GOOGLE_APPLICATION_CREDENTIALS" > /dev/null 2>&1; then
    echo "Error: Invalid JSON in credentials file"
    cat "$GOOGLE_APPLICATION_CREDENTIALS"
    exit 1
fi

ACCESS_TOKEN=$(node infrastructure/ci/get-chrome-token.js)
rm "$GOOGLE_APPLICATION_CREDENTIALS"

# Debug: Check if we got an access token
if [ -z "$ACCESS_TOKEN" ]; then
    echo "Error: Failed to get access token"
    exit 1
fi

if [ "$BRANCH" = "refs/heads/main" ]; then
    # Production: Upload to main store channels
    curl -H "Authorization: Bearer $ACCESS_TOKEN" \
         -H "x-goog-api-version: 2" \
         -X PUT -T chronicle-sync-chrome.zip \
         "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_STORE_ITEM_ID"
    
    cd apps/firefox/src
    web-ext sign \
        --api-key="$AMO_JWT_ISSUER" \
        --api-secret="$AMO_JWT_SECRET" \
        --channel=listed
else
    # Staging: Upload to beta channels
    curl -H "Authorization: Bearer $ACCESS_TOKEN" \
         -H "x-goog-api-version: 2" \
         -X PUT -T chronicle-sync-chrome.zip \
         "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$CHROME_STORE_ITEM_ID"
    
    cd apps/firefox/src
    web-ext sign \
        --api-key="$AMO_JWT_ISSUER" \
        --api-secret="$AMO_JWT_SECRET" \
        --channel=unlisted
fi