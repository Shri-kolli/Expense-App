import json
import os
import boto3
from datetime import datetime
from decimal import Decimal, InvalidOperation
from boto3.dynamodb.conditions import Key
import uuid

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
USER_ID = os.environ.get('USER_ID', 'user001')

# Helper function to convert Decimal to float for JSON serialization
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def cors_response(status_code, body):
    """Helper function to create CORS-enabled responses"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, default=decimal_default)
    }

def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"Event: {json.dumps(event)}")

    # Handle OPTIONS requests for CORS
    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return cors_response(200, {'message': 'OK'})

    # Parse route and method
    route_key = event.get('routeKey', '')
    raw_path = event.get('rawPath', '')
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')

    # Parse body if present
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except:
            pass

    # Route handlers
    try:
        # Categories
        if '/categories' in raw_path:
            if method == 'GET':
                return get_categories()
            elif method == 'POST':
                return add_category(body)
            elif method == 'PUT':
                return update_category(body)
            elif method == 'DELETE':
                category_id = body.get('categoryId')
                return delete_category(category_id)

        # Transactions
        elif '/transactions' in raw_path:
            if method == 'GET':
                month = event.get('queryStringParameters', {}).get('month') if event.get('queryStringParameters') else None
                return get_transactions(month)
            elif method == 'POST':
                return add_transaction(body)
            elif method == 'PUT':
                return update_transaction(body)
            elif method == 'DELETE':
                transaction_id = body.get('transactionId')
                return delete_transaction(transaction_id)

        # Monthly Summary
        elif '/summary' in raw_path:
            month = event.get('queryStringParameters', {}).get('month') if event.get('queryStringParameters') else None
            if not month:
                month = datetime.now().strftime('%Y-%m')
            return get_monthly_summary(month)

        # Initialize default data
        elif '/initialize' in raw_path:
            return initialize_default_data()

        else:
            return cors_response(404, {'error': 'Route not found'})

    except ValueError as e:
        return cors_response(400, {'error': str(e)})
    except Exception as e:
        print(f"Error: {str(e)}")
        return cors_response(500, {'error': str(e)})

# ============= CATEGORY FUNCTIONS =============

def get_categories():
    """Get all categories"""
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#')
    )
    return cors_response(200, {'categories': response.get('Items', [])})

def add_category(body):
    """Add a new category"""
    category_type = body.get('type')
    if category_type not in ('income', 'expense'):
        raise ValueError('Category type must be income or expense')

    category_id = str(uuid.uuid4())[:8]
    parent_category_id = body.get('parentCategoryId')
    budget = get_category_budget(body, category_type, parent_category_id)

    item = {
        'PK': f'USER#{USER_ID}',
        'SK': f'CATEGORY#{category_id}',
        'categoryId': category_id,
        'name': body['name'],
        'type': category_type,
        'monthlyLimit': budget['monthlyLimit'],
        'icon': body.get('icon', '💰'),
        'color': body.get('color', '#4CAF50'),
        'createdAt': datetime.now().isoformat()
    }

    if parent_category_id:
        item.update({
            'parentCategoryId': parent_category_id,
            'budgetPeriod': budget['budgetPeriod'],
            'budgetAmount': budget['budgetAmount']
        })

    table.put_item(Item=item)
    return cors_response(200, {'message': 'Category added', 'category': item})

def get_category_budget(body, category_type, parent_category_id):
    """Validate a category budget and return its monthly equivalent."""
    if parent_category_id:
        if category_type != 'expense':
            raise ValueError('Income categories cannot have subcategories')

        parent = table.get_item(
            Key={
                'PK': f'USER#{USER_ID}',
                'SK': f'CATEGORY#{parent_category_id}'
            }
        ).get('Item')
        if not parent or parent.get('type') != 'expense':
            raise ValueError('Select an existing expense category as the parent')
        if parent.get('parentCategoryId'):
            raise ValueError('Subcategories can only be one level deep')

        period = body.get('budgetPeriod')
        if period not in ('monthly', 'yearly'):
            raise ValueError('Subcategory budget period must be monthly or yearly')
        try:
            amount = Decimal(str(body.get('budgetAmount', 0)))
        except (InvalidOperation, TypeError):
            raise ValueError('Subcategory budget must be a valid amount')
        if not amount.is_finite() or amount <= 0:
            raise ValueError('Subcategories require a budget greater than zero')

        monthly_limit = amount / Decimal('12') if period == 'yearly' else amount
        return {
            'monthlyLimit': monthly_limit,
            'budgetPeriod': period,
            'budgetAmount': amount
        }

    try:
        monthly_limit = Decimal(str(body.get('monthlyLimit', 0)))
    except (InvalidOperation, TypeError):
        raise ValueError('Monthly limit must be a valid amount')
    if not monthly_limit.is_finite():
        raise ValueError('Monthly limit must be a finite amount')
    if monthly_limit < 0:
        raise ValueError('Monthly limit cannot be negative')
    return {'monthlyLimit': monthly_limit}

def update_category(body):
    """Update an existing category"""
    category_id = body['categoryId']
    category_type = body.get('type')
    if category_type not in ('income', 'expense'):
        raise ValueError('Category type must be income or expense')

    parent_category_id = body.get('parentCategoryId')
    budget = get_category_budget(body, category_type, parent_category_id)
    if parent_category_id == category_id:
        raise ValueError('A category cannot be its own parent')

    child_response = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#'),
        FilterExpression='parentCategoryId = :parent_id',
        ExpressionAttributeValues={':parent_id': category_id}
    )
    if child_response.get('Items') and (parent_category_id or category_type != 'expense'):
        raise ValueError('A category with subcategories must remain a top-level expense category')

    update_expr = (
        "SET #n = :name, #t = :type, monthlyLimit = :limit, "
        "icon = :icon, color = :color"
    )
    expr_attr_names = {'#n': 'name', '#t': 'type'}
    expr_attr_values = {
        ':name': body['name'],
        ':type': category_type,
        ':limit': budget['monthlyLimit'],
        ':icon': body.get('icon', '💰'),
        ':color': body.get('color', '#4CAF50')
    }

    if parent_category_id:
        update_expr += ', parentCategoryId = :parent_id, budgetPeriod = :period, budgetAmount = :amount'
        expr_attr_values.update({
            ':parent_id': parent_category_id,
            ':period': budget['budgetPeriod'],
            ':amount': budget['budgetAmount']
        })
    else:
        update_expr += ' REMOVE parentCategoryId, budgetPeriod, budgetAmount'

    table.update_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )

    return cors_response(200, {'message': 'Category updated'})

def delete_category(category_id):
    """Delete a category"""
    children = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#'),
        FilterExpression='parentCategoryId = :parent_id',
        ExpressionAttributeValues={':parent_id': category_id}
    ).get('Items', [])
    if children:
        return cors_response(409, {'error': "Delete this category's subcategories before deleting the category"})

    table.delete_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'}
    )
    return cors_response(200, {'message': 'Category deleted'})

# ============= TRANSACTION FUNCTIONS =============

def get_transactions(month=None):
    """Get transactions, optionally filtered by month"""
    if month:
        # Query using GSI for specific month
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'USER#{USER_ID}#MONTH#{month}') & Key('GSI1SK').begins_with('TRANSACTION#')
        )
    else:
        # Get all transactions
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('TRANSACTION#')
        )

    transactions = response.get('Items', [])
    # Sort by date descending
    transactions.sort(key=lambda x: x.get('date', ''), reverse=True)

    return cors_response(200, {'transactions': transactions})

def add_transaction(body):
    """Add a new transaction"""
    transaction_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().isoformat()
    date = body.get('date', datetime.now().strftime('%Y-%m-%d'))
    month = date[:7]  # Extract YYYY-MM

    item = {
        'PK': f'USER#{USER_ID}',
        'SK': f'TRANSACTION#{timestamp}#{transaction_id}',
        'GSI1PK': f'USER#{USER_ID}#MONTH#{month}',
        'GSI1SK': f'TRANSACTION#{timestamp}',
        'transactionId': transaction_id,
        'type': body['type'],  # 'income' or 'expense'
        'amount': Decimal(str(body['amount'])),
        'categoryId': body['categoryId'],
        'categoryName': body.get('categoryName', ''),
        'description': body.get('description', ''),
        'date': date,
        'month': month,
        'createdAt': timestamp
    }

    table.put_item(Item=item)

    # Update monthly summary
    update_monthly_summary(month)

    return cors_response(200, {'message': 'Transaction added', 'transaction': item})

def update_transaction(body):
    """Update an existing transaction"""
    transaction_id = body['transactionId']
    sk = body['SK']  # Need the full SK to update

    update_expr = "SET amount = :amount, categoryId = :catId, categoryName = :catName, description = :desc, #d = :date"
    expr_attr_names = {'#d': 'date'}
    expr_attr_values = {
        ':amount': Decimal(str(body['amount'])),
        ':catId': body['categoryId'],
        ':catName': body.get('categoryName', ''),
        ':desc': body.get('description', ''),
        ':date': body.get('date', datetime.now().strftime('%Y-%m-%d'))
    }

    table.update_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )

    # Update monthly summary
    month = body.get('date', datetime.now().strftime('%Y-%m-%d'))[:7]
    update_monthly_summary(month)

    return cors_response(200, {'message': 'Transaction updated'})

def delete_transaction(transaction_id):
    """Delete a transaction"""
    # First get the transaction to find its SK
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('TRANSACTION#'),
        FilterExpression='transactionId = :tid',
        ExpressionAttributeValues={':tid': transaction_id}
    )

    if response['Items']:
        item = response['Items'][0]
        table.delete_item(
            Key={'PK': f'USER#{USER_ID}', 'SK': item['SK']}
        )

        # Update monthly summary
        month = item.get('month', datetime.now().strftime('%Y-%m'))
        update_monthly_summary(month)

        return cors_response(200, {'message': 'Transaction deleted'})

    return cors_response(404, {'error': 'Transaction not found'})

# ============= SUMMARY FUNCTIONS =============

def get_monthly_summary(month):
    """Get monthly summary with income, expenses, and carryover"""
    # Get all transactions for the month
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1PK').eq(f'USER#{USER_ID}#MONTH#{month}') & Key('GSI1SK').begins_with('TRANSACTION#')
    )

    transactions = response.get('Items', [])

    # Get all categories to check limits
    categories_response = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#')
    )
    categories = {cat['categoryId']: cat for cat in categories_response.get('Items', [])}

    # Calculate totals
    total_income = Decimal('0')
    total_expense = Decimal('0')
    category_spending = {}

    for txn in transactions:
        amount = txn.get('amount', Decimal('0'))
        category_id = txn.get('categoryId', 'unknown')

        if txn.get('type') == 'income':
            total_income += amount
        else:
            total_expense += amount
            if category_id not in category_spending:
                category_spending[category_id] = Decimal('0')
            category_spending[category_id] += amount

    # Get previous month carryover (only for categories with limits)
    prev_month = get_previous_month(month)
    prev_summary = get_summary_item(prev_month)

    # Calculate category-level carryover
    # Only carry forward unused budget for categories WITH limits
    category_carryover = {}
    if prev_summary and prev_summary.get('categoryCarryover'):
        category_carryover = prev_summary.get('categoryCarryover', {})

    # Calculate carryover for current month to next
    next_month_carryover = {}
    total_carryover_from_prev = Decimal('0')

    for cat_id, cat in categories.items():
        if cat.get('type') == 'expense' and cat.get('monthlyLimit', 0) > 0:
            limit = Decimal(str(cat.get('monthlyLimit', 0)))
            spent = category_spending.get(cat_id, Decimal('0'))
            prev_carryover = category_carryover.get(cat_id, Decimal('0'))

            # Available = limit + previous carryover - spent
            available = limit + prev_carryover - spent

            # Carry forward both positive (unused) and negative (overspent)
            # Positive = you saved money, adds to next month
            # Negative = you overspent, reduces next month's budget
            if available != 0:
                next_month_carryover[cat_id] = available

            # Add previous carryover to total
            total_carryover_from_prev += prev_carryover

    # Calculate overall balance
    current_balance = total_income - total_expense + total_carryover_from_prev
    total_next_carryover = sum(next_month_carryover.values())

    summary = {
        'month': month,
        'totalIncome': total_income,
        'totalExpense': total_expense,
        'categorySpending': category_spending,
        'categoryCarryover': next_month_carryover,  # Carryover per category
        'categoryCarryoverFromPrevious': category_carryover,
        'carryoverFromPrevious': total_carryover_from_prev,
        'carryoverToNext': total_next_carryover,
        'currentBalance': current_balance
    }

    # Save summary to DynamoDB
    save_summary(summary)

    return cors_response(200, {'summary': summary})

def update_monthly_summary(month):
    """Update monthly summary after transaction changes"""
    # Just call get_monthly_summary which recalculates and saves
    get_monthly_summary(month)

def get_summary_item(month):
    """Get saved summary from DynamoDB"""
    try:
        response = table.get_item(
            Key={'PK': f'USER#{USER_ID}', 'SK': f'SUMMARY#{month}'}
        )
        return response.get('Item')
    except:
        return None

def save_summary(summary):
    """Save summary to DynamoDB"""
    item = {
        'PK': f'USER#{USER_ID}',
        'SK': f'SUMMARY#{summary["month"]}',
        **summary,
        'updatedAt': datetime.now().isoformat()
    }
    table.put_item(Item=item)

def get_previous_month(month_str):
    """Get previous month in YYYY-MM format"""
    year, month = map(int, month_str.split('-'))
    if month == 1:
        return f"{year-1}-12"
    else:
        return f"{year}-{month-1:02d}"

# ============= INITIALIZATION =============

def initialize_default_data():
    """Initialize default categories based on user's spreadsheet"""

    default_categories = [
        # Expense categories
        {'name': 'Fuel & Vehicle Expense', 'type': 'expense', 'monthlyLimit': 3000, 'icon': '⛽', 'color': '#FF5722'},
        {'name': 'Shopping & Entertainment', 'type': 'expense', 'monthlyLimit': 10000, 'icon': '🛒', 'color': '#9C27B0'},
        {'name': 'Home Expense', 'type': 'expense', 'monthlyLimit': 7000, 'icon': '🏠', 'color': '#2196F3'},
        {'name': 'Food Outside', 'type': 'expense', 'monthlyLimit': 5000, 'icon': '🍔', 'color': '#FF9800'},
        {'name': 'To Mini', 'type': 'expense', 'monthlyLimit': 25000, 'icon': '💰', 'color': '#4CAF50'},
        {'name': 'Salary - Driver', 'type': 'expense', 'monthlyLimit': 0, 'icon': '🚗', 'color': '#795548'},
        {'name': 'Others', 'type': 'expense', 'monthlyLimit': 0, 'icon': '📦', 'color': '#607D8B'},
        {'name': 'Loan', 'type': 'expense', 'monthlyLimit': 45777, 'icon': '🏦', 'color': '#F44336'},

        # Farm category - handles both income and expenses
        {'name': 'Farm - Expense', 'type': 'expense', 'monthlyLimit': 30000, 'icon': '🌾', 'color': '#8BC34A'},
        {'name': 'Farm - Income', 'type': 'income', 'monthlyLimit': 0, 'icon': '🌾', 'color': '#4CAF50'},

        # Income categories
        {'name': 'Earned - Nidagundi', 'type': 'income', 'monthlyLimit': 0, 'icon': '💵', 'color': '#8BC34A'},
        {'name': 'Earned - Stocks', 'type': 'income', 'monthlyLimit': 0, 'icon': '📈', 'color': '#00BCD4'},
    ]

    for cat in default_categories:
        add_category(cat)

    # Initialize profile with carryover
    profile = {
        'PK': f'USER#{USER_ID}',
        'SK': 'PROFILE',
        'carryoverBalance': Decimal('-17000'),  # From your data
        'lastUpdated': datetime.now().isoformat()
    }
    table.put_item(Item=profile)

    return cors_response(200, {'message': 'Default data initialized'})
