# Recent Updates & Changes

## Updated Configuration (Latest)

### Key Changes

#### 1. Salary - Driver is now an EXPENSE ✅
Previously categorized incorrectly, driver salary is now properly tracked as an expense.

#### 2. Farm Split into Two Categories ✅
Farm operations now have separate income and expense tracking:
- **Farm - Expense**: Track all farm costs (limit: ₹30,000)
- **Farm - Income**: Track all farm revenue

#### 3. Removed "Salary - Ishwar" from Income ✅
This income source has been removed from the default categories.

#### 4. Smart Carryover Logic ✅
New carryover system:
- **Categories WITH limits**: Unused budget carries forward to next month
- **Categories WITHOUT limits**: No carryover tracking
- **Income categories**: Never carry forward

## Updated Default Categories

### 💰 Expense Categories (WITH Monthly Limits)
**Unused budget automatically carries forward to next month**

| Category | Icon | Limit/Month | Carryover |
|----------|------|-------------|-----------|
| Fuel & Vehicle Expense | ⛽ | ₹3,000 | ✅ |
| Shopping & Entertainment | 🛒 | ₹10,000 | ✅ |
| Home Expense | 🏠 | ₹7,000 | ✅ |
| Food Outside | 🍔 | ₹5,000 | ✅ |
| To Mini | 💰 | ₹25,000 | ✅ |
| Farm - Expense | 🌾 | ₹30,000 | ✅ |
| Loan | 🏦 | ₹45,777 | ✅ |

**Total Monthly Budget**: ₹95,777

### 📦 Expense Categories (NO Limits)
**No carryover - just track total spent**

| Category | Icon | Purpose |
|----------|------|---------|
| Salary - Driver | 🚗 | Driver salary payment |
| Others | 📦 | Miscellaneous expenses |

### 📈 Income Categories
**Income is tracked but never carries forward**

| Category | Icon | Purpose |
|----------|------|---------|
| Earned - Nidagundi | 💵 | Primary income source |
| Earned - Stocks | 📈 | Investment income |
| Farm - Income | 🌾 | Farm revenue |

## How Carryover Works Now

### Example 1: Underspending (Positive Carryover) ✅

**Food Outside** - Limit: ₹5,000/month

```
Month 1 (November):
  Budget: ₹5,000
  Spent: ₹3,500
  Unused: +₹1,500 → Carries to December (SAVED!)

Month 2 (December):
  Budget: ₹5,000
  Carryover: +₹1,500
  Available: ₹6,500
  Spent: ₹4,000
  Unused: +₹2,500 → Carries to January (SAVED MORE!)
```

### Example 1b: Overspending (Negative Carryover) ⚠️

**Home Expense** - Limit: ₹7,000/month

```
Month 1 (November):
  Budget: ₹7,000
  Spent: ₹10,000
  Overspent: -₹3,000 → Carries to December (DEBT!)

Month 2 (December):
  Budget: ₹7,000
  Carryover: -₹3,000 (reduces available budget)
  Available: ₹4,000 (reduced!)
  Spent: ₹3,500
  Unused: +₹500 → Carries to January (recovering)

Month 3 (January):
  Budget: ₹7,000
  Carryover: +₹500
  Available: ₹7,500 (back on track!)
```

### Example 2: Category WITHOUT Limit (No Carryover)

**Salary - Driver** - No Limit

```
Month 1 (November):
  No limit set
  Spent: ₹15,000
  Carryover: None

Month 2 (December):
  No limit set
  Spent: ₹15,000
  Carryover: None
```

### Example 3: Farm Categories

**Farm - Expense** - Limit: ₹30,000/month (WITH carryover)
```
Month 1:
  Budget: ₹30,000
  Spent: ₹25,000 (fertilizer, labor)
  Unused: ₹5,000 → Carries forward

Month 2:
  Budget: ₹30,000
  Carryover: +₹5,000
  Available: ₹35,000
```

**Farm - Income** (NO carryover)
```
Month 1:
  Income: ₹82,000 (crop sales)
  Carryover: None (income doesn't carry)

Month 2:
  Income: ₹0 (no sales this month)
```

## Dashboard Changes

### Progress Bars
- **Categories with limits**: Show progress bar with percentage
- **Categories without limits**: Show total spent only, no bar
- **Over-budget**: Red bar when spent exceeds limit + carryover

### Monthly Summary
Now shows:
- **Total Income**: All income transactions
- **Total Expense**: All expense transactions
- **Category Carryover**: Per-category unused budget
- **Total Carryover to Next Month**: Sum of all category carryovers
- **Current Balance**: Net position

## Migration Notes

If you already deployed the old version:

### Option 1: Fresh Start (Recommended)
1. Run `./scripts/deploy.sh` again
2. Initialize with new default categories
3. Re-add your transactions

### Option 2: Manual Update
1. Update Lambda: `./scripts/update-lambda.sh`
2. Update Frontend: `./scripts/update-frontend.sh your-bucket-name`
3. Go to Categories page
4. Delete old categories:
   - "Farm Expense" (single category)
   - "Salary - Ishwar" (income)
5. Add new categories:
   - "Farm - Expense" (expense with ₹30,000 limit)
   - "Farm - Income" (income)
   - "Salary - Driver" (expense with no limit)

## Files Updated

✅ **Backend**:
- `backend/functions/main.py` - Updated category defaults & carryover logic

✅ **Documentation**:
- `README.md` - Updated category list
- `GET_STARTED.md` - Updated category tables
- `CATEGORY_RULES.md` - New detailed carryover rules
- `PROJECT_STRUCTURE.txt` - Updated category list

✅ **New Files**:
- `CATEGORY_RULES.md` - Complete guide to categories & carryover
- `UPDATES.md` - This file

## Summary

Your expense tracker now has:
- ✅ Correct categorization (driver salary as expense)
- ✅ Separate farm income/expense tracking
- ✅ Smart carryover (only for categories with limits)
- ✅ Simplified income categories
- ✅ More flexible expense tracking

Ready to deploy with `./scripts/deploy.sh`! 🚀
