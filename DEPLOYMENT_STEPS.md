# Step-by-Step Deployment Guide

## ⚠️ What You Need to Know First

### S3 Bucket - YES, It Creates a NEW Bucket
- The deployment script creates a **brand new S3 bucket**
- You need to **choose a unique name** (globally unique across all AWS)
- Example names: `john-expense-tracker-2026`, `myexpenses-personal-app`
- **The name must be unique** - if someone else used it, pick another
- **No existing bucket needed** - everything is created fresh

### What Terraform Does
Terraform is "Infrastructure as Code" - it:
1. Reads your configuration (`main.tf`)
2. Creates ALL AWS resources automatically
3. Configures them correctly
4. Links them together

Think of it like a robot that sets up your entire AWS infrastructure!

---

## 📋 COMPLETE DEPLOYMENT STEPS

### Prerequisites (One-Time Setup)

#### Step 1: Create AWS Account (if you don't have one)
```
1. Go to: https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow signup process
4. Add credit card (required, but charges will be minimal)
5. Verify email and phone
```

#### Step 2: Create IAM User (for programmatic access)
```
1. Login to AWS Console: https://console.aws.amazon.com
2. Go to IAM service
3. Click "Users" → "Create user"
4. Username: "expense-tracker-admin"
5. Select: "Provide user access to AWS Management Console" (optional)
6. Click "Next"

7. Set permissions:
   → "Attach policies directly"
   → Select "AdministratorAccess" (for easier setup)
   → Click "Next"

8. Click "Create user"

9. Create Access Keys:
   → Click on the user you just created
   → Go to "Security credentials" tab
   → Scroll to "Access keys"
   → Click "Create access key"
   → Choose "Command Line Interface (CLI)"
   → Check the confirmation box
   → Click "Create access key"
   → ⚠️ IMPORTANT: Copy both:
      - Access Key ID
      - Secret Access Key
   → Save them somewhere safe!
```

#### Step 3: Install Prerequisites on Your Mac

**Install Homebrew (if not already installed):**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Install AWS CLI:**
```bash
brew install awscli

# Verify installation
aws --version
# Should show: aws-cli/2.x.x
```

**Install Terraform:**
```bash
brew install terraform

# Verify installation
terraform --version
# Should show: Terraform v1.x.x
```

#### Step 4: Configure AWS CLI
```bash
aws configure

# You'll be prompted for:
AWS Access Key ID: [paste your Access Key ID]
AWS Secret Access Key: [paste your Secret Access Key]
Default region name: ap-south-1
Default output format: json

# Test it works
aws sts get-caller-identity
# Should show your account info
```

---

## 🚀 ACTUAL DEPLOYMENT

### Method 1: Automatic Deployment (Easiest) ⭐ RECOMMENDED

#### Step 1: Navigate to Project
```bash
cd /Users/kzgh317/Documents/bot/Expense-App
```

#### Step 2: Choose Your Bucket Name
Think of a globally unique name:
- Examples: 
  - `yourname-expenses-2026`
  - `personal-expense-tracker-kzgh317`
  - `my-expense-app-unique123`
- Rules:
  - Lowercase letters only
  - Can include numbers and hyphens
  - Must be 3-63 characters
  - Must be globally unique

#### Step 3: Run Deployment Script
```bash
./scripts/deploy.sh
```

#### Step 4: Answer the Prompts
```
Enter a unique S3 bucket name: yourname-expenses-2026
Enter your user ID (default: user001): [Press Enter or type custom ID]
Enter AWS region (default: ap-south-1): [Press Enter]

Configuration:
  Bucket: yourname-expenses-2026
  User ID: user001
  Region: ap-south-1

Continue with deployment? (yes/no): yes
```

#### Step 5: Wait for Terraform
The script will now:
1. Initialize Terraform (download AWS provider)
2. Create infrastructure plan
3. Ask for final confirmation
4. Create all AWS resources (3-5 minutes)

You'll see output like:
```
📦 Initializing Terraform...
✅ Terraform initialized

🔍 Planning infrastructure...
Plan: 8 to add, 0 to change, 0 to destroy

🏗️ Creating infrastructure...
Creating DynamoDB table...
Creating S3 bucket...
Creating Lambda function...
Creating API Gateway...

✅ Infrastructure created successfully!

API Endpoint: https://abc123xyz.execute-api.ap-south-1.amazonaws.com
Website URL: http://yourname-expenses-2026.s3-website.ap-south-1.amazonaws.com
```

#### Step 6: Copy Your URLs
**SAVE THESE!** You'll need them:
- **Website URL**: Your app's web address
- **API Endpoint**: Backend API address (script auto-configures this)

#### Step 7: Open Your Website
```bash
# The script shows the URL, or open it manually:
open http://yourname-expenses-2026.s3-website.ap-south-1.amazonaws.com
```

#### Step 8: Initialize Data
1. Website will load
2. Popup asks: "Initialize default categories?"
3. Click **"Yes"**
4. Default categories are created
5. Start using the app!

---

### Method 2: Manual Deployment (Step-by-Step Control)

If the script doesn't work or you want more control:

#### Step 1: Edit Configuration
```bash
cd /Users/kzgh317/Documents/bot/Expense-App/infrastructure/terraform

# Edit variables.tf
nano variables.tf

# Change these lines:
variable "bucket_name" {
  default = "your-unique-bucket-name-here"  # CHANGE THIS!
}

variable "user_id" {
  default = "user001"  # Or your name
}

# Save and exit (Ctrl+X, Y, Enter)
```

#### Step 2: Initialize Terraform
```bash
terraform init
```
This downloads the AWS provider plugin.

#### Step 3: Plan Infrastructure
```bash
terraform plan
```
This shows what will be created. Review it!

#### Step 4: Create Infrastructure
```bash
terraform apply

# Type: yes
```
Wait 3-5 minutes while AWS creates everything.

#### Step 5: Note the Outputs
```bash
# Terraform will show:
Outputs:

api_endpoint = "https://abc123.execute-api.ap-south-1.amazonaws.com"
dynamodb_table = "ExpenseTrackerData"
website_url = "http://yourname-expenses-2026.s3-website.ap-south-1.amazonaws.com"
```

**COPY THESE!**

#### Step 6: Update Frontend Config
```bash
cd ../../frontend/js

# Edit config.js
nano config.js

# Find this line:
baseUrl: 'YOUR_API_GATEWAY_URL_HERE',

# Replace with YOUR API endpoint:
baseUrl: 'https://abc123.execute-api.ap-south-1.amazonaws.com',

# Save and exit
```

#### Step 7: Upload Frontend to S3
```bash
cd ..  # Back to frontend directory

# Upload all files
aws s3 sync . s3://yourname-expenses-2026 --delete

# Should show:
upload: index.html to s3://...
upload: css/style.css to s3://...
upload: js/app.js to s3://...
```

#### Step 8: Open Website
```bash
open http://yourname-expenses-2026.s3-website.ap-south-1.amazonaws.com
```

#### Step 9: Initialize Default Data
Click "Yes" when prompted, or manually:
```bash
curl -X POST https://your-api-endpoint.com/initialize
```

---

## ✅ Verification Steps

After deployment, verify everything works:

### 1. Check S3 Bucket Exists
```bash
aws s3 ls | grep yourname-expenses

# Should show your bucket name
```

### 2. Check Website is Accessible
```bash
curl http://yourname-expenses-2026.s3-website.ap-south-1.amazonaws.com

# Should return HTML content
```

### 3. Check Lambda Function
```bash
aws lambda get-function --function-name expense_tracker_api

# Should show function details
```

### 4. Check DynamoDB Table
```bash
aws dynamodb describe-table --table-name ExpenseTrackerData

# Should show table status: ACTIVE
```

### 5. Test API Endpoint
```bash
curl https://your-api-endpoint.com/categories

# Should return: {"categories": [...]}
```

### 6. Open Website and Test
1. Open website URL in browser
2. Initialize data (click Yes)
3. Go to "Add Transaction" tab
4. Add a test expense
5. Check Dashboard shows the expense

---

## 🔧 Troubleshooting

### Error: "Bucket name already exists"
**Solution:** Choose a different bucket name (globally unique required)
```bash
# Try adding your name or random numbers
yourname-expenses-abc123
```

### Error: "Terraform not found"
**Solution:** Install Terraform
```bash
brew install terraform
```

### Error: "AWS credentials not configured"
**Solution:** Run AWS configure again
```bash
aws configure
```

### Error: "API not configured"
**Solution:** Update frontend config.js with correct API endpoint
```bash
# Edit: frontend/js/config.js
# Set baseUrl to your API Gateway URL
```

### Website loads but no data
**Solution:** Initialize default data
```bash
# Either click "Yes" on popup, or:
curl -X POST https://your-api-endpoint/initialize
```

### Can't access website
**Solution:** Wait 2-3 minutes after deployment, then refresh

---

## 💰 Cost Check

After deployment, check your costs:

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2026-11-01,End=2026-11-30 \
  --granularity MONTHLY \
  --metrics "BlendedCost"
```

**Expected costs:**
- First month: ~$0.50-$1.00
- Ongoing: ~$0.50-$2.00/month

---

## 🗑️ How to Delete Everything (Cleanup)

If you want to remove everything and stop charges:

```bash
cd /Users/kzgh317/Documents/bot/Expense-App/infrastructure/terraform

# Delete all resources
terraform destroy

# Type: yes

# This will delete:
# - S3 bucket (and all files)
# - DynamoDB table (and all data)
# - Lambda function
# - API Gateway
# - IAM roles
```

**⚠️ WARNING:** This deletes ALL your data permanently!

---

## 📊 What Each File Does

**Your project structure:**
```
infrastructure/terraform/main.tf
   ↑ This file tells Terraform what to create

backend/functions/main.py
   ↑ This is your Lambda function code

frontend/
   ↑ Your website files (HTML/CSS/JS)
```

**Terraform reads `main.tf` and creates:**
1. S3 bucket (from your chosen name)
2. DynamoDB table (named "ExpenseTrackerData")
3. Lambda function (uploads main.py code)
4. API Gateway (creates endpoint URL)
5. IAM roles (for permissions)

---

## 🎯 Summary

**What happens during deployment:**
1. ✅ Terraform creates NEW S3 bucket (you choose name)
2. ✅ Terraform creates DynamoDB table
3. ✅ Terraform creates Lambda function (uploads Python code)
4. ✅ Terraform creates API Gateway
5. ✅ Script uploads frontend files to S3
6. ✅ Script configures API endpoint in frontend
7. ✅ You open website and start using it!

**Total time:** 10-15 minutes  
**Your cost:** ~$0.50-$2/month  
**Your data:** Stored in YOUR AWS account (you own it)

---

## 🚀 Quick Commands Reference

```bash
# Deploy everything
./scripts/deploy.sh

# Update frontend only
./scripts/update-frontend.sh your-bucket-name

# Update backend only
./scripts/update-lambda.sh

# Check what exists
aws s3 ls
aws lambda list-functions
aws dynamodb list-tables

# Delete everything
cd infrastructure/terraform
terraform destroy
```

---

**Ready to deploy? Run:**
```bash
cd /Users/kzgh317/Documents/bot/Expense-App
./scripts/deploy.sh
```

Good luck! 🎉
