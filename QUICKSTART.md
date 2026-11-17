# Quick Start Guide

Get your Personal Expense Tracker running in 15 minutes!

## Prerequisites

```bash
# Install AWS CLI
brew install awscli

# Install Terraform
brew install terraform

# Configure AWS
aws configure
```

## One-Command Deployment

```bash
./scripts/deploy.sh
```

This will:
1. ✅ Create DynamoDB table
2. ✅ Deploy Lambda function
3. ✅ Set up API Gateway
4. ✅ Create S3 bucket
5. ✅ Upload frontend
6. ✅ Configure everything automatically

## After Deployment

1. **Open your website** (URL provided at end of deployment)
2. **Initialize data** when prompted (creates default categories)
3. **Start tracking!**

## Default Categories

Based on your spreadsheet data:

### Expenses (with monthly limits)
- ⛽ Fuel & Vehicle Expense (₹3,000)
- 🛒 Shopping & Entertainment (₹10,000)
- 🏠 Home Expense (₹7,000)
- 🍔 Food Outside (₹5,000)
- 💰 To Mini (₹25,000)
- 🌾 Farm Expense (₹30,000)
- 📦 Others
- 🏦 Loan (₹45,777)

### Income Sources
- 💼 Salary - Ishwar
- 💵 Earned - Nidagundi
- 📈 Earned - Stocks

## Making Changes

### Update Frontend (HTML/CSS/JS changes)
```bash
./scripts/update-frontend.sh your-bucket-name
```

### Update Backend (Lambda function changes)
```bash
./scripts/update-lambda.sh
```

### Add New Category
1. Go to **Categories** tab
2. Click **+ Add Category**
3. Fill in details and save

### Track Daily Expense
1. Go to **Add Transaction** tab
2. Select **Expense**
3. Choose category
4. Enter amount
5. Add description/comment
6. Click **Add Transaction**

## Key Features

✅ **Dashboard**: See totals, category spending, recent transactions  
✅ **Add Transaction**: Quick expense/income entry with comments  
✅ **History**: View all transactions, filter by month  
✅ **Categories**: Manage categories, set monthly limits  
✅ **Carryover**: Automatic balance carryover to next month  
✅ **Edit/Delete**: Modify or remove any transaction  

## Cost

Costs vary with usage and AWS free-tier eligibility. CloudFront and other services are
not guaranteed to be free. Check AWS Billing regularly.

## Troubleshooting

### Can't access website
- Open the HTTPS CloudFront URL, not the private S3 website endpoint.
- If prompted, sign in with the Cognito user.

### "API not configured" error
- The deployment script should auto-configure this
- If not, manually update `frontend/js/config.js`

### CORS errors
- API Gateway CORS is configured in Terraform
- Check browser console for details

### Data not loading
- Check CloudWatch logs for Lambda errors
- Verify DynamoDB table exists
- Call `/initialize` endpoint to set up default data

## Next Steps

1. **Customize categories** to match your needs
2. **Import existing data** from your spreadsheet
3. **Set up monthly budgets** for each category
4. **Track daily** to stay on budget

## Support

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed documentation.

---

**Happy tracking! 💰📊**
