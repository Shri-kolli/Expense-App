# 🚀 GET STARTED - Your Personal Expense Tracker

## What You Have

A **complete, ready-to-deploy** expense tracking application that:
- ✅ Runs on AWS (serverless)
- ✅ Costs only **$0.50-$2/month**
- ✅ Matches your exact spreadsheet format
- ✅ Includes all your categories with limits
- ✅ Tracks income and expenses
- ✅ Carries over balance month-to-month

## 📂 Your Project Files

```
Expense-App/
├── 📘 Documentation
│   ├── README.md              ← Start here
│   ├── QUICKSTART.md          ← 15-min deployment
│   ├── DEPLOYMENT.md          ← Detailed guide
│   ├── ARCHITECTURE.md        ← How it works
│   ├── FEATURES.md            ← What it does
│   └── PROJECT_SUMMARY.md     ← Complete overview
│
├── 🌐 Frontend (Website)
│   ├── index.html             ← Main page
│   ├── css/style.css          ← Styling
│   └── js/
│       ├── config.js          ← API config
│       ├── api.js             ← API calls
│       └── app.js             ← Main logic
│
├── ⚙️ Backend (Lambda)
│   └── functions/
│       └── main.py            ← All API logic
│
├── 🏗️ Infrastructure (Terraform)
│   └── terraform/
│       ├── main.tf            ← AWS resources
│       └── variables.tf       ← Config options
│
└── 🛠️ Scripts (Utilities)
    ├── deploy.sh              ← One-click deploy
    ├── update-frontend.sh     ← Update website
    ├── update-lambda.sh       ← Update backend
    └── import-data.py         ← Import CSV data
```

## 🎯 Three Ways to Get Started

### Option 1: Quick Deploy (Recommended) ⚡
**Time**: 15 minutes

```bash
# 1. Install prerequisites
brew install awscli terraform

# 2. Configure AWS
aws configure
# Enter: Access Key, Secret Key, Region (ap-south-1)

# 3. Deploy everything
cd /Users/kzgh317/Documents/bot/Expense-App
./scripts/deploy.sh

# Follow the prompts, and you're done! 🎉
```

### Option 2: Manual Setup 🔧
**Time**: 30-45 minutes

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step manual deployment using AWS Console.

### Option 3: Learn & Deploy 📚
**Time**: 1-2 hours

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
2. Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment details
3. Deploy using Terraform or AWS Console
4. Customize to your needs

## 📋 Pre-Deployment Checklist

Before you start, make sure you have:

- [ ] **AWS Account** (create at aws.amazon.com)
- [ ] **Credit card** on AWS account (for verification, charges will be minimal)
- [ ] **Homebrew** installed (macOS) - for AWS CLI & Terraform
- [ ] **20-30 minutes** of time
- [ ] **Unique S3 bucket name** in mind (e.g., "john-expense-tracker-2026")

## 🎬 Step-by-Step: First Deployment

### Step 1: Install Tools (5 minutes)

```bash
# Install AWS CLI
brew install awscli

# Install Terraform
brew install terraform

# Verify installations
aws --version
terraform --version
```

### Step 2: Configure AWS (3 minutes)

```bash
# Configure AWS credentials
aws configure

# You'll be asked for:
AWS Access Key ID: [Your access key]
AWS Secret Access Key: [Your secret key]
Default region name: ap-south-1
Default output format: json
```

**Don't have credentials?**
1. Go to AWS Console → IAM → Users
2. Create new user with Administrator access
3. Create access key
4. Copy access key ID and secret key

### Step 3: Customize Settings (2 minutes)

Edit `infrastructure/terraform/variables.tf`:

```hcl
variable "bucket_name" {
  default = "your-unique-name-here"  # CHANGE THIS!
}

variable "user_id" {
  default = "user001"  # Or your name
}
```

**Bucket name must be:**
- Globally unique across all AWS
- Lowercase letters, numbers, hyphens only
- 3-63 characters
- Example: "john-expense-tracker-2026"

### Step 4: Deploy (5 minutes)

```bash
# Run deployment script
./scripts/deploy.sh

# Enter your bucket name when prompted
# Confirm deployment (type 'yes')
# Wait 3-5 minutes for AWS to create resources
```

**What gets created:**
- ✅ DynamoDB table
- ✅ Lambda function
- ✅ API Gateway
- ✅ S3 bucket with website
- ✅ IAM roles and permissions

### Step 5: Access Your App (1 minute)

```bash
# Deployment script will output:
Website URL: http://your-bucket-name.s3-website.ap-south-1.amazonaws.com
API Endpoint: https://abc123.execute-api.ap-south-1.amazonaws.com
```

1. **Copy the Website URL**
2. **Open in browser**
3. **Click "Yes"** when prompted to initialize data
4. **Start tracking!**

## 🎨 Your Default Categories

Already configured based on your spreadsheet:

### Expenses (with monthly limits - unused budget carries forward)
| Category | Icon | Monthly Limit |
|----------|------|---------------|
| Fuel & Vehicle Expense | ⛽ | ₹3,000 |
| Shopping & Entertainment | 🛒 | ₹10,000 |
| Home Expense | 🏠 | ₹7,000 |
| Food Outside | 🍔 | ₹5,000 |
| To Mini | 💰 | ₹25,000 |
| Farm - Expense | 🌾 | ₹30,000 |
| Loan | 🏦 | ₹45,777 |

### Expenses (NO limits - NO carryover)
| Category | Icon | Notes |
|----------|------|-------|
| Salary - Driver | 🚗 | Driver salary payment |
| Others | 📦 | Miscellaneous expenses |

### Income Sources (NO carryover)
| Category | Icon | Notes |
|----------|------|-------|
| Earned - Nidagundi | 💵 | Primary income |
| Earned - Stocks | 📈 | Investment income |
| Farm - Income | 🌾 | Farm revenue |

## 📱 How to Use

### Add an Expense
1. Click **"Add Transaction"** tab
2. Select **"Expense"**
3. Choose category from dropdown
4. Enter amount (e.g., 450)
5. Pick date (defaults to today)
6. Add description (e.g., "Lunch at restaurant")
7. Click **"Add Transaction"**

### Add Income
1. Click **"Add Transaction"** tab
2. Select **"Income"**
3. Choose income source
4. Enter amount
5. Add description
6. Click **"Add Transaction"**

### View Dashboard
- **Dashboard** tab shows:
  - Total Income this month
  - Total Expenses this month
  - Current Balance
  - Previous month carryover
  - Category-wise spending bars
  - Recent transactions

### Manage Categories
1. Click **"Categories"** tab
2. **Add**: Click "+ Add Category"
3. **Edit**: Click "Edit" on any category
4. **Delete**: Click "Delete" (with confirmation)

### View History
1. Click **"History"** tab
2. Filter by month (optional)
3. **Edit** or **Delete** any transaction

## 🔄 Daily Workflow

**Morning:**
- Check dashboard for current balance
- Review yesterday's expenses

**Throughout Day:**
- Add expenses immediately (don't wait!)
- Use description field for details

**Evening:**
- Quick review of day's spending
- Check which categories are close to limit

**End of Month:**
- Review total spending
- Check carryover balance
- Adjust next month's limits if needed

## 💡 Pro Tips

1. **Add transactions immediately** - Don't wait till end of day
2. **Use descriptions** - "Food outside" vs "Food outside - Birthday dinner"
3. **Check limits weekly** - Stay aware of category budgets
4. **Review monthly** - Look for spending patterns
5. **Adjust limits** - Based on actual spending, not wishes
6. **Track everything** - Even small expenses add up
7. **Use carryover** - Understand month-to-month cash flow

## 🛠️ Common Tasks

### Update Frontend (after changing HTML/CSS/JS)
```bash
./scripts/update-frontend.sh your-bucket-name
```

### Update Backend (after changing Lambda code)
```bash
./scripts/update-lambda.sh
```

### Import Old Data from CSV
```bash
# 1. Create CSV file with format:
#    Date,Amount,Category,Description
# 2. Update API endpoint in import-data.py
# 3. Run:
python3 scripts/import-data.py your-data.csv
```

### Check AWS Costs
```bash
# View your current month's costs
aws ce get-cost-and-usage \
  --time-period Start=2026-11-01,End=2026-11-30 \
  --granularity MONTHLY \
  --metrics "BlendedCost"
```

## ⚠️ Important Notes

### Security
- **No authentication** - Anyone with URL can access
- **For personal use only** - Don't store sensitive data
- **Not public** - Don't share the URL publicly

### Privacy
- Data stays in **your AWS account**
- **You own everything**
- **No third-party services**
- **Can delete anytime**

### Costs
- **Expected**: $0.50-$2/month
- **Maximum**: ~$5/month (if very heavy use)
- **Free tier**: Covers most personal use
- **Monitor**: Check AWS billing dashboard monthly

## 🐛 Troubleshooting

### Can't access website?
- Wait 2-3 minutes after deployment
- Check bucket name in URL
- Try clearing browser cache

### "API not configured" error?
- Check `frontend/js/config.js` has correct API endpoint
- Re-run deploy script or manually update

### CORS errors?
- Terraform should configure CORS automatically
- Check API Gateway settings in AWS Console

### Data not showing?
- Initialize data: Open website, click "Yes" on prompt
- Or manually: `curl -X POST https://your-api-endpoint/initialize`

### Deployment failed?
- Check AWS credentials: `aws sts get-caller-identity`
- Check bucket name is unique
- Check Terraform syntax: `terraform validate`

## 📞 Need Help?

1. **Check Documentation**
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment issues
   - [ARCHITECTURE.md](ARCHITECTURE.md) - How it works
   - [FEATURES.md](FEATURES.md) - Feature questions

2. **Check AWS Logs**
   - CloudWatch Logs for Lambda errors
   - API Gateway logs for request issues

3. **Common Issues**
   - See "Troubleshooting" section in [DEPLOYMENT.md](DEPLOYMENT.md)

## ✅ Success Checklist

After deployment, verify:

- [ ] Website loads without errors
- [ ] Can add a test expense
- [ ] Dashboard shows the expense
- [ ] Can edit the expense
- [ ] Can delete the expense
- [ ] Can add a category
- [ ] Can add income transaction
- [ ] Month filter works in History
- [ ] Categories page loads
- [ ] All tabs work

## 🎉 You're Ready!

Everything is set up and ready to deploy. Choose your path:

**→ Quick Start**: Run `./scripts/deploy.sh` now  
**→ Learn First**: Read [ARCHITECTURE.md](ARCHITECTURE.md)  
**→ Detailed Guide**: Follow [DEPLOYMENT.md](DEPLOYMENT.md)

**Happy expense tracking! 💰📊✨**

---

**Questions? Issues?** Check the documentation files in this directory.

**Want to customize?** All code is editable - modify to your needs!

**Ready to deploy?** Run: `./scripts/deploy.sh`
