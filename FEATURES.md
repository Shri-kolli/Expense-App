# Features Documentation

## Core Features

### 1. Dashboard 📊

**Monthly Overview**
- ✅ Total Income display
- ✅ Total Expense display
- ✅ Current Balance (Income - Expense + Carryover)
- ✅ Previous Month Carryover

**Category Analysis**
- ✅ Category-wise spending bars
- ✅ Progress against monthly limits
- ✅ Color-coded spending (normal vs over-limit)
- ✅ Percentage utilization

**Recent Activity**
- ✅ Last 5 transactions display
- ✅ Quick view of recent spending

### 2. Add Transaction 💰

**Quick Entry Form**
- ✅ Type selector (Income/Expense)
- ✅ Category dropdown (filtered by type)
- ✅ Amount field
- ✅ Date picker (defaults to today)
- ✅ Description/Comment field for notes
- ✅ One-click submission

**Smart Features**
- ✅ Auto-populates date with current day
- ✅ Categories update based on transaction type
- ✅ Form resets after successful submission
- ✅ Instant dashboard refresh

### 3. Transaction History 📋

**View & Filter**
- ✅ All transactions list (newest first)
- ✅ Filter by month
- ✅ Clear filters option
- ✅ Transaction cards with full details

**Transaction Details**
- ✅ Amount with +/- indicator
- ✅ Category badge
- ✅ Description/comments
- ✅ Date display
- ✅ Color coding (green=income, red=expense)

**Actions**
- ✅ Edit any transaction
- ✅ Delete with confirmation
- ✅ Auto-refresh after changes

### 4. Category Management 🏷️

**View Categories**
- ✅ Separate lists for Expense & Income categories
- ✅ Icon + Name display
- ✅ Monthly limit display (for expenses)
- ✅ Color-coded borders

**Add Category**
- ✅ Custom name
- ✅ Type selection (Income/Expense)
- ✅ Monthly limit setting
- ✅ Icon picker (emoji)
- ✅ Color picker
- ✅ Modal interface

**Edit Category**
- ✅ Update all fields
- ✅ Same interface as add
- ✅ Pre-populated values

**Delete Category**
- ✅ Confirmation dialog
- ✅ Immediate removal

### 5. Household Todo List ✅

- ✅ Shared Hubby and Wifey lists, with up to 6 tasks per person per day
- ✅ Choose today, a past date, or a future date; the calendar opens tasks for the selected day
- ✅ Mark tasks open, half done, or completed with clear visual status colors
- ✅ Marking a task half done offers an editable continuation task on a chosen date; it is never carried forward automatically
- ✅ Optional, initially hidden checkpoints with up to 5 per task
- ✅ Previous-month reward summary: ₹100 × completed tasks ÷ that person's total tasks, when that person had at least 4 tasks that day
- ✅ Reward is displayed only and is not added to expense or income transactions

### 6. Monthly Summary & Carryover 📅

**Automatic Calculations**
- ✅ Monthly income total
- ✅ Monthly expense total
- ✅ Category-wise expense breakdown
- ✅ Previous month carryover
- ✅ Balance to carry forward to next month

**Persistence**
- ✅ Summary saved to database
- ✅ Historical summaries preserved
- ✅ Auto-updates on transaction changes

### 7. Data Management 💾

**CRUD Operations**
- ✅ Create transactions
- ✅ Read/View transactions
- ✅ Update transactions
- ✅ Delete transactions

**Category Operations**
- ✅ Create categories
- ✅ Read/View categories
- ✅ Update categories
- ✅ Delete categories

**Data Validation**
- ✅ Required field validation
- ✅ Numeric amount validation
- ✅ Date format validation

## Technical Features

### Frontend
- ✅ Responsive design (mobile & desktop)
- ✅ Tab-based navigation
- ✅ Modal dialogs
- ✅ Real-time updates
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling

### Backend
- ✅ RESTful API design
- ✅ Lambda serverless functions
- ✅ DynamoDB single-table design
- ✅ CORS enabled
- ✅ Error handling
- ✅ Request validation

### Infrastructure
- ✅ Infrastructure as Code (Terraform)
- ✅ Automated deployment
- ✅ S3 static hosting
- ✅ API Gateway HTTP API
- ✅ DynamoDB on-demand pricing
- ✅ Cost-optimized architecture

## Default Categories (Based on Your Data)

### Expense Categories
1. ⛽ **Fuel & Vehicle Expense** - Limit: ₹3,000/month
2. 🛒 **Shopping & Entertainment** - Limit: ₹10,000/month
3. 🏠 **Home Expense** - Limit: ₹7,000/month
4. 🍔 **Food Outside** - Limit: ₹5,000/month
5. 💰 **To Mini** - Limit: ₹25,000/month
6. 🌾 **Farm Expense** - Limit: ₹30,000/month
7. 📦 **Others** - No limit
8. 🏦 **Loan** - Limit: ₹45,777/month

### Income Categories
1. 💼 **Salary - Ishwar**
2. 💵 **Earned - Nidagundi**
3. 📈 **Earned - Stocks**

## Roadmap / Future Enhancements

### Potential Features (Not Yet Implemented)
- ⏳ Export to CSV/Excel
- ⏳ Import from CSV
- ⏳ Charts and graphs (spending trends)
- ⏳ Budget alerts (email/SMS when over limit)
- ⏳ Multi-user data separation
- ⏳ Recurring transactions
- ⏳ Custom date range filtering
- ⏳ Search functionality
- ⏳ Tags for transactions
- ⏳ Attachments (receipts)
- ⏳ Multi-currency support
- ⏳ Dark mode toggle
- ⏳ Mobile app (React Native)
- ⏳ Offline support (PWA)

## Limitations

**Current Limitations**
- Expense data uses a shared household account; separate per-user data is not implemented
- No data export yet
- No advanced filtering
- No recurring transactions
- Basic reporting only

**Security**
- The deployed site uses CloudFront HTTPS, private S3 access, Cognito sign-in, and a JWT-protected API. MFA is disabled for easier household use.

## Performance

**Expected Performance**
- Dashboard load: < 1 second
- Add transaction: < 500ms
- List transactions: < 1 second
- Category operations: < 500ms

**Scalability**
- Supports thousands of transactions
- DynamoDB auto-scales
- Lambda auto-scales
- Minimal cost increase with usage

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers
- ❌ IE11 (not supported)
