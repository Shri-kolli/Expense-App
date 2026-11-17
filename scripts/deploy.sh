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
API_ENDPOINT=$("$TERRAFORM" output -raw api_endpoint)
WEBSITE_URL=$("$TERRAFORM" output -raw website_url)

echo ""
echo "✅ Infrastructure created successfully!"
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo "Website URL: $WEBSITE_URL"
echo ""

# Update frontend config
cd ../../frontend/js

echo "📝 Updating frontend configuration..."

cat > config.js <<EOF
// API Configuration
const API_CONFIG = {
    baseUrl: '$API_ENDPOINT',
    endpoints: {
        categories: '/categories',
        transactions: '/transactions',
        summary: '/summary',
        initialize: '/initialize'
    }
};

function isApiConfigured() {
    return API_CONFIG.baseUrl !== 'YOUR_API_GATEWAY_URL_HERE';
}

function getApiUrl(endpoint) {
    return API_CONFIG.baseUrl + endpoint;
}
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
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "Next Steps:"
echo "1. Open the website URL in your browser"
echo "2. Click 'Yes' when prompted to initialize default categories"
echo "3. Start tracking your expenses!"
echo ""
echo "To initialize via API:"
echo "  curl -X POST $API_ENDPOINT/initialize"
echo ""
echo "================================================"
