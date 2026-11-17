# System Architecture

## Overview

This is a **serverless, cost-optimized** personal expense tracking application built entirely on AWS services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          USER                                │
│                       (Web Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Amazon S3                                 │
│              (Static Website Hosting)                        │
│   ┌─────────────────────────────────────────────┐          │
│   │  index.html │ style.css │ app.js │ config.js│          │
│   └─────────────────────────────────────────────┘          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ REST API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Amazon API Gateway (HTTP API)                   │
│                    CORS Enabled                              │
│                                                              │
│  Routes:                                                     │
│    GET/POST/PUT/DELETE  /categories                         │
│    GET/POST/PUT/DELETE  /transactions                       │
│    GET                  /summary                             │
│    POST                 /initialize                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Invoke
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda                                │
│              (Python 3.11 Runtime)                           │
│                                                              │
│  Function: expense_tracker_api                               │
│  Handler: main.lambda_handler                                │
│  Timeout: 30s                                                │
│  Memory: 128MB                                               │
│                                                              │
│  Environment Variables:                                      │
│    - TABLE_NAME                                              │
│    - USER_ID                                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Query/Put/Update/Delete
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Amazon DynamoDB                            │
│                (On-Demand Billing)                           │
│                                                              │
│  Table: ExpenseTrackerData                                   │
│  Keys: PK (Hash), SK (Range)                                 │
│                                                              │
│  GSI: GSI1 (for month-based queries)                         │
│  Keys: GSI1PK (Hash), GSI1SK (Range)                         │
│                                                              │
│  Item Types:                                                 │
│    - USER#<id>#PROFILE                                       │
│    - USER#<id>#CATEGORY#<catId>                             │
│    - USER#<id>#TRANSACTION#<timestamp>#<txnId>              │
│    - USER#<id>#SUMMARY#<month>                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Add Transaction Flow

```
User Input → Frontend Form → API Gateway → Lambda
                                            ↓
                                     Validate Data
                                            ↓
                                    DynamoDB PutItem
                                            ↓
                                  Update Monthly Summary
                                            ↓
                                    Return Success
                                            ↓
Frontend Updates Dashboard
```

### 2. View Dashboard Flow

```
Page Load → Frontend → API Gateway → Lambda
                                       ↓
                              Query Transactions
                                       ↓
                              Query Categories
                                       ↓
                          Calculate/Get Summary
                                       ↓
                               Return Data
                                       ↓
           Frontend Renders Charts & Stats
```

## DynamoDB Table Design

### Single Table Design

**Primary Key Structure:**
- `PK` (Partition Key): `USER#<userId>`
- `SK` (Sort Key): `<ENTITY_TYPE>#<ID>` or `<ENTITY_TYPE>#<TIMESTAMP>#<ID>`

**Global Secondary Index (GSI1):**
- `GSI1PK`: `USER#<userId>#MONTH#<YYYY-MM>`
- `GSI1SK`: `TRANSACTION#<timestamp>`

### Item Types

#### 1. User Profile
```json
{
  "PK": "USER#user001",
  "SK": "PROFILE",
  "carryoverBalance": -17000,
  "lastUpdated": "2026-11-12T10:00:00Z"
}
```

#### 2. Category
```json
{
  "PK": "USER#user001",
  "SK": "CATEGORY#abc123",
  "categoryId": "abc123",
  "name": "Food Outside",
  "type": "expense",
  "monthlyLimit": 5000,
  "icon": "🍔",
  "color": "#FF9800",
  "createdAt": "2026-11-01T00:00:00Z"
}
```

#### 3. Transaction
```json
{
  "PK": "USER#user001",
  "SK": "TRANSACTION#2026-11-12T10:30:00Z#xyz789",
  "GSI1PK": "USER#user001#MONTH#2026-11",
  "GSI1SK": "TRANSACTION#2026-11-12T10:30:00Z",
  "transactionId": "xyz789",
  "type": "expense",
  "amount": 450,
  "categoryId": "abc123",
  "categoryName": "Food Outside",
  "description": "Lunch at restaurant",
  "date": "2026-11-12",
  "month": "2026-11",
  "createdAt": "2026-11-12T10:30:00Z"
}
```

#### 4. Monthly Summary
```json
{
  "PK": "USER#user001",
  "SK": "SUMMARY#2026-11",
  "month": "2026-11",
  "totalIncome": 106000,
  "totalExpense": 96494,
  "categorySpending": {
    "fuel": 9785,
    "shopping": 2500,
    "home": 31090
  },
  "carryoverFromPrevious": -17000,
  "carryoverToNext": -7494,
  "currentBalance": -7494,
  "updatedAt": "2026-11-12T23:59:59Z"
}
```

## Query Patterns

### 1. Get All Categories
```python
query(
  KeyConditionExpression: PK = "USER#user001" AND begins_with(SK, "CATEGORY#")
)
```

### 2. Get Transactions for Month
```python
query(
  IndexName: "GSI1",
  KeyConditionExpression: GSI1PK = "USER#user001#MONTH#2026-11"
)
```

### 3. Get Monthly Summary
```python
get_item(
  Key: {
    PK: "USER#user001",
    SK: "SUMMARY#2026-11"
  }
)
```

## API Endpoints

### Categories
- `GET /categories` - List all categories
- `POST /categories` - Create category
- `PUT /categories` - Update category
- `DELETE /categories` - Delete category

### Transactions
- `GET /transactions?month=2026-11` - List transactions (optionally filtered by month)
- `POST /transactions` - Create transaction
- `PUT /transactions` - Update transaction
- `DELETE /transactions` - Delete transaction

### Summary
- `GET /summary?month=2026-11` - Get monthly summary

### Admin
- `POST /initialize` - Initialize default data

## Cost Breakdown

### Monthly Costs (Personal Use)

| Service | Usage | Cost |
|---------|-------|------|
| **S3** | 1GB storage, 10k requests | ~$0.50 |
| **API Gateway** | HTTP API, <1M requests | FREE |
| **Lambda** | <1M requests, <400k GB-sec | FREE |
| **DynamoDB** | <25GB storage, minimal RCU/WCU | FREE |
| **Data Transfer** | Minimal | ~$0.10 |
| **TOTAL** | | **~$0.60-$2/month** |

### Why So Cheap?

1. **Serverless** - No idle servers running
2. **On-Demand DynamoDB** - Pay per request (free tier covers personal use)
3. **HTTP API** - Cheaper than REST API Gateway
4. **Free Tier** - Lambda and API Gateway within free limits
5. **Static Hosting** - S3 is cheapest for frontend

### Cost Optimization Strategies

✅ **Already Implemented:**
- On-demand DynamoDB (vs provisioned)
- HTTP API Gateway (vs REST API)
- No CloudFront (uses direct S3)
- ap-south-1 region
- Minimal Lambda memory (128MB)

❌ **Avoided (adds cost):**
- CloudFront CDN (~$1/month minimum)
- REST API Gateway (3x more expensive)
- NAT Gateway ($30+/month)
- Cognito User Pools (mostly free, but adds complexity)

## Security

### Current Setup (Minimal Security)
- ✅ HTTPS via S3/API Gateway
- ✅ IAM roles for Lambda
- ✅ CORS configured
- ❌ No authentication
- ❌ Public website access

### For Production Use (Not Implemented)
- Add AWS Cognito for authentication
- API Gateway API keys
- CloudFront with custom domain
- WAF for protection
- Encryption at rest (DynamoDB)

## Scalability

### Current Capacity
- **Transactions**: Unlimited (DynamoDB scales automatically)
- **Users**: Single user design
- **Requests**: Auto-scales with Lambda
- **Storage**: Up to 25GB free, then pay-per-GB

### Scaling Considerations
- Lambda concurrent executions: 1000 default
- DynamoDB: Auto-scales, no limits
- API Gateway: 10k requests/second default

## Monitoring & Logging

### Available Logs
- **Lambda Logs**: CloudWatch Logs
- **API Gateway**: Access logs (optional)
- **DynamoDB**: CloudWatch metrics

### Useful Metrics
- Lambda invocations
- Lambda errors
- DynamoDB read/write capacity
- API Gateway latency

## Deployment Strategy

### Infrastructure as Code
- **Tool**: Terraform
- **State**: Local (or S3 backend)
- **Modules**: Single main.tf

### CI/CD Options (Future)
- GitHub Actions
- AWS CodePipeline
- Manual deployment scripts (current)

## Disaster Recovery

### Backup Strategy
- **DynamoDB**: Point-in-time recovery (optional, adds cost)
- **S3**: Versioning (optional)
- **Manual**: Export data periodically

### Recovery
- Redeploy infrastructure with Terraform
- Restore DynamoDB from backup
- Re-upload frontend to S3

## Technology Stack

**Frontend:**
- Vanilla JavaScript (no framework)
- HTML5 + CSS3
- Fetch API for HTTP requests

**Backend:**
- Python 3.11
- boto3 (AWS SDK)

**Infrastructure:**
- Terraform
- AWS Services (S3, Lambda, API Gateway, DynamoDB)

**DevOps:**
- Bash scripts for deployment
- AWS CLI

## Design Decisions

### Why Serverless?
- ✅ Minimal cost for personal use
- ✅ No server maintenance
- ✅ Auto-scaling
- ✅ Pay-per-use pricing

### Why Single-Table DynamoDB?
- ✅ Cost-effective (one table = one billing unit)
- ✅ Flexible schema
- ✅ Fast queries with GSI
- ✅ No joins needed

### Why No Framework (React/Vue)?
- ✅ Simpler deployment
- ✅ Smaller bundle size
- ✅ No build step needed
- ✅ Faster load time
- ✅ Easier to understand

### Why HTTP API (not REST)?
- ✅ 70% cheaper than REST API
- ✅ Simpler configuration
- ✅ Lower latency
- ✅ Sufficient features for this use case

## Future Architecture Improvements

### Phase 2 (Optional)
- Add CloudFront for custom domain
- Implement Cognito authentication
- Add data export/import
- Scheduled Lambda for monthly reports

### Phase 3 (Optional)
- Multi-user support
- Mobile app (React Native)
- Real-time updates (WebSocket)
- Advanced analytics
