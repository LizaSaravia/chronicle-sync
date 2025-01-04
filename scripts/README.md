# AWS Setup Script

This script automates the setup of AWS infrastructure required for Chronicle Sync.

## Prerequisites

1. AWS CLI installed and configured with admin access
2. A registered domain name (default: chronicle-sync.dev)

## What the Script Creates

1. IAM User and Policy for GitHub Actions
   - Creates a dedicated IAM user
   - Creates and attaches required permissions
   - Generates access keys

2. ECR Repository
   - Creates repository for Docker images
   - Enables image scanning

3. S3 Buckets and CloudFront Distributions
   - Creates buckets for staging and production
   - Sets up CloudFront distributions
   - Configures for static website hosting

4. ECS Clusters
   - Creates clusters for staging and production

## Usage

```bash
./setup-aws.sh [options]

Options:
  -r, --region         AWS region (default: us-east-1)
  -d, --domain         Domain name (default: chronicle-sync.dev)
  -p, --profile        AWS CLI profile to use
  -h, --help           Show this help message

Example:
  ./setup-aws.sh --region us-west-2 --domain example.com --profile myprofile
```

## After Running

1. Add the generated secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `ECR_REGISTRY`
   - `CLOUDFRONT_DISTRIBUTION_ID`

2. Configure your domain DNS:
   - Point `app.your-domain.com` to the production CloudFront distribution
   - Point `staging.your-domain.com` to the staging CloudFront distribution

3. Set up SSL certificates:
   - Request certificates in AWS Certificate Manager
   - Update CloudFront distributions with the certificates

## Security Note

The script generates AWS access keys and outputs them to the terminal. Make sure to:
1. Save these credentials securely
2. Add them to GitHub repository secrets immediately
3. Don't share or commit them anywhere