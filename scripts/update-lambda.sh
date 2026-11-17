#!/bin/bash

# Quick script to update Lambda function after backend changes

set -e

echo "📦 Packaging Lambda function..."
cd backend/functions

# Create deployment package
zip -r ../../lambda_function.zip . -x "*.pyc" -x "__pycache__/*"

cd ../..

echo "📤 Uploading to Lambda..."
aws lambda update-function-code \
    --function-name expense_tracker_api \
    --zip-file fileb://lambda_function.zip

echo "🧹 Cleaning up..."
rm lambda_function.zip

echo "✅ Lambda function updated successfully!"
