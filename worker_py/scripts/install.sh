#!/bin/bash
set -e

# Install poetry if not already installed
if ! command -v poetry &> /dev/null; then
    curl -sSL https://install.python-poetry.org | python3 -
fi

# Install dependencies
poetry install