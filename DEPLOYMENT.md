# Deployment Guide

This guide will help you deploy your Personal Expense Tracker to AWS.

## Prerequisites

1. **AWS Account** - Create one at https://aws.amazon.com if you don't have one
2. **AWS CLI** installed and configured
3. **Terraform** installed (or use CloudFormation alternative)
4. **Python 3.11** installed locally

## Cost Estimate

- **Expected monthly cost**: $0.50 - $2.00
- Most services stay within AWS Free Tier for personal use

## Step-by-Step Deployment

### Option 1: Using Terraform (Recommended)

#### Step 1: Install Prerequisites

```bash
# Install AWS CLI
# macOS
brew install awscli

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region (use ap-south-1)

# Install Terraform
brew install terraform
```

#### Step 2: Customize Configuration

Edit `infrastructure/terraform/variables.tf`:

```hcl
variable "bucket_name" {
  default     = "your-unique-bucket-name-here"  # MUST BE GLOBALLY UNIQUE
}

variable "user_id" {
  default     = "user001"  # Your personal user ID
}
```

#### Step 3: Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Deploy
terraform apply
# Type 'yes' when prompted

# SAVE THE OUTPUTS - you'll need them!
# - website_url: Your S3 website URL
# - api_endpoint: Your API Gateway endpoint
```

#### Step 4: Update Frontend Configuration

Copy the `api_endpoint` from Terraform output and update:

```bash
# Edit frontend/js/config.js
# Replace 'YOUR_API_GATEWAY_URL_HERE' with your actual API endpoint
```

Example:
```javascript
const API_CONFIG = {
    baseUrl: 'https://abc123xyz.execute-api.ap-south-1.amazonaws.com',
    // ...
};
```

#### Step 5: Deploy Frontend to S3

```bash
# From project root
cd frontend

# Upload to S3 (replace bucket name)
aws s3 sync . s3://your-bucket-name --delete

# Make files public
aws s3 cp s3://your-bucket-name s3://your-bucket-name --recursive --acl public-read
```

#### Step 6: Initialize Default Data

Open your website URL (from Terraform output) in a browser. When prompted, click "Yes" to initialize default categories.

OR manually initialize via API:

```bash
curl -X POST https://your-api-endpoint.com/initialize
```

### Option 2: Using AWS Console (Manual)

<details>
<summary>Click to expand manual deployment steps</summary>

#### Step 1: Create DynamoDB Table

1. Go to AWS Console → DynamoDB
2. Create table:
   - Table name: `ExpenseTrackerData`
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)
   - Settings: On-demand (default)
3. Add Global Secondary Index:
   - Index name: `GSI1`
   - Partition key: `GSI1PK` (String)
   - Sort key: `GSI1SK` (String)
   - Projection: All attributes

#### Step 2: Create Lambda Function

1. Go to AWS Console → Lambda
2. Create function:
   - Name: `expense_tracker_api`
   - Runtime: Python 3.11
   - Create new role with basic Lambda permissions
3. Add permissions to role:
   - Attach policy: `AmazonDynamoDBFullAccess`
4. Upload code:
   - Zip `backend/functions/main.py`
   - Upload to Lambda
5. Set environment variables:
   - `TABLE_NAME`: `ExpenseTrackerData`
   - `USER_ID`: `user001`
6. Set timeout: 30 seconds

#### Step 3: Create API Gateway

1. Go to AWS Console → API Gateway
2. Create HTTP API (not REST API)
3. Add integration → Lambda
4. Select your Lambda function
5. Create route: `ANY /{proxy+}`
6. Enable CORS
7. Deploy API
8. Copy the API endpoint URL

#### Step 4: Create S3 Bucket

1. Go to AWS Console → S3
2. Create bucket (unique name)
3. Enable static website hosting
4. Set index document: `index.html`
5. Make bucket public:
   - Disable "Block all public access"
   - Add bucket policy (see below)
6. Upload frontend files

**Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

#### Step 5: Update Frontend Config and Upload

1. Edit `frontend/js/config.js` with your API endpoint
2. Upload all frontend files to S3

</details>

## Post-Deployment

### Access Your Application

Visit your S3 website URL:
```
http://your-bucket-name.s3-website.ap-south-1.amazonaws.com
```

### Initialize Default Data

On first visit, accept the prompt to initialize default categories, or call:
```bash
curl -X POST https://your-api-endpoint/initialize
```

### Test the Application

1. ✅ Add a test expense
2. ✅ Add a test income
3. ✅ Check dashboard shows correct totals
4. ✅ Try editing/deleting transactions
5. ✅ Create a custom category

## Making Updates

### Update Lambda Function

```bash
cd backend/functions
zip -r function.zip .
aws lambda update-function-code \
  --function-name expense_tracker_api \
  --zip-file fileb://function.zip
```

### Update Frontend

```bash
cd frontend
aws s3 sync . s3://your-bucket-name --delete
```

## Troubleshooting

### "API not configured" error
- Make sure you updated `frontend/js/config.js` with your actual API endpoint
- Re-upload frontend files to S3

### CORS errors
- Check API Gateway CORS configuration
- Ensure all methods (GET, POST, PUT, DELETE) are allowed

### 403 Forbidden on S3
- Check bucket policy allows public access
- Verify "Block Public Access" is disabled

### Lambda timeout
- Increase timeout in Lambda configuration (current: 30s)
- Check CloudWatch logs for errors

### DynamoDB access denied
- Ensure Lambda execution role has DynamoDB permissions
- Verify table name matches in environment variables

## Cost Optimization

### Current Setup (Already Optimized)
- ✅ DynamoDB: On-demand pricing (pay per request)
- ✅ Lambda: Free tier covers 1M requests/month
- ✅ API Gateway: HTTP API (cheaper than REST)
- ✅ S3: Minimal storage costs

### Additional Savings
- Use CloudFront only if you need a custom domain (adds cost)
- Keep Lambda memory at default 128MB
- Use `ap-south-1` region

## Security Notes

⚠️ **Important**: This is a personal expense tracker with minimal security:
- No authentication/login system
- Anyone with the URL can access
- Do NOT use for sensitive financial data

### To Add Basic Security (Optional)

1. **API Key Protection**:
   - Add API key to API Gateway
   - Update frontend to include API key in requests

2. **AWS Cognito** (adds ~$0/month for first 50k users):
   - Add user authentication
   - More complex setup

3. **VPC Configuration**:
   - Put Lambda in VPC
   - More expensive (NAT Gateway costs)

## Cleanup / Destroy

To delete everything and stop charges:

```bash
cd infrastructure/terraform

# Delete all resources
terraform destroy
# Type 'yes' when prompted

# Manual cleanup:
# - Empty and delete S3 bucket
# - Delete DynamoDB table
```

## Support

For issues:
1. Check CloudWatch Logs for Lambda errors
2. Review API Gateway logs
3. Check browser console for frontend errors

## Next Steps

- Set up monthly budget alerts in AWS
- Add more categories specific to your needs
- Customize the frontend colors/theme
- Export data periodically as backup
