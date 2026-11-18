# Personal Expense Tracker

A private household expense tracker served over HTTPS. AWS charges vary with traffic and free-tier eligibility; they are not guaranteed to be zero.

The deployed app is at [https://d2t510a2ojscqn.cloudfront.net/](https://d2t510a2ojscqn.cloudfront.net/). Sign in with an administrator-invited Cognito account.

## 🚀 Quick Start

```bash
# 1. Install prerequisites
brew install awscli terraform

# 2. Configure AWS
aws configure

# 3. Deploy everything
./scripts/deploy.sh

# 4. Open the CloudFront URL printed by Terraform and sign in
```

**Deployment time**: ~15 minutes  
**Security**: HTTPS through CloudFront, private S3 origin, invite-only Cognito sign-in, and JWT-protected API (MFA disabled)

📖 **New to this project?** Start with [GET_STARTED.md](GET_STARTED.md)

## ✨ Features

### Core Functionality
- ✅ **Track Expenses & Income** - Daily transaction tracking with descriptions
- ✅ **Category Management** - Add/edit/delete categories with custom icons & colors
- ✅ **Business Ledgers** - Create businesses with separate income/expense categories and transaction history; business activity stays out of personal totals
- ✅ **Monthly Limits** - Set and track spending limits per category
- ✅ **Visual Dashboard** - See income, expenses, balance, and category breakdowns
- ✅ **Carryover Balance** - Automatic month-to-month balance tracking
- ✅ **Transaction History** - View, filter, edit, and delete any transaction
- ✅ **Monthly Summaries** - Automatic calculation of monthly totals
- ✅ **Household Todo List** - Shared daily lists, weekly repeat tasks, optional checkpoints, calendar history/planning, and month-to-date rewards
- Todo rewards are calculated on the Todo page only: regular tasks qualify at 4 tasks/day and repeat tasks at 5 scheduled tasks/day; each reward is ₹100 × completed ÷ total tasks. They never change expense or income transactions.

### Your Pre-configured Categories

**Expense Categories** (with limits - unused budget carries forward):
- ⛽ Fuel & Vehicle Expense (₹3,000)
- 🛒 Shopping & Entertainment (₹10,000)
- 🏠 Home Expense (₹7,000)
- 🍔 Food Outside (₹5,000)
- 💰 To Mini (₹25,000)
- 🌾 Farm - Expense (₹30,000)
- 🏦 Loan (₹45,777)

**Expense Categories** (no limits - no carryover):
- 🚗 Salary - Driver
- 📦 Others

**Income Categories** (no carryover):
- 💵 Earned - Nidagundi
- 📈 Earned - Stocks
- 🌾 Farm - Income

## 🏗️ Architecture

```
Browser → CloudFront HTTPS → Private S3 (frontend)
                         → API Gateway → Lambda → DynamoDB
```

**Technology Stack**:
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python 3.11 on AWS Lambda
- **Database**: DynamoDB (NoSQL, single-table design)
- **Infrastructure**: Terraform (Infrastructure as Code)
- **Hosting**: CloudFront with a private S3 origin
- **Authentication**: Cognito sign-in and API JWT authorization (MFA disabled)

**Why This Stack?**
- ✅ Serverless = No servers to manage
- ✅ Pay-per-use = Only pay for what you use
- ✅ Auto-scaling = Handles any load
- ✅ Cost-optimized = Stays within AWS free tier

## 📂 Project Structure

```
Expense-App/
├── 📘 Documentation (8 comprehensive guides)
├── 🌐 Frontend (HTML/CSS/JS - responsive UI)
├── ⚙️ Backend (Python Lambda function)
├── 🏗️ Infrastructure (Terraform IaC)
└── 🛠️ Scripts (deployment & utilities)
```

See [PROJECT_STRUCTURE.txt](PROJECT_STRUCTURE.txt) for detailed breakdown.

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [GET_STARTED.md](GET_STARTED.md) | **Start here** - Complete getting started guide |
| [QUICKSTART.md](QUICKSTART.md) | 15-minute quick deployment |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Detailed deployment instructions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture & design decisions |
| [FEATURES.md](FEATURES.md) | Complete feature documentation |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | High-level overview |

## 💰 Cost Breakdown

AWS costs depend on usage, region, account age, and current free-tier eligibility.
For a two-person household usage should be small, but CloudFront and other services
are not guaranteed to be free. Check the AWS Billing console regularly.

## 🎯 Common Operations

### Use the dashboard
- Add an expense from a category or subcategory.
- Review monthly totals, category budgets, daily spending, and transaction history.
- Manage categories and budgets from the dashboard.
- Create a business from **Categories → + Add Category → Business**. Add that business’s income/expense categories, then open its row to record and review business transactions separately from personal totals.
- The Dashboard also shows a separate expandable Businesses section with the selected month’s business income and expense totals.

### Update After Code Changes
```bash
# Frontend changes
./scripts/update-frontend.sh your-bucket-name

# Backend changes
./scripts/update-lambda.sh
```

## Security

The deployed app uses HTTPS through CloudFront, a private S3 origin, invite-only
Cognito accounts, and JWT-protected API requests. MFA is disabled for easier household use.
Never share your temporary password. AWS account administrators can still access
the AWS resources and stored data.

## 🛠️ Customization

Everything is customizable:
- ✅ Add/remove/edit categories
- ✅ Change monthly limits
- ✅ Modify colors and icons
- ✅ Customize UI (edit CSS)
- ✅ Extend functionality (edit Python/JS)

## 📈 What's Next?

After signing in, initialize categories if prompted, then add transactions from the dashboard.

## 🐛 Troubleshooting

**Can't access website?** Use the HTTPS CloudFront URL, not the S3 website endpoint.

**Can't sign in?** Check the invite email (including spam). On first sign-in, change the temporary password.

**API requests return 401?** Sign in again; API requests require an active Cognito session.

**More help?** See troubleshooting section in [DEPLOYMENT.md](DEPLOYMENT.md).

## 📦 What's Included

✅ Complete frontend application (HTML/CSS/JS)  
✅ Full backend API (Python Lambda)  
✅ Database schema (DynamoDB)  
✅ Infrastructure as Code (Terraform)  
✅ One-command deployment script  
✅ Update & maintenance scripts  
✅ Comprehensive documentation  
✅ Your custom categories pre-configured  

## 🎓 Learning Resources

This project demonstrates:
- Serverless architecture on AWS
- Infrastructure as Code with Terraform
- RESTful API design
- Single-table DynamoDB design
- Modern frontend development
- Cost optimization strategies

## 🤝 Contributing

This is a personal project, but feel free to:
- Fork and customize for your needs
- Report issues or suggestions
- Share improvements

## 📄 License

Free to use for personal expense tracking.

---

**Ready to deploy?** Start with [GET_STARTED.md](GET_STARTED.md)

**Questions?** Check the documentation files in this directory.

**Happy expense tracking! 💰📊✨**
