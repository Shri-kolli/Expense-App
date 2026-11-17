#!/bin/bash

# Project verification script
# Checks that all required files are in place

echo "🔍 Verifying Personal Expense Tracker Project..."
echo ""

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ MISSING: $1"
        ((ERRORS++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
    else
        echo "❌ MISSING: $1/"
        ((ERRORS++))
    fi
}

echo "📘 Documentation Files:"
check_file "README.md"
check_file "GET_STARTED.md"
check_file "QUICKSTART.md"
check_file "DEPLOYMENT.md"
check_file "ARCHITECTURE.md"
check_file "FEATURES.md"
check_file "PROJECT_SUMMARY.md"
check_file "PROJECT_STRUCTURE.txt"
check_file ".gitignore"

echo ""
echo "🌐 Frontend Files:"
check_file "frontend/index.html"
check_file "frontend/css/style.css"
check_file "frontend/js/config.js"
check_file "frontend/js/api.js"
check_file "frontend/js/app.js"

echo ""
echo "⚙️ Backend Files:"
check_file "backend/functions/main.py"
check_file "backend/requirements.txt"

echo ""
echo "🏗️ Infrastructure Files:"
check_file "infrastructure/terraform/main.tf"
check_file "infrastructure/terraform/variables.tf"

echo ""
echo "🛠️ Script Files:"
check_file "scripts/deploy.sh"
check_file "scripts/update-frontend.sh"
check_file "scripts/update-lambda.sh"
check_file "scripts/import-data.py"

echo ""
echo "📁 Directory Structure:"
check_dir "frontend"
check_dir "frontend/css"
check_dir "frontend/js"
check_dir "backend"
check_dir "backend/functions"
check_dir "infrastructure"
check_dir "infrastructure/terraform"
check_dir "scripts"

echo ""
echo "🔧 Checking Prerequisites:"

# Check AWS CLI
if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1)
    echo "✅ AWS CLI installed ($AWS_VERSION)"
else
    echo "⚠️  AWS CLI not installed (run: brew install awscli)"
    ((WARNINGS++))
fi

# Check Terraform
if command -v terraform &> /dev/null; then
    TF_VERSION=$(terraform --version | head -n1)
    echo "✅ Terraform installed ($TF_VERSION)"
else
    echo "⚠️  Terraform not installed (run: brew install terraform)"
    ((WARNINGS++))
fi

# Check AWS credentials
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo "✅ AWS credentials configured (Account: $AWS_ACCOUNT)"
else
    echo "⚠️  AWS credentials not configured (run: aws configure)"
    ((WARNINGS++))
fi

# Check Python
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 --version)
    echo "✅ Python installed ($PY_VERSION)"
else
    echo "⚠️  Python 3 not installed"
    ((WARNINGS++))
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED!"
    echo ""
    echo "Your project is complete and ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "  1. Read GET_STARTED.md for deployment instructions"
    echo "  2. Run ./scripts/deploy.sh to deploy"
    echo ""
elif [ $ERRORS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
    echo "✅ PROJECT FILES COMPLETE!"
    echo "⚠️  $WARNINGS prerequisite(s) missing"
    echo ""
    echo "Install missing prerequisites:"
    echo "  brew install awscli terraform"
    echo "  aws configure"
    echo ""
else
    echo "❌ $ERRORS file(s) missing"
    [ $WARNINGS -gt 0 ] && echo "⚠️  $WARNINGS prerequisite(s) missing"
    echo ""
    echo "Please ensure all files are present before deployment."
    echo ""
fi

echo "════════════════════════════════════════════════════════"
