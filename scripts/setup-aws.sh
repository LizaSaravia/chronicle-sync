#!/bin/bash
set -e

# Default values
REGION="us-east-1"
DOMAIN="chronicle-sync.dev"
ENVIRONMENTS=("staging" "production")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Help text
usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -r, --region         AWS region (default: us-east-1)"
    echo "  -d, --domain         Domain name (default: chronicle-sync.dev)"
    echo "  -p, --profile        AWS CLI profile to use"
    echo "  -h, --help           Show this help message"
    echo
    echo "Example:"
    echo "  $0 --region us-west-2 --domain example.com --profile myprofile"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -r|--region)
            REGION="$2"
            shift
            shift
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift
            shift
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}Using AWS Account: $ACCOUNT_ID${NC}"

# Create IAM user for GitHub Actions
echo -e "\n${YELLOW}Creating IAM user for GitHub Actions...${NC}"
aws iam create-user --user-name github-actions-chronicle-sync || true

# Create and attach policy
echo -e "\n${YELLOW}Creating IAM policy...${NC}"
POLICY_ARN=$(aws iam create-policy --policy-name chronicle-sync-deploy \
    --policy-document '{
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
}' --query Policy.Arn --output text 2>/dev/null || \
aws iam get-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/chronicle-sync-deploy --query Policy.Arn --output text)

echo -e "${GREEN}Policy ARN: $POLICY_ARN${NC}"

# Attach policy to user
echo -e "\n${YELLOW}Attaching policy to user...${NC}"
aws iam attach-user-policy --user-name github-actions-chronicle-sync --policy-arn $POLICY_ARN || true

# Create access key
echo -e "\n${YELLOW}Creating access key...${NC}"
ACCESS_KEY=$(aws iam create-access-key --user-name github-actions-chronicle-sync --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text)
ACCESS_KEY_ID=$(echo $ACCESS_KEY | cut -d' ' -f1)
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY | cut -d' ' -f2)

# Create ECR repositories
echo -e "\n${YELLOW}Creating ECR repository...${NC}"
aws ecr create-repository --repository-name chronicle-sync \
    --image-scanning-configuration scanOnPush=true \
    --region $REGION || true

ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Create S3 buckets and CloudFront distributions for each environment
for ENV in "${ENVIRONMENTS[@]}"; do
    echo -e "\n${YELLOW}Setting up $ENV environment...${NC}"
    
    # Create S3 bucket
    BUCKET_NAME="chronicle-sync-${ENV}"
    echo "Creating S3 bucket: $BUCKET_NAME"
    aws s3api create-bucket --bucket $BUCKET_NAME \
        --region $REGION || true
    
    # Enable static website hosting
    aws s3api put-bucket-website --bucket $BUCKET_NAME \
        --website-configuration '{
            "IndexDocument": {"Suffix": "index.html"},
            "ErrorDocument": {"Key": "index.html"}
        }'
    
    # Create CloudFront distribution
    DOMAIN_PREFIX=$([[ "$ENV" == "production" ]] && echo "app" || echo "$ENV")
    DISTRIBUTION_ID=$(aws cloudfront create-distribution \
        --origin-domain-name "$BUCKET_NAME.s3.amazonaws.com" \
        --default-root-object "index.html" \
        --aliases "$DOMAIN_PREFIX.$DOMAIN" \
        --query "Distribution.Id" --output text || \
        aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'$DOMAIN_PREFIX.$DOMAIN')]].Id" --output text)
    
    echo -e "${GREEN}Created/Found CloudFront distribution: $DISTRIBUTION_ID${NC}"
done

# Create ECS clusters
for ENV in "${ENVIRONMENTS[@]}"; do
    echo -e "\n${YELLOW}Creating ECS cluster for $ENV...${NC}"
    aws ecs create-cluster --cluster-name chronicle-sync-${ENV} || true
done

# Output the configuration
echo -e "\n${GREEN}Setup complete! Here are your credentials and configuration:${NC}"
echo -e "\n${YELLOW}Add these secrets to your GitHub repository:${NC}"
echo -e "AWS_ACCESS_KEY_ID: ${GREEN}$ACCESS_KEY_ID${NC}"
echo -e "AWS_SECRET_ACCESS_KEY: ${GREEN}$SECRET_ACCESS_KEY${NC}"
echo -e "ECR_REGISTRY: ${GREEN}$ECR_REGISTRY${NC}"

echo -e "\n${YELLOW}CloudFront Distribution IDs:${NC}"
for ENV in "${ENVIRONMENTS[@]}"; do
    DOMAIN_PREFIX=$([[ "$ENV" == "production" ]] && echo "app" || echo "$ENV")
    DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'$DOMAIN_PREFIX.$DOMAIN')]].Id" --output text)
    echo -e "$ENV: ${GREEN}$DISTRIBUTION_ID${NC}"
done

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Add the secrets to your GitHub repository"
echo "2. Configure your domain DNS to point to the CloudFront distributions"
echo "3. Set up SSL certificates in ACM for your domains"
echo "4. Update the CloudFront distributions with the SSL certificates"