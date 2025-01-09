#!/bin/bash
set -e

echo "Running black..."
poetry run black src tests

echo "Running isort..."
poetry run isort src tests

echo "Running flake8..."
poetry run flake8 src tests

echo "Running mypy..."
poetry run mypy src tests