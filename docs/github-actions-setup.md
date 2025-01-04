# GitHub Actions Setup Guide

This guide explains how to set up the required secrets for GitHub Actions workflows.

## Required Secrets

The following secrets need to be configured in your GitHub repository:

### AWS Authentication (Option 1: Access Keys)

1. `AWS_ACCESS_KEY_ID`: Your AWS access key ID
2. `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key

The IAM user needs these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetRepositoryPolicy",
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "ecr:DescribeImages",
                "ecr:BatchGetImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:PutImage",
                "ecr:CreateRepository",
                "ecs:UpdateService",
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:DeleteObject",
                "cloudfront:CreateInvalidation"
            ],
            "Resource": "*"
        }
    ]
}
```

### AWS Authentication (Option 2: OIDC - More Secure)

If you prefer using OIDC (recommended for production), follow these steps:

1. Create an IAM role with this trust policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:posix4e/chronicle-sync:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

2. Add the same permissions as above to the role
3. Set `AWS_ROLE_ARN` secret to the role's ARN
4. Update the workflow to use OIDC:
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: us-east-1
    role-session-name: GithubActions-${{ github.run_id }}
    audience: sts.amazonaws.com
```

### ECR (Elastic Container Registry)

1. `ECR_REGISTRY`: Your ECR registry URL (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com`)

### Browser Extension Stores

1. `CHROME_STORE_TOKEN`: Token for Chrome Web Store API
   - Go to https://chrome.google.com/webstore/devconsole
   - Click on your extension
   - Go to "Store settings" > "API access"
   - Generate a new token

2. `CHROME_STORE_ITEM_ID`: Your extension ID in Chrome Web Store
   - Found in the URL when viewing your extension in the Chrome Web Store

3. `AMO_JWT_ISSUER`: Firefox Add-ons JWT issuer
   - Go to https://addons.mozilla.org/developers/addon/api/key/
   - Generate new credentials
   - Use the "JWT issuer" value

4. `AMO_JWT_SECRET`: Firefox Add-ons JWT secret
   - Use the "JWT secret" value from the same page as above

### CloudFront

1. `CLOUDFRONT_DISTRIBUTION_ID`: Your CloudFront distribution ID
   - Found in the CloudFront console
   - Click on your distribution
   - The ID is shown in the "Distribution ID" column

## Setting Up Secrets

1. Go to your repository on GitHub
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add each secret with its corresponding value

## Environment Setup

The workflow uses two environments:
- `staging`: For staging deployments (staging branch)
- `production`: For production deployments (main branch)

To set up environments:
1. Go to repository settings
2. Click on "Environments"
3. Create "staging" and "production" environments
4. Add any required environment-specific protection rules or secrets