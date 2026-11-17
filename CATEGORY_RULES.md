# Category & Carryover Rules

## Category Types

### Standard Categories
Most categories are either **Income** or **Expense** type.

### Expense Subcategories
- Expense categories may optionally have subcategories; existing categories and their limits remain unchanged.
- Income categories cannot have subcategories.
- Every expense subcategory must have a positive monthly or yearly budget.
- A yearly budget is divided by 12 to determine the monthly allowance.
- Unused allowance and overspending carry forward month-to-month continuously, including across year boundaries.
- A parent category's dashboard total includes its direct spending and all subcategory spending; its displayed limit and carry-forward include the parent amount (if set) plus all subcategory amounts.
- Dashboard category and subcategory rows can be clicked to start a pre-filled expense.

### Special Cases

#### 1. Salary - Driver
- **Type**: Expense (not Income!)
- **Purpose**: Track driver salary as an expense
- **Monthly Limit**: Optional (set as needed)
- **Icon**: 🚗

#### 2. Farm Categories
Farm operations require both income and expense tracking:

**Farm - Expense**
- **Type**: Expense
- **Monthly Limit**: ₹30,000 (adjustable)
- **Purpose**: Track all farm-related expenses (labor, fertilizer, equipment, etc.)
- **Carryover**: YES (unused budget carries forward)

**Farm - Income**
- **Type**: Income
- **Monthly Limit**: Not applicable
- **Purpose**: Track farm revenue (crop sales, produce sales, etc.)
- **Carryover**: NO (income doesn't carry forward)

## Carryover Logic

### Categories WITH Monthly Limits
If a category has a monthly limit set, **both unused budget AND overspending carry forward** to next month.

**Example 1: Underspending (Positive Carryover)**
```
Month 1:
  Limit: ₹5,000
  Spent: ₹3,500
  Carryover to Month 2: +₹1,500 (saved)

Month 2:
  Limit: ₹5,000
  Previous Carryover: +₹1,500
  Available: ₹6,500
  Spent: ₹4,000
  Carryover to Month 3: +₹2,500 (saved)
```

**Example 2: Overspending (Negative Carryover)**
```
Month 1:
  Limit: ₹5,000
  Spent: ₹7,000
  Carryover to Month 2: -₹2,000 (overspent)

Month 2:
  Limit: ₹5,000
  Previous Carryover: -₹2,000
  Available: ₹3,000 (reduced!)
  Spent: ₹2,800
  Carryover to Month 3: +₹200 (back in budget)
```

**Example 3: Mixed Months**
```
Month 1: Limit ₹5k, Spent ₹6k → -₹1k carryover (overspent)
Month 2: Limit ₹5k, Carryover -₹1k, Available ₹4k, Spent ₹3k → +₹1k carryover
Month 3: Limit ₹5k, Carryover +₹1k, Available ₹6k
```

### Categories WITHOUT Monthly Limits
If a category has **NO limit** (or limit = 0), there is **NO carryover**.

**Examples of No-Limit Categories:**
- Others (general expenses)
- Salary - Driver (unless you set a limit)
- All Income categories (income doesn't carry forward)

### Category-Level Carryover
Each category with a limit tracks its own carryover independently:
- **Fuel & Vehicle**: Unused fuel budget carries forward
- **Food Outside**: Unused food budget carries forward
- **Farm - Expense**: Unused farm budget carries forward
- **Loan**: Unused loan budget carries forward (if applicable)

## Default Categories

### Expense Categories (with limits)

| Category | Icon | Monthly Limit | Carryover |
|----------|------|---------------|-----------|
| Fuel & Vehicle Expense | ⛽ | ₹3,000 | ✅ Yes |
| Shopping & Entertainment | 🛒 | ₹10,000 | ✅ Yes |
| Home Expense | 🏠 | ₹7,000 | ✅ Yes |
| Food Outside | 🍔 | ₹5,000 | ✅ Yes |
| To Mini | 💰 | ₹25,000 | ✅ Yes |
| Farm - Expense | 🌾 | ₹30,000 | ✅ Yes |
| Loan | 🏦 | ₹45,777 | ✅ Yes |

### Expense Categories (NO limits - NO carryover)

| Category | Icon | Monthly Limit | Carryover |
|----------|------|---------------|-----------|
| Salary - Driver | 🚗 | ₹0 (optional) | ❌ No |
| Others | 📦 | ₹0 | ❌ No |

### Income Categories (NO carryover)

| Category | Icon | Monthly Limit | Carryover |
|----------|------|---------------|-----------|
| Earned - Nidagundi | 💵 | N/A | ❌ No |
| Earned - Stocks | 📈 | N/A | ❌ No |
| Farm - Income | 🌾 | N/A | ❌ No |

## How to Set Category Limits

### When Adding/Editing a Category

1. Go to **Categories** tab
2. Click **Add Category** or **Edit** existing
3. Set **Monthly Limit**:
   - **> 0**: Category has a limit, unused budget carries forward
   - **= 0**: No limit, no carryover

### Examples

**Add "Salary - Driver" as Expense:**
```
Name: Salary - Driver
Type: Expense
Monthly Limit: 0 (or set expected amount like ₹15,000)
Icon: 🚗
Color: #795548 (brown)
```

**Add "Farm - Expense":**
```
Name: Farm - Expense
Type: Expense
Monthly Limit: 30000
Icon: 🌾
Color: #8BC34A (green)
```

**Add "Farm - Income":**
```
Name: Farm - Income
Type: Income
Monthly Limit: 0 (N/A for income)
Icon: 🌾
Color: #4CAF50 (green)
```

## Dashboard Display

### Categories with Limits
Progress bars show:
- Current month limit + previous carryover (can be positive or negative!)
- Amount spent this month
- Remaining available (including carryover)
- Percentage used

**Example Display (Positive Carryover - Saved Money):**
```
🌾 Farm - Expense
₹25,000 / ₹32,000 (includes +₹2,000 carryover)
[████████░░] 78%
```

**Example Display (Negative Carryover - Previously Overspent):**
```
🏠 Home Expense
₹8,000 / ₹5,000 (budget reduced by -₹2,000 from last month overspending)
Available this month: ₹5,000 - ₹2,000 = ₹3,000
[████████████████] 267% ⚠️ WAY OVER!
```

**Example Display (Recovering from Overspending):**
```
🍔 Food Outside
₹2,500 / ₹3,000 (last month -₹2k overspent, this month available ₹3k)
[███████░░░] 83% - Getting back on track!
```

### Categories without Limits
No progress bar shown, just total spent:
```
🚗 Salary - Driver
₹15,000 (no limit set, no carryover tracking)
```

## Monthly Summary

The monthly summary shows:
- **Total Income**: All income transactions
- **Total Expense**: All expense transactions
- **Category Spending**: Breakdown by category
- **Carryover from Previous**: Sum of all category carryovers from last month
- **Carryover to Next**: Sum of all unused budgets (categories with limits only)
- **Current Balance**: Income - Expense + Carryover

## Best Practices

### When to Set Limits
✅ **Set limits for:**
- Controllable expenses (food, fuel, shopping)
- Budget categories you want to track against
- Categories where you want to save unused budget

❌ **Don't set limits for:**
- Fixed costs that can't be reduced (loan payments)
- One-time or irregular expenses (others)
- Income categories
- Salary payments (like driver salary)

### Adjusting Limits Monthly
Review your limits monthly and adjust based on:
- Actual spending patterns
- Seasonal changes (farm expenses vary by season)
- Special needs for upcoming month

### Carryover Strategy
- **Save for large purchases**: Let unused budget accumulate
- **Emergency buffer**: Carryover provides spending flexibility
- **Seasonal planning**: Farm carryover helps during lean months

## FAQs

**Q: Why is "Salary - Driver" an expense?**  
A: Driver salary is money you pay out, making it an expense, not income.

**Q: How do I track both farm income and expenses?**  
A: Use two categories: "Farm - Income" and "Farm - Expense". This separates revenue from costs.

**Q: What happens to carryover if I delete a category?**  
A: Carryover is lost. Consider spending down or transferring to another category first.

**Q: Can I change a category's limit mid-month?**  
A: Yes! Changes apply immediately. Carryover calculation adjusts for next month.

**Q: What if I spend more than my limit + carryover?**  
A: You can still track it. The system shows over-limit spending in red. Negative carryover means you overspent, which reduces next month's available budget.

**Q: Do income categories ever carry forward?**  
A: No. Income is for tracking earnings only, not budgeting, so there's no carryover concept.

## Summary

✅ **Categories WITH limits**: Unused budget carries forward  
❌ **Categories WITHOUT limits**: No carryover  
🌾 **Farm**: Use separate Income/Expense categories  
🚗 **Driver Salary**: Expense category (not income)  
💰 **Flexible**: You can add/remove limits anytime  
