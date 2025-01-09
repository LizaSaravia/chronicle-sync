#!/bin/bash
set -e

# Run unit tests
poetry run pytest tests/unit

# Run integration tests
poetry run pytest tests/integration

# Run E2E tests if specified
if [ "$1" == "--e2e" ]; then
    poetry run pytest tests/e2e
fi