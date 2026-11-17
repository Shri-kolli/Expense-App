#!/bin/bash

# Quick script to update frontend after changes

set -e

if [ -z "$1" ]; then
    echo "Usage: ./update-frontend.sh <bucket-name>"
    echo "Example: ./update-frontend.sh my-expense-tracker-bucket"
    exit 1
fi

BUCKET_NAME=$1

echo "📤 Uploading frontend changes to S3..."
cd frontend
aws s3 sync . s3://$BUCKET_NAME --delete

echo "✅ Frontend updated successfully!"
echo "Visit your website to see the changes."
