import json
import os
import boto3
import calendar
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
import uuid

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
USER_ID = os.environ.get('USER_ID', 'user001')
TODO_OWNERS = {'hubby', 'wifey'}
TODO_DAILY_LIMIT = 6
TODO_REWARD_PER_DAY = Decimal('100')
REPEAT_TODO_MINIMUM = 5
REPEAT_DAYS = ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')
serializer = TypeSerializer()

class TodoConflictError(Exception):
    """A task changed concurrently or its daily limit has been reached."""

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
                query = event.get('queryStringParameters') or {}
                return get_transactions(query.get('month'), query.get('businessId'))
            elif method == 'POST':
                return add_transaction(body)
            elif method == 'PUT':
                return update_transaction(body)
            elif method == 'DELETE':
                transaction_id = body.get('transactionId')
                return delete_transaction(transaction_id)

        # Household todos
        elif '/todos' in raw_path:
            query = event.get('queryStringParameters') or {}
            if raw_path.endswith('/todos/reward') and method == 'GET':
                return get_todo_reward(query.get('month'))
            if raw_path.endswith('/todos/repeat/status') and method == 'PUT':
                return update_repeat_todo_status(body)
            if raw_path.endswith('/todos/repeat'):
                if method == 'GET':
                    return get_repeat_todos(query.get('date'))
                if method == 'POST':
                    return add_repeat_todo(body)
                if method == 'PUT':
                    return update_repeat_todo(body)
                if method == 'DELETE':
                    return delete_repeat_todo(body)
            if raw_path.endswith('/todos/half-done') and method == 'POST':
                return mark_todo_half_done(body)
            if method == 'GET':
                return get_todos(query.get('date'), query.get('month'))
            if method == 'POST':
                return add_todo(body)
            if method == 'PUT':
                return update_todo(body)
            if method == 'DELETE':
                return delete_todo(body)

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
    except TodoConflictError as e:
        return cors_response(409, {'error': str(e)})
    except Exception as e:
        print(f"Error: {str(e)}")
        return cors_response(500, {'error': str(e)})

# ============= TODO FUNCTIONS =============

def validate_todo_date(value):
    """Validate a calendar date and return it in YYYY-MM-DD format."""
    try:
        parsed = datetime.strptime(value, '%Y-%m-%d')
    except (TypeError, ValueError):
        raise ValueError('Todo date must be a valid YYYY-MM-DD date')
    if parsed.strftime('%Y-%m-%d') != value:
        raise ValueError('Todo date must be a valid YYYY-MM-DD date')
    return value

def validate_todo_month(value):
    """Validate a calendar month and return it in YYYY-MM format."""
    try:
        parsed = datetime.strptime(value, '%Y-%m')
    except (TypeError, ValueError):
        raise ValueError('Todo month must be a valid YYYY-MM month')
    if parsed.strftime('%Y-%m') != value:
        raise ValueError('Todo month must be a valid YYYY-MM month')
    return value

def validate_todo_id(value):
    if not isinstance(value, str):
        raise ValueError('Todo ID is required')
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError):
        raise ValueError('Todo ID is invalid')

def validate_todo_title(value, label='Todo title'):
    if not isinstance(value, str):
        raise ValueError(f'{label} must be text')
    title = value.strip()
    if not title or len(title) > 160:
        raise ValueError(f'{label} must be between 1 and 160 characters')
    return title

def todo_key(todo_date, todo_id):
    return {'PK': f'USER#{USER_ID}', 'SK': f'TODO#{todo_date}#{todo_id}'}

def repeat_todo_key(todo_id):
    return {'PK': f'USER#{USER_ID}', 'SK': f'REPEATTASK#{todo_id}'}

def repeat_todo_status_key(todo_date, todo_id):
    return {'PK': f'USER#{USER_ID}', 'SK': f'REPEATDONE#{todo_date}#{todo_id}'}

def serialize_item(item):
    return {name: serializer.serialize(value) for name, value in item.items()}

def todo_counter_key(todo_date, owner):
    return {
        'PK': serializer.serialize(f'USER#{USER_ID}'),
        'SK': serializer.serialize(f'TODOCOUNT#{todo_date}#{owner}')
    }

def reserve_todo_slot(todo_date, owner):
    return {
        'Update': {
            'TableName': table.name,
            'Key': todo_counter_key(todo_date, owner),
            'UpdateExpression': 'SET #taskCount = if_not_exists(#taskCount, :zero) + :one',
            'ConditionExpression': 'attribute_not_exists(#taskCount) OR #taskCount < :limit',
            'ExpressionAttributeNames': {'#taskCount': 'taskCount'},
            'ExpressionAttributeValues': {
                ':zero': {'N': '0'},
                ':one': {'N': '1'},
                ':limit': {'N': str(TODO_DAILY_LIMIT)}
            }
        }
    }

def transact_todo_write(operations, conflict_message):
    try:
        dynamodb_client.transact_write_items(TransactItems=operations)
    except ClientError as error:
        if error.response.get('Error', {}).get('Code') == 'TransactionCanceledException':
            raise TodoConflictError(conflict_message) from error
        raise

def query_todos(prefix):
    items = []
    query_args = {
        'KeyConditionExpression': Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with(prefix)
    }
    while True:
        response = table.query(**query_args)
        items.extend(response.get('Items', []))
        last_key = response.get('LastEvaluatedKey')
        if not last_key:
            break
        query_args['ExclusiveStartKey'] = last_key
    return items

def validate_repeat_days(value):
    if not isinstance(value, list) or not value:
        raise ValueError('Select at least one repeat day')
    if any(day not in REPEAT_DAYS for day in value) or len(set(value)) != len(value):
        raise ValueError('Repeat days must be unique weekdays')
    return [day for day in REPEAT_DAYS if day in value]

def repeat_version_for_date(task, task_date):
    for version in reversed(task.get('scheduleHistory', [])):
        if version['startsOn'] <= task_date and (
            version.get('endsOn') is None or task_date <= version['endsOn']
        ):
            return version
    return None

def repeat_version_matches_date(version, task_date):
    weekday = REPEAT_DAYS[datetime.strptime(task_date, '%Y-%m-%d').weekday()]
    return weekday in version['days']

def get_repeat_todos(todo_date):
    todo_date = validate_todo_date(todo_date)
    tasks = query_todos('REPEATTASK#')
    statuses = {
        item['repeatTaskId']: item
        for item in query_todos(f'REPEATDONE#{todo_date}#')
    }
    daily_tasks = []
    for task in tasks:
        if not task.get('active'):
            continue
        version = repeat_version_for_date(task, todo_date)
        if not version:
            continue
        scheduled = repeat_version_matches_date(version, todo_date)
        daily_tasks.append({
            'repeatTaskId': task['repeatTaskId'],
            'owner': task['owner'],
            'title': version['title'],
            'days': version['days'],
            'scheduledToday': scheduled,
            'status': 'completed' if statuses.get(task['repeatTaskId'], {}).get('completed') else 'open',
            'date': todo_date
        })
    daily_tasks.sort(
        key=lambda item: (
            item['owner'],
            not item['scheduledToday'],
            item['title'].casefold()
        )
    )
    return cors_response(200, {'date': todo_date, 'repeatTodos': daily_tasks})

def get_todos(todo_date=None, month=None):
    if todo_date:
        prefix = f'TODO#{validate_todo_date(todo_date)}#'
    elif month:
        prefix = f'TODO#{validate_todo_month(month)}-'
    else:
        raise ValueError('Provide a date or month to load todos')

    items = query_todos(prefix)
    items.sort(key=lambda item: (item.get('owner', ''), item.get('createdAt', '')))
    return cors_response(200, {'todos': items})

def get_todo_reward(month):
    month = validate_todo_month(month)
    items = query_todos(f'TODO#{month}-')
    daily_owner_counts = {}
    for item in items:
        key = (item['date'], item['owner'])
        counts = daily_owner_counts.setdefault(key, {'total': 0, 'completed': 0})
        counts['total'] += 1
        if item.get('status') == 'completed':
            counts['completed'] += 1

    owner_rewards = {'hubby': Decimal('0'), 'wifey': Decimal('0')}
    regular_rewards = {'hubby': Decimal('0'), 'wifey': Decimal('0')}
    qualifying_days = {'hubby': 0, 'wifey': 0}
    for (_, owner), counts in daily_owner_counts.items():
        if counts['total'] >= 4:
            qualifying_days[owner] += 1
            regular_rewards[owner] += (
                TODO_REWARD_PER_DAY * counts['completed'] / counts['total']
            )

    repeat_rewards = {'hubby': Decimal('0'), 'wifey': Decimal('0')}
    qualifying_repeat_days = {'hubby': 0, 'wifey': 0}
    repeat_tasks = query_todos('REPEATTASK#')
    completed_repeat_occurrences = {
        item['SK']
        for item in query_todos(f'REPEATDONE#{month}-')
        if item.get('completed')
    }
    year, month_number = (int(part) for part in month.split('-'))
    days_in_month = calendar.monthrange(year, month_number)[1]
    repeat_daily_counts = {}
    for task in repeat_tasks:
        for day in range(1, days_in_month + 1):
            task_date = f'{month}-{day:02d}'
            version = repeat_version_for_date(task, task_date)
            if not version or not repeat_version_matches_date(version, task_date):
                continue
            counts = repeat_daily_counts.setdefault(
                (task_date, task['owner']), {'total': 0, 'completed': 0}
            )
            counts['total'] += 1
            if repeat_todo_status_key(task_date, task['repeatTaskId'])['SK'] in completed_repeat_occurrences:
                counts['completed'] += 1

    for (_, owner), counts in repeat_daily_counts.items():
        if counts['total'] >= REPEAT_TODO_MINIMUM:
            qualifying_repeat_days[owner] += 1
            repeat_rewards[owner] += (
                TODO_REWARD_PER_DAY * counts['completed'] / counts['total']
            )

    for owner in TODO_OWNERS:
        owner_rewards[owner] = regular_rewards[owner] + repeat_rewards[owner]

    return cors_response(200, {
        'month': month,
        'rewardPerDay': TODO_REWARD_PER_DAY,
        'minimumTasksPerPersonPerDay': 4,
        'minimumRepeatTasksPerPersonPerDay': REPEAT_TODO_MINIMUM,
        'regularRewards': regular_rewards,
        'repeatRewards': repeat_rewards,
        'qualifyingRepeatDays': qualifying_repeat_days,
        'rewards': owner_rewards,
        'qualifyingDays': qualifying_days,
        'totalReward': owner_rewards['hubby'] + owner_rewards['wifey']
    })

def add_repeat_todo(body):
    title = validate_todo_title(body.get('title'), 'Repeat task title')
    owner = body.get('owner')
    if owner not in TODO_OWNERS:
        raise ValueError('Repeat task owner must be hubby or wifey')
    days = validate_repeat_days(body.get('days'))
    start_date = validate_todo_date(body.get('date'))
    now = datetime.now().isoformat()
    repeat_task_id = str(uuid.uuid4())
    task = {
        **repeat_todo_key(repeat_task_id),
        'repeatTaskId': repeat_task_id,
        'owner': owner,
        'title': title,
        'days': days,
        'active': True,
        'scheduleHistory': [{
            'title': title,
            'days': days,
            'startsOn': start_date,
            'endsOn': None
        }],
        'createdAt': now,
        'updatedAt': now
    }
    table.put_item(
        Item=task,
        ConditionExpression='attribute_not_exists(PK) AND attribute_not_exists(SK)'
    )
    return cors_response(201, {'repeatTodo': task})

def update_repeat_todo(body):
    repeat_task_id = validate_todo_id(body.get('repeatTaskId'))
    effective_date = validate_todo_date(body.get('date'))
    title = validate_todo_title(body.get('title'), 'Repeat task title')
    days = validate_repeat_days(body.get('days'))
    key = repeat_todo_key(repeat_task_id)
    task = table.get_item(Key=key).get('Item')
    if not task or not task.get('active'):
        return cors_response(404, {'error': 'Repeat task not found'})

    history = task.get('scheduleHistory', [])
    if not history or effective_date < history[-1]['startsOn']:
        raise ValueError('Repeat task changes must take effect on or after its current schedule')
    current_version = {
        'title': title,
        'days': days,
        'startsOn': effective_date,
        'endsOn': None
    }
    if history[-1]['startsOn'] == effective_date:
        history[-1] = current_version
    else:
        history[-1]['endsOn'] = (
            datetime.strptime(effective_date, '%Y-%m-%d') - timedelta(days=1)
        ).strftime('%Y-%m-%d')
        history.append(current_version)

    now = datetime.now().isoformat()
    try:
        updated = table.update_item(
            Key=key,
            UpdateExpression='SET title = :title, days = :days, scheduleHistory = :history, updatedAt = :updated',
            ConditionExpression='attribute_exists(PK) AND #active = :true AND updatedAt = :previous',
            ExpressionAttributeNames={'#active': 'active'},
            ExpressionAttributeValues={
                ':title': title,
                ':days': days,
                ':history': history,
                ':updated': now,
                ':true': True,
                ':previous': task['updatedAt']
            },
            ReturnValues='ALL_NEW'
        )['Attributes']
    except ClientError as error:
        if error.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
            raise TodoConflictError('This repeat task changed. Refresh and try again') from error
        raise
    return cors_response(200, {'repeatTodo': updated})

def delete_repeat_todo(body):
    repeat_task_id = validate_todo_id(body.get('repeatTaskId'))
    effective_date = validate_todo_date(body.get('date'))
    key = repeat_todo_key(repeat_task_id)
    task = table.get_item(Key=key).get('Item')
    if not task or not task.get('active'):
        return cors_response(404, {'error': 'Repeat task not found'})

    history = task.get('scheduleHistory', [])
    if not history or effective_date < history[-1]['startsOn']:
        raise ValueError('Repeat task changes must take effect on or after its current schedule')
    history[-1]['endsOn'] = (
        datetime.strptime(effective_date, '%Y-%m-%d') - timedelta(days=1)
    ).strftime('%Y-%m-%d')
    now = datetime.now().isoformat()
    try:
        table.update_item(
            Key=key,
            UpdateExpression='SET #active = :false, scheduleHistory = :history, updatedAt = :updated',
            ConditionExpression='attribute_exists(PK) AND #active = :true AND updatedAt = :previous',
            ExpressionAttributeNames={'#active': 'active'},
            ExpressionAttributeValues={
                ':false': False,
                ':true': True,
                ':history': history,
                ':updated': now,
                ':previous': task['updatedAt']
            }
        )
    except ClientError as error:
        if error.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
            raise TodoConflictError('This repeat task changed. Refresh and try again') from error
        raise
    return cors_response(200, {'message': 'Repeat task removed'})

def update_repeat_todo_status(body):
    repeat_task_id = validate_todo_id(body.get('repeatTaskId'))
    todo_date = validate_todo_date(body.get('date'))
    completed = body.get('completed')
    if not isinstance(completed, bool):
        raise ValueError('Repeat task completion must be true or false')
    task = table.get_item(Key=repeat_todo_key(repeat_task_id)).get('Item')
    version = repeat_version_for_date(task or {}, todo_date)
    if not version or not repeat_version_matches_date(version, todo_date):
        return cors_response(404, {'error': 'Repeat task is not scheduled for this day'})

    key = repeat_todo_status_key(todo_date, repeat_task_id)
    if completed:
        table.put_item(Item={
            **key,
            'repeatTaskId': repeat_task_id,
            'date': todo_date,
            'completed': True,
            'updatedAt': datetime.now().isoformat()
        })
    else:
        table.delete_item(Key=key)
    return cors_response(200, {
        'repeatTaskId': repeat_task_id,
        'date': todo_date,
        'completed': completed
    })

def add_todo(body):
    title = validate_todo_title(body.get('title'))
    todo_date = validate_todo_date(body.get('date'))
    owner = body.get('owner')
    if owner not in TODO_OWNERS:
        raise ValueError('Todo owner must be hubby or wifey')

    now = datetime.now().isoformat()
    todo_id = str(uuid.uuid4())
    item = {
        **todo_key(todo_date, todo_id),
        'todoId': todo_id,
        'title': title,
        'owner': owner,
        'date': todo_date,
        'status': 'open',
        'subtasks': [],
        'createdAt': now,
        'updatedAt': now
    }
    transact_todo_write([
        reserve_todo_slot(todo_date, owner),
        {
            'Put': {
                'TableName': table.name,
                'Item': serialize_item(item),
                'ConditionExpression': 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
            }
        }
    ], f'{owner.title()} already has {TODO_DAILY_LIMIT} tasks for this day')
    return cors_response(201, {'todo': item})

def update_todo(body):
    todo_date = validate_todo_date(body.get('date'))
    todo_id = validate_todo_id(body.get('todoId'))

    updates = []
    names = {}
    values = {}
    if 'status' in body:
        status = body['status']
        if status not in ('open', 'completed'):
            raise ValueError('Todo status must be open or completed')
        names['#status'] = 'status'
        values[':status'] = status
        updates.append('#status = :status')
    if 'subtasks' in body:
        subtasks = body['subtasks']
        if not isinstance(subtasks, list) or len(subtasks) > 5:
            raise ValueError('A todo can have up to 5 subtasks')
        validated_subtasks = []
        for subtask in subtasks:
            if not isinstance(subtask, dict):
                raise ValueError('Each subtask must be an object')
            text = validate_todo_title(subtask.get('text'), 'Subtask title')
            subtask_id = subtask.get('id')
            completed = subtask.get('completed')
            if not isinstance(subtask_id, str) or not subtask_id or len(subtask_id) > 64 or not isinstance(completed, bool):
                raise ValueError('Each subtask needs an ID, a title, and a completion state')
            validated_subtasks.append({
                'id': subtask_id,
                'text': text,
                'completed': completed
            })
        names['#subtasks'] = 'subtasks'
        values[':subtasks'] = validated_subtasks
        updates.append('#subtasks = :subtasks')
    if not updates:
        raise ValueError('Provide a todo status or subtasks to update')

    values[':updated'] = datetime.now().isoformat()
    updates.append('updatedAt = :updated')
    try:
        response = table.update_item(
            Key=todo_key(todo_date, todo_id),
            UpdateExpression='SET ' + ', '.join(updates),
            ConditionExpression='attribute_exists(PK)',
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ReturnValues='ALL_NEW'
        )
    except ClientError as error:
        if error.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
            return cors_response(404, {'error': 'Todo not found'})
        raise
    return cors_response(200, {'todo': response['Attributes']})

def delete_todo(body):
    todo_date = validate_todo_date(body.get('date'))
    todo_id = validate_todo_id(body.get('todoId'))
    owner = body.get('owner')
    if owner not in TODO_OWNERS:
        raise ValueError('A valid todo owner is required')

    key = todo_key(todo_date, todo_id)
    existing = table.get_item(Key=key).get('Item')
    if not existing:
        return cors_response(404, {'error': 'Todo not found'})
    if existing.get('owner') != owner:
        raise ValueError('Todo owner does not match')

    transact_todo_write([
        {
            'Update': {
                'TableName': table.name,
                'Key': todo_counter_key(todo_date, owner),
                'UpdateExpression': 'SET #taskCount = #taskCount - :one',
                'ConditionExpression': '#taskCount >= :one',
                'ExpressionAttributeNames': {'#taskCount': 'taskCount'},
                'ExpressionAttributeValues': {':one': {'N': '1'}}
            }
        },
        {
            'Delete': {
                'TableName': table.name,
                'Key': {name: serializer.serialize(value) for name, value in key.items()},
                'ConditionExpression': 'attribute_exists(PK)'
            }
        }
    ], 'This todo changed while it was being deleted. Refresh and try again')
    return cors_response(200, {'message': 'Todo deleted'})

def mark_todo_half_done(body):
    todo_date = validate_todo_date(body.get('date'))
    continuation_date = validate_todo_date(body.get('continuationDate'))
    todo_id = validate_todo_id(body.get('todoId'))

    key = todo_key(todo_date, todo_id)
    original = table.get_item(Key=key).get('Item')
    if not original:
        return cors_response(404, {'error': 'Todo not found'})
    if original.get('status') != 'open':
        raise TodoConflictError('Only an open todo can be marked half done')

    continuation_title = validate_todo_title(body.get('continuationTitle'), 'Continuation title')

    now = datetime.now().isoformat()
    continuation_id = str(uuid.uuid4())
    continuation = {
        **todo_key(continuation_date, continuation_id),
        'todoId': continuation_id,
        'title': continuation_title,
        'owner': original['owner'],
        'date': continuation_date,
        'status': 'open',
        'subtasks': [],
        'continuationOf': todo_id,
        'createdAt': now,
        'updatedAt': now
    }
    operations = [
        {
            'Update': {
                'TableName': table.name,
                'Key': {name: serializer.serialize(value) for name, value in key.items()},
                'UpdateExpression': 'SET #status = :half, updatedAt = :updated, continuationTaskId = :continuation',
                'ConditionExpression': 'attribute_exists(PK) AND #status = :open',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {
                    ':half': {'S': 'half_done'},
                    ':open': {'S': 'open'},
                    ':updated': {'S': now},
                    ':continuation': {'S': continuation_id}
                }
            }
        },
        reserve_todo_slot(continuation_date, original['owner']),
        {
            'Put': {
                'TableName': table.name,
                'Item': serialize_item(continuation),
                'ConditionExpression': 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
            }
        }
    ]
    transact_todo_write(
        operations,
        f'{original["owner"].title()} already has {TODO_DAILY_LIMIT} tasks on the continuation date, or the original task changed'
    )
    return cors_response(200, {'todo': continuation, 'originalStatus': 'half_done'})

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
    if category_type not in ('income', 'expense', 'business'):
        raise ValueError('Category type must be income, expense, or business')

    category_id = str(uuid.uuid4())[:8]
    parent_category_id = body.get('parentCategoryId')
    business_id = validate_category_business(body, category_type, parent_category_id)
    budget = get_category_budget(body, category_type, parent_category_id)

    item = {
        'PK': f'USER#{USER_ID}',
        'SK': f'CATEGORY#{category_id}',
        'categoryId': category_id,
        'name': body['name'],
        'type': category_type,
        'monthlyLimit': budget.get('monthlyLimit', Decimal('0')),
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
    if business_id:
        item['businessId'] = business_id

    table.put_item(Item=item)
    return cors_response(200, {'message': 'Category added', 'category': item})

def get_category_budget(body, category_type, parent_category_id):
    """Validate a category budget and return its monthly equivalent."""
    if category_type in ('income', 'business'):
        return {'monthlyLimit': Decimal('0')}

    if parent_category_id:
        if category_type != 'expense' or body.get('businessId'):
            raise ValueError('Only personal expense categories can have subcategories')

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

def validate_category_business(body, category_type, parent_category_id):
    """Validate a category's optional business ownership."""
    business_id = body.get('businessId')
    if category_type == 'business':
        if business_id or parent_category_id:
            raise ValueError('A business cannot belong to another business or category')
        return None
    if not business_id:
        return None
    if parent_category_id:
        raise ValueError('Business categories cannot be personal subcategories')
    if business_id == body.get('categoryId'):
        raise ValueError('A business cannot be its own category owner')

    business = table.get_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{business_id}'}
    ).get('Item')
    if not business or business.get('type') != 'business':
        raise ValueError('Select an existing business')
    return business_id

def update_category(body):
    """Update an existing category"""
    category_id = body['categoryId']
    category_type = body.get('type')
    if category_type not in ('income', 'expense', 'business'):
        raise ValueError('Category type must be income, expense, or business')

    parent_category_id = body.get('parentCategoryId')
    business_id = validate_category_business(body, category_type, parent_category_id)
    budget = get_category_budget(body, category_type, parent_category_id)
    existing = table.get_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'}
    ).get('Item')
    if category_type == 'business' and existing and (
        existing.get('businessId') or existing.get('parentCategoryId')
    ):
        raise ValueError('Create a separate business instead of converting a category into a business')
    if parent_category_id == category_id:
        raise ValueError('A category cannot be its own parent')

    child_response = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#'),
        FilterExpression='parentCategoryId = :parent_id',
        ExpressionAttributeValues={':parent_id': category_id}
    )
    if child_response.get('Items') and (parent_category_id or category_type != 'expense'):
        raise ValueError('A category with subcategories must remain a top-level expense category')
    if existing and existing.get('type') == 'business' and category_type != 'business':
        business_child_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#'),
            FilterExpression='businessId = :business_id',
            ExpressionAttributeValues={':business_id': category_id}
        )
        business_transactions = table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('TRANSACTION#'),
            FilterExpression='businessId = :business_id',
            ExpressionAttributeValues={':business_id': category_id}
        )
        if business_child_response.get('Items') or business_transactions.get('Items'):
            raise ValueError('A business with categories or transactions must remain a business')
    if existing and (existing.get('businessId') or business_id) and (
        existing.get('businessId') != business_id or existing.get('type') != category_type
    ):
        category_transactions = table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('TRANSACTION#'),
            FilterExpression='categoryId = :category_id',
            ExpressionAttributeValues={':category_id': category_id}
        )
        if category_transactions.get('Items'):
            raise ValueError("Remove this category's transactions before changing its type or business")

    set_expressions = [
        '#n = :name',
        '#t = :type',
        'monthlyLimit = :limit',
        'icon = :icon',
        'color = :color'
    ]
    expr_attr_names = {'#n': 'name', '#t': 'type'}
    expr_attr_values = {
        ':name': body['name'],
        ':type': category_type,
        ':limit': budget.get('monthlyLimit', Decimal('0')),
        ':icon': body.get('icon', '💰'),
        ':color': body.get('color', '#4CAF50')
    }

    if parent_category_id:
        set_expressions.extend([
            'parentCategoryId = :parent_id',
            'budgetPeriod = :period',
            'budgetAmount = :amount'
        ])
        expr_attr_values.update({
            ':parent_id': parent_category_id,
            ':period': budget['budgetPeriod'],
            ':amount': budget['budgetAmount']
        })
    if business_id:
        set_expressions.append('businessId = :business_id')
        expr_attr_values[':business_id'] = business_id

    update_expr = 'SET ' + ', '.join(set_expressions)
    remove_expressions = []
    if not parent_category_id:
        remove_expressions.extend(['parentCategoryId', 'budgetPeriod', 'budgetAmount'])
    if not business_id:
        remove_expressions.append('businessId')
    if remove_expressions:
        update_expr += ' REMOVE ' + ', '.join(remove_expressions)

    table.update_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )

    return cors_response(200, {'message': 'Category updated'})

def delete_category(category_id):
    """Delete a category"""
    category = table.get_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'}
    ).get('Item')
    children = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#'),
        FilterExpression='parentCategoryId = :parent_id',
        ExpressionAttributeValues={':parent_id': category_id}
    ).get('Items', [])
    if category and category.get('type') == 'business':
        children += table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('CATEGORY#'),
            FilterExpression='businessId = :business_id',
            ExpressionAttributeValues={':business_id': category_id}
        ).get('Items', [])
        transactions = table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{USER_ID}') & Key('SK').begins_with('TRANSACTION#'),
            FilterExpression='businessId = :business_id',
            ExpressionAttributeValues={':business_id': category_id}
        ).get('Items', [])
        if transactions:
            return cors_response(409, {'error': "Delete this business's transactions before deleting it"})
    if children:
        return cors_response(409, {'error': "Delete this category's subcategories before deleting the category"})

    table.delete_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'}
    )
    return cors_response(200, {'message': 'Category deleted'})

# ============= TRANSACTION FUNCTIONS =============

def validate_transaction_category(category_id, transaction_type, business_id=None):
    """Ensure transactions use a category in the correct personal or business ledger."""
    category = table.get_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{category_id}'}
    ).get('Item')
    if not category or category.get('type') != transaction_type:
        raise ValueError('Select a category matching the transaction type')

    if business_id:
        business = table.get_item(
            Key={'PK': f'USER#{USER_ID}', 'SK': f'CATEGORY#{business_id}'}
        ).get('Item')
        if not business or business.get('type') != 'business' or category.get('businessId') != business_id:
            raise ValueError('Select a category belonging to this business')
    elif category.get('businessId') or category.get('type') == 'business':
        raise ValueError('Business categories must be used in the business ledger')

    return category

def get_transactions(month=None, business_id=None):
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
    if business_id:
        transactions = [txn for txn in transactions if txn.get('businessId') == business_id]
    else:
        transactions = [txn for txn in transactions if not txn.get('businessId')]
    # Sort by date descending
    transactions.sort(key=lambda x: x.get('date', ''), reverse=True)

    return cors_response(200, {'transactions': transactions})

def add_transaction(body):
    """Add a new transaction"""
    business_id = body.get('businessId')
    validate_transaction_category(body['categoryId'], body['type'], business_id)
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
    if business_id:
        item['businessId'] = business_id

    table.put_item(Item=item)

    # Update monthly summary
    update_monthly_summary(month)

    return cors_response(200, {'message': 'Transaction added', 'transaction': item})

def update_transaction(body):
    """Update an existing transaction"""
    transaction_id = body['transactionId']
    sk = body['SK']  # Need the full SK to update
    existing = table.get_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': sk}
    ).get('Item')
    if not existing or existing.get('transactionId') != transaction_id:
        return cors_response(404, {'error': 'Transaction not found'})
    business_id = existing.get('businessId')
    if body.get('businessId') != business_id:
        raise ValueError('A transaction cannot be moved between personal and business ledgers')
    validate_transaction_category(body['categoryId'], existing['type'], business_id)

    date = body.get('date', datetime.now().strftime('%Y-%m-%d'))
    month = date[:7]
    timestamp = sk.split('#', 2)[1]
    update_expr = (
        "SET amount = :amount, categoryId = :catId, categoryName = :catName, "
        "description = :desc, #d = :date, month = :month, "
        "GSI1PK = :month_pk, GSI1SK = :month_sk"
    )
    expr_attr_names = {'#d': 'date'}
    expr_attr_values = {
        ':amount': Decimal(str(body['amount'])),
        ':catId': body['categoryId'],
        ':catName': body.get('categoryName', ''),
        ':desc': body.get('description', ''),
        ':date': date,
        ':month': month,
        ':month_pk': f'USER#{USER_ID}#MONTH#{month}',
        ':month_sk': f'TRANSACTION#{timestamp}'
    }

    table.update_item(
        Key={'PK': f'USER#{USER_ID}', 'SK': sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )

    # Update monthly summary
    old_month = existing.get('month', existing.get('date', date)[:7])
    if old_month != month:
        update_monthly_summary(old_month)
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
        if txn.get('businessId'):
            continue
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
