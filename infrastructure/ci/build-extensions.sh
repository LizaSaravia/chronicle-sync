#!/bin/bash
set -e

VERSION=$1
SYNC_URL=$2

# Update version and sync URL in manifests
jq --arg v "$VERSION" --arg u "$SYNC_URL" \
  '.version = $v | .sync_url = $u' \
  apps/chrome/src/manifest.json > tmp && mv tmp apps/chrome/src/manifest.json

jq --arg v "$VERSION" --arg u "$SYNC_URL" \
  '.version = $v | .sync_url = $u' \
  apps/firefox/src/manifest.json > tmp && mv tmp apps/firefox/src/manifest.json

# Build extensions
npm run build:chrome
npm run build:firefox
npm run build:web

# Package extensions
cd apps/chrome/dist && zip -r ../../../chronicle-sync-chrome.zip .
cd ../../firefox/dist && zip -r ../../../chronicle-sync-firefox.zip .