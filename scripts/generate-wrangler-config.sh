#!/bin/bash

# Check if required environment variables are set
required_vars=(
    "CLOUDFLARE_ACCOUNT_ID"
    "CLOUDFLARE_API_TOKEN"
    "PROD_DB_ID"
    "PROD_KV_ID"
    "STAGING_DB_ID"
    "STAGING_KV_ID"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

# Function to generate a wrangler config file from template
generate_config() {
    local template="$1"
    local output="$2"
    
    if [ ! -f "$template" ]; then
        echo "Error: Template file $template not found"
        exit 1
    fi
    
    echo "Generating $output from $template..."
    envsubst < "$template" > "$output"
    echo "$output has been generated successfully"
}

# Generate wrangler config files
generate_config "wrangler.worker.toml.template" "wrangler.worker.toml"
generate_config "wrangler.pages.toml.template" "wrangler.pages.toml"