# Quick Reference Card

## 📊 Your Categories at a Glance

### 💰 Expenses WITH Limits (Carryover ✅)
```
⛽ Fuel & Vehicle         →  ₹3,000/month
🛒 Shopping              →  ₹10,000/month
🏠 Home Expense          →  ₹7,000/month
🍔 Food Outside          →  ₹5,000/month
💰 To Mini               →  ₹25,000/month
🌾 Farm - Expense        →  ₹30,000/month
🏦 Loan                  →  ₹45,777/month
                         ──────────────
Total Budget:               ₹95,777/month
```

### 📦 Expenses WITHOUT Limits (No Carryover)
```
🚗 Salary - Driver       →  Track only
📦 Others                →  Track only
```

### 📈 Income (No Carryover)
```
💵 Earned - Nidagundi    →  Primary income
📈 Earned - Stocks       →  Investments
🌾 Farm - Income         →  Farm revenue
```

## 🔄 Carryover Cheat Sheet

| Category Type | Has Limit? | Carryover? | Example |
|---------------|------------|------------|---------|
| Expense with limit | ✅ Yes | ✅ Yes (+ or -) | Food: ₹5k limit, spent ₹3k → **+₹2k** carries (saved!) |
| Expense over limit | ✅ Yes | ✅ Yes (negative) | Home: ₹7k limit, spent ₹10k → **-₹3k** carries (debt!) |
| Expense without limit | ❌ No | ❌ No | Driver salary: just track total |
| Income | N/A | ❌ No | Income earned doesn't carry |

### Carryover Rules
- **Positive carryover** (+): You saved money → Adds to next month's budget ✅
- **Negative carryover** (-): You overspent → Reduces next month's budget ⚠️
- **No limit set**: No carryover tracking at all

## 📱 Common Actions

### Add Expense with Limit
```
1. Add Transaction tab
2. Select "Expense"
3. Choose: Fuel, Shopping, Home, Food, To Mini, Farm-Expense, or Loan
4. Enter amount & description
5. Submit → Counts against limit
```

### Add Expense without Limit
```
1. Add Transaction tab
2. Select "Expense"
3. Choose: Salary - Driver or Others
4. Enter amount & description
5. Submit → Just tracked, no limit
```

### Track Farm Operations
```
Farm Expense:
  Type: Expense
  Category: Farm - Expense
  Use for: Labor, fertilizer, equipment, seeds
  Limit: ₹30,000/month (carryover enabled)

Farm Income:
  Type: Income
  Category: Farm - Income
  Use for: Crop sales, produce sales
  No limit (income doesn't have limits)
```

### Pay Driver Salary
```
1. Add Transaction tab
2. Select "Expense"
3. Category: Salary - Driver
4. Amount: (whatever you pay)
5. Description: "Monthly salary" or "Week 1 payment"
```

## 📊 Dashboard Guide

### Progress Bars
- **Green bar < 80%**: On track
- **Yellow bar 80-100%**: Approaching limit
- **Red bar > 100%**: Over budget (including carryover)

### What Each Section Shows
```
┌─────────────────────────────────────┐
│ Total Income      │ All income      │
│ Total Expense     │ All expenses    │
│ Current Balance   │ Net position    │
│ Prev Carryover    │ From last month │
└─────────────────────────────────────┘

Category Progress Bars:
Shows: Spent / (Limit + Carryover)
Example: ₹4,200 / ₹6,500 (includes ₹1,500 carryover)
```

## 💡 Pro Tips

### Budget Planning
```
✅ Set realistic limits based on past spending
✅ Review limits monthly, adjust as needed
✅ Use carryover for large planned purchases
✅ Categories without limits = flexible expenses
```

### Carryover Strategy
```
✅ Underspend intentionally to build buffer (+carryover)
✅ Seasonal expenses: save carryover for peak months
✅ Farm: carryover helps during planting/harvest seasons
✅ Avoid overspending - it reduces next month's budget!
⚠️ If you overspend, next month pays the debt (-carryover)
✅ Check dashboard weekly to stay on track
```

### Daily Tracking
```
✅ Add transactions immediately (don't wait)
✅ Use descriptions - future you will thank you
✅ Check which categories are close to limit
✅ Review dashboard at end of each week
```

## 🔢 Example Month

### November 2026 Example
```
INCOME:
💵 Nidagundi:      ₹13,000
📈 Stocks:         ₹0
🌾 Farm:           ₹82,000
                   ─────────
Total Income:      ₹95,000

EXPENSES (WITH LIMITS):
⛽ Fuel:           ₹2,500 / ₹3,000   ✅ Under
🛒 Shopping:       ₹2,500 / ₹10,000  ✅ Under
🏠 Home:           ₹31,090 / ₹7,000  ❌ OVER by ₹24,090
🍔 Food:           ₹260 / ₹5,000     ✅ Under
💰 To Mini:        ₹5,275 / ₹25,000  ✅ Under
🌾 Farm:           ₹4,900 / ₹30,000  ✅ Under
🏦 Loan:           ₹45,777 / ₹45,777 ✅ At limit

EXPENSES (NO LIMITS):
🚗 Driver:         ₹42,684 (tracked)
📦 Others:         ₹0

Total Expense:     ₹96,494

BALANCE:
Income - Expense = -₹1,494 (spent more than earned)
Plus carryover from October: -₹17,000
Net: -₹18,494 (to be carried to December)
```

## 📖 Documentation Quick Links

| Need to... | Read... |
|------------|---------|
| Deploy the app | [GET_STARTED.md](GET_STARTED.md) |
| Understand categories | [CATEGORY_RULES.md](CATEGORY_RULES.md) |
| See what changed | [UPDATES.md](UPDATES.md) |
| Learn the system | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Check all features | [FEATURES.md](FEATURES.md) |

## 🚀 Deploy Commands

```bash
# First time setup
brew install awscli terraform
aws configure
./scripts/deploy.sh

# Update after changes
./scripts/update-frontend.sh your-bucket-name  # UI changes
./scripts/update-lambda.sh                     # Backend changes

# Verify everything
./scripts/verify-project.sh
```

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| Can't access website | Wait 2-3 min after deploy |
| "API not configured" | Check frontend/js/config.js |
| Data not loading | Initialize default data (click Yes) |
| Over budget | Check carryover + limit in progress bar |

---

**Print this page for quick reference while using the app!** 📄
