#!/usr/bin/env python3
"""
Import script to migrate data from spreadsheet to DynamoDB
Usage: python3 import-data.py <csv-file>
"""

import sys
import json
import requests
from datetime import datetime

# Configuration - UPDATE THIS with your API endpoint
API_ENDPOINT = "YOUR_API_GATEWAY_URL_HERE"

def parse_csv_row(row):
    """Parse a CSV row into transaction data"""
    # Expected format: Date,Amount,Category,Description
    parts = row.strip().split(',')
    if len(parts) < 3:
        return None

    date = parts[0].strip()
    amount = float(parts[1].strip())
    category = parts[2].strip()
    description = parts[3].strip() if len(parts) > 3 else ""

    return {
        'date': date,
        'amount': amount,
        'category': category,
        'description': description
    }

def get_category_id(category_name, categories):
    """Find category ID by name"""
    for cat in categories:
        if cat['name'].lower() == category_name.lower():
            return cat['categoryId'], cat['name']
    return None, None

def import_transaction(txn_data):
    """Import a single transaction"""
    url = f"{API_ENDPOINT}/transactions"

    try:
        response = requests.post(url, json=txn_data)
        if response.status_code == 200:
            return True
        else:
            print(f"Error importing: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 import-data.py <csv-file>")
        print("\nCSV Format: Date,Amount,Category,Description")
        print("Example: 2026-11-01,100,Food Outside,Lunch at restaurant")
        sys.exit(1)

    if API_ENDPOINT == "YOUR_API_GATEWAY_URL_HERE":
        print("❌ Please update API_ENDPOINT in this script with your actual API Gateway URL")
        sys.exit(1)

    csv_file = sys.argv[1]

    print(f"📊 Importing data from {csv_file}")
    print("=" * 50)

    # Get existing categories
    print("\n1️⃣  Fetching categories...")
    try:
        response = requests.get(f"{API_ENDPOINT}/categories")
        categories = response.json()['categories']
        print(f"   Found {len(categories)} categories")
    except Exception as e:
        print(f"❌ Error fetching categories: {str(e)}")
        sys.exit(1)

    # Read and import transactions
    print("\n2️⃣  Importing transactions...")

    success_count = 0
    error_count = 0

    with open(csv_file, 'r') as f:
        # Skip header if present
        first_line = f.readline()
        if not first_line.lower().startswith('date'):
            f.seek(0)  # Reset to beginning if no header

        for line_num, line in enumerate(f, start=2):
            if not line.strip():
                continue

            # Parse row
            row_data = parse_csv_row(line)
            if not row_data:
                print(f"   ⚠️  Line {line_num}: Invalid format, skipping")
                error_count += 1
                continue

            # Find category
            category_id, category_name = get_category_id(row_data['category'], categories)
            if not category_id:
                print(f"   ⚠️  Line {line_num}: Category '{row_data['category']}' not found, skipping")
                error_count += 1
                continue

            # Prepare transaction data
            txn = {
                'type': 'expense',  # Adjust based on amount sign or category
                'categoryId': category_id,
                'categoryName': category_name,
                'amount': abs(row_data['amount']),
                'date': row_data['date'],
                'description': row_data['description']
            }

            # Import
            if import_transaction(txn):
                success_count += 1
                print(f"   ✅ Line {line_num}: Imported {row_data['category']} - ₹{row_data['amount']}")
            else:
                error_count += 1

    print("\n" + "=" * 50)
    print(f"✅ Successfully imported: {success_count}")
    print(f"❌ Errors: {error_count}")
    print("\n🎉 Import complete!")

if __name__ == "__main__":
    main()
