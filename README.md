# 💰 Personal Expense Tracker

A **complete, production-ready** serverless expense tracking application built on AWS with **minimal cost** (~$0.50-$2/month).

Built specifically for personal expense management with features matching your spreadsheet workflow, including income tracking, category limits, monthly carryover, and detailed transaction history.

## 🚀 Quick Start

```bash
# 1. Install prerequisites
brew install awscli terraform

# 2. Configure AWS
aws configure

# 3. Deploy everything
./scripts/deploy.sh

# 4. Open your website and start tracking!
```

**Deployment time**: ~15 minutes  
**Monthly cost**: ~$0.50-$2 (mostly free tier)

📖 **New to this project?** Start with [GET_STARTED.md](GET_STARTED.md)

## ✨ Features

### Core Functionality
- ✅ **Track Expenses & Income** - Daily transaction tracking with descriptions
- ✅ **Category Management** - Add/edit/delete categories with custom icons & colors
- ✅ **Monthly Limits** - Set and track spending limits per category
- ✅ **Visual Dashboard** - See income, expenses, balance, and category breakdowns
- ✅ **Carryover Balance** - Automatic month-to-month balance tracking
- ✅ **Transaction History** - View, filter, edit, and delete any transaction
- ✅ **Monthly Summaries** - Automatic calculation of monthly totals

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
User Browser → S3 (Frontend) → API Gateway → Lambda → DynamoDB
```

**Technology Stack**:
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python 3.11 on AWS Lambda
- **Database**: DynamoDB (NoSQL, single-table design)
- **Infrastructure**: Terraform (Infrastructure as Code)
- **Hosting**: S3 Static Website + API Gateway

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

| Service | Monthly Cost | Details |
|---------|-------------|---------|
| S3 | ~$0.50 | Static website hosting |
| API Gateway | $0.00 | Within 1M free requests |
| Lambda | $0.00 | Within 1M free requests |
| DynamoDB | $0.00 | Within 25GB free tier |
| **Total** | **~$0.50-$2** | Cheaper than any subscription! |

**Annual cost**: ~$6-24 (less than one month of most SaaS tools)

## 🎯 Common Operations

### Add a Transaction
1. Open your website
2. Click "Add Transaction" tab
3. Select Expense/Income
4. Choose category, enter amount & description
5. Click "Add Transaction"

### View Dashboard
- See monthly income vs expenses
- Category-wise spending with progress bars
- Current balance and carryover
- Recent transactions

### Manage Categories
1. Click "Categories" tab
2. Add new category with custom icon/color/limit
3. Edit existing categories
4. Delete unused categories

### Update After Code Changes
```bash
# Frontend changes
./scripts/update-frontend.sh your-bucket-name

# Backend changes
./scripts/update-lambda.sh
```

## 🔐 Security Note

⚠️ **Current setup**: Minimal security, suitable for personal use only.
- No authentication required
- Anyone with the URL can access
- Not recommended for sensitive financial data

💡 To add authentication, see the security section in [DEPLOYMENT.md](DEPLOYMENT.md).

## 🛠️ Customization

Everything is customizable:
- ✅ Add/remove/edit categories
- ✅ Change monthly limits
- ✅ Modify colors and icons
- ✅ Customize UI (edit CSS)
- ✅ Extend functionality (edit Python/JS)

## 📈 What's Next?

After deployment:
1. Initialize default categories
2. Add your first transaction
3. Check the dashboard
4. Customize categories to your needs
5. Start tracking daily!

## 🐛 Troubleshooting

**Can't access website?** Wait 2-3 minutes after deployment.

**"API not configured" error?** Check `frontend/js/config.js` has the correct API endpoint.

**Data not loading?** Initialize default data by clicking "Yes" when prompted.

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
