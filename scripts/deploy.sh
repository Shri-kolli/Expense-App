#!/bin/bash

# Deployment script for Personal Expense Tracker

set -e

echo "🚀 Personal Expense Tracker - Deployment Script"
echo "================================================"

# Resolve native commands first, then Windows executables available through WSL.
AWS_CLI=$(command -v aws || command -v aws.exe || true)
if [ -z "$AWS_CLI" ]; then
    echo "❌ AWS CLI not found. Please install it first."
    echo "   macOS: brew install awscli"
    echo "   Windows: winget install -e --id Amazon.AWSCLI"
    exit 1
fi

TERRAFORM=$(command -v terraform || command -v terraform.exe || true)
if [ -z "$TERRAFORM" ]; then
    echo "❌ Terraform not found. Please install it first."
    echo "   macOS: brew install terraform"
    echo "   Windows: winget install -e --id Hashicorp.Terraform"
    exit 1
fi

# Check if AWS is configured
if ! "$AWS_CLI" sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run: $AWS_CLI configure"
    exit 1
fi

echo ""
echo "✅ Prerequisites check passed"
echo ""

# Prompt for configuration
read -p "Enter a unique S3 bucket name (must be globally unique): " BUCKET_NAME
read -p "Enter your user ID (default: user001): " USER_ID
USER_ID=${USER_ID:-user001}

read -p "Enter AWS region (default: ap-south-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-ap-south-1}

echo ""
echo "Configuration:"
echo "  Bucket: $BUCKET_NAME"
echo "  User ID: $USER_ID"
echo "  Region: $AWS_REGION"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Update Terraform variables
cd infrastructure/terraform

cat > terraform.tfvars <<EOF
aws_region  = "$AWS_REGION"
bucket_name = "$BUCKET_NAME"
user_id     = "$USER_ID"
EOF

echo ""
echo "📦 Initializing Terraform..."
"$TERRAFORM" init

echo ""
echo "🔍 Planning infrastructure..."
"$TERRAFORM" plan

echo ""
read -p "Proceed with infrastructure creation? (yes/no): " PROCEED

if [ "$PROCEED" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🏗️  Creating infrastructure..."
"$TERRAFORM" apply -auto-approve

# Capture outputs
USER_POOL_ID=$("$TERRAFORM" output -raw cognito_user_pool_id)
CLIENT_ID=$("$TERRAFORM" output -raw cognito_client_id)
LOGIN_DOMAIN=$("$TERRAFORM" output -raw cognito_login_domain)
WEBSITE_URL=$("$TERRAFORM" output -raw website_url)

echo ""
echo "✅ Infrastructure created successfully!"
echo ""
echo "Website URL: $WEBSITE_URL"
echo ""

# Keep the frontend's public Cognito settings aligned with this deployment.
cd ../../frontend/js
cat > auth-config.js <<EOF
const AUTH_CONFIG = {
    region: '$AWS_REGION',
    userPoolId: '$USER_POOL_ID',
    clientId: '$CLIENT_ID',
    hostedUiDomain: '$LOGIN_DOMAIN'
};
EOF

# Deploy frontend to S3
cd ..
echo ""
echo "📤 Uploading frontend to S3..."

"$AWS_CLI" s3 sync . "s3://$BUCKET_NAME" --delete --region "$AWS_REGION"

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "================================================"
echo "Your Expense Tracker is ready!"
echo ""
echo "Website URL: $WEBSITE_URL"
echo ""
echo "Next Steps:"
echo "1. Open the HTTPS website URL"
echo "2. Sign in with an administrator-created Cognito account"
echo "3. On first sign-in, change the temporary password and enroll authenticator-app MFA"
echo "4. Initialize categories if prompted"
echo ""
echo "================================================"
