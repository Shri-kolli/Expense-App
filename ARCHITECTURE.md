# System Architecture

## Overview

This is a serverless personal expense tracking application built on AWS. Charges vary
with usage and free-tier eligibility.

## Architecture Diagram

```
Browser ── HTTPS ──> CloudFront
                        ├── static files ──> Private S3 origin (OAC)
                        └── /api/* ──> API Gateway (Cognito JWT) ──> Lambda ──> DynamoDB

Browser ── Authorization Code + PKCE ──> Cognito Hosted UI
                                          (admin-invited users; MFA disabled)
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

### Cost

The deployment uses on-demand DynamoDB and serverless services. Actual charges vary
with traffic, region, account age, free-tier eligibility, and current AWS pricing.
CloudFront and Cognito are included; do not assume the deployment is free. Check AWS
Billing regularly and configure a budget alert.

## Security

### Deployed Setup
- HTTPS served by CloudFront with security response headers
- S3 origin is private and accessible only through CloudFront
- Cognito users are administrator-created; MFA is disabled for easier household use
- API Gateway validates Cognito JWTs before forwarding requests to Lambda
- The public CloudFront URL serves the login page; application data requires sign-in

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
- Add data export/import
- Scheduled Lambda for monthly reports

### Phase 3 (Optional)
- Multi-user support
- Mobile app (React Native)
- Real-time updates (WebSocket)
- Advanced analytics
