#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

# Update version in pyproject.toml
poetry version $VERSION

# Create git tag
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push tag
git push origin "v$VERSION"