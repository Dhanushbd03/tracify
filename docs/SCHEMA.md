# Database Schema Documentation

## Overview
This document describes the database schema for the Tracify application, a personal finance tracking system.

## Tables

### 1. `balances`
Stores account balance snapshots over time for historical tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY, NOT NULL | Unique identifier for the balance record |
| `account_id` | `text` | NOT NULL | Foreign key to `accounts.id` |
| `balance` | `numeric(12, 2)` | NOT NULL | Account balance at this point in time |
| `created_at` | `timestamp` | NULLABLE | Timestamp when the balance was recorded |
| `updated_at` | `timestamp` | NULLABLE | Timestamp when the balance was last updated |

**Relationships:**
- Many-to-one with `accounts` via `account_id`
  - Foreign key: `balances.account_id` → `accounts.id`
  - One account can have many balance records (historical tracking)

**Indexes:**
- Primary key on `id`
- Foreign key index on `account_id`
- Consider indexing `account_id` and `created_at` for time-series queries

---

### 2. `accounts`
Stores user bank accounts and financial accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY, NOT NULL | Unique identifier for the account |
| `name` | `text` | NOT NULL | Display name of the account |
| `user_id` | `text` | NOT NULL | Foreign key to identify the account owner (Clerk user ID) |
| `balance_id` | `text` | NULLABLE | Foreign key to `balances.id` (current/latest balance) |
| `created_at` | `timestamp` | NULLABLE | Timestamp when the account was created |
| `updated_at` | `timestamp` | NULLABLE | Timestamp when the account was last updated |
| `deleted_at` | `timestamp` | NULLABLE | Timestamp when the account was soft-deleted (NULL if not deleted) |

**Relationships:**
- One account can have many transactions (`transactions.account_id` → `accounts.id`)
  - Cascade delete: When an account is deleted, all associated transactions are deleted
- One account can have many balance records (`balances.account_id` → `accounts.id`)
- One account references one current balance (`accounts.balance_id` → `balances.id`)

**Indexes:**
- Primary key on `id`
- Consider indexing `user_id` for faster user-specific queries

---

### 3. `categories`
Stores transaction categories for organizing expenses and income.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY, NOT NULL | Unique identifier for the category |
| `name` | `text` | NOT NULL | Category name (e.g., "Food", "Transportation") |
| `user_id` | `text` | NOT NULL | Foreign key to identify the category owner (Clerk user ID) |
| `created_at` | `timestamp` | NULLABLE | Timestamp when the category was created |
| `updated_at` | `timestamp` | NULLABLE | Timestamp when the category was last updated |
| `deleted_at` | `timestamp` | NULLABLE | Timestamp when the category was soft-deleted (NULL if not deleted) |
**Relationships:**
- One category can have many transactions (`transactions.category_id` → `categories.id`)
- Set null on delete: When a category is deleted, transactions with that category have `category_id` set to NULL

**Indexes:**
- Primary key on `id`
- Consider indexing `user_id` for faster user-specific queries

---

### 4. `transactions`
Stores individual financial transactions (expenses, income, transfers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY, NOT NULL | Unique identifier for the transaction |
| `amount` | `numeric(12, 2)` | NOT NULL | Transaction amount (always positive, use `type` to indicate debit/credit) |
| `type` | `enum` | NOT NULL | Transaction type: `'debit'` (money out) or `'credit'` (money in) |
| `description` | `text` | NULLABLE | Transaction description or notes |
| `date` | `timestamp` | NOT NULL | Transaction date |
| `account_id` | `text` | NOT NULL | Foreign key to `accounts.id` |
| `category_id` | `text` | NULLABLE | Foreign key to `categories.id` |
| `created_at` | `timestamp` | NULLABLE | Timestamp when the transaction was created |
| `updated_at` | `timestamp` | NULLABLE | Timestamp when the transaction was last updated |
| `deleted_at` | `timestamp` | NULLABLE | Timestamp when the transaction was soft-deleted (NULL if not deleted) |

**Relationships:**
- Many-to-one with `accounts` via `account_id`
  - Foreign key: `transactions.account_id` → `accounts.id`
  - On delete: CASCADE (deleting an account deletes all its transactions)
- Many-to-one with `categories` via `category_id`
  - Foreign key: `transactions.category_id` → `categories.id`
  - On delete: SET NULL (deleting a category sets transaction category to NULL)

**Indexes:**
- Primary key on `id`
- Foreign key indexes on `account_id` and `category_id`
- Consider indexing `date` for date range queries

---


## Entity Relationship Diagram (ERD)

```
┌─────────────┐
│  balances   │
├─────────────┤
│ id (PK)     │
│ account_id  │
│ balance     │
│ created_at  │
│ updated_at  │
└──────┬──────┘
       │
       │ N:1
       │
┌──────▼──────┐
│   accounts  │
├─────────────┤
│ id (PK)     │
│ name        │
│ user_id     │
│ balance_id  │──┐
│ created_at  │  │
│ updated_at  │  │
│ deleted_at  │  │
└──────┬──────┘  │
       │         │
       │ 1:N     │ 1:1 (current)
       │         │
       ▼         │
┌─────────────┐ │  ┌─────────────┐
│transactions │ │  │  categories │
├─────────────┤ │  ├─────────────┤
│ id (PK)     │ │  │ id (PK)     │
│ amount      │ │  │ name        │
│ type        │ │  │ user_id     │
│ description │ │  │ created_at  │
│ date        │ │  │ updated_at  │
│ account_id  │ │  │ deleted_at  │
│ category_id │ │  └──────┬──────┘
│ created_at  │ │         │
│ updated_at  │ │         │ N:1
│ deleted_at  │ │         │
└─────────────┘ │         │
                 │         ▼
                 │  (transactions.category_id)
                 │
                 └─── (accounts.balance_id → balances.id)
```

## Data Types

### `numeric(12, 2)`
- Used for: `balances.balance`, `transactions.amount`
- Precision: 12 digits total
- Scale: 2 decimal places
- Range: -999,999,999,999.99 to 999,999,999,999.99
- Suitable for financial amounts

### `text`
- Used for: IDs, names, user IDs, notes
- Variable-length string
- No length limit (PostgreSQL)

### `timestamp`
- Used for: `transactions.date`, `created_at`, `updated_at`, `deleted_at` columns
- Stores date and time
- For `transactions.date`: Mode: "date" (only date portion is used)
- For timestamp fields: Full timestamp with timezone

### `enum` (transaction_type)
- Used for: `transactions.type`
- Values: `'debit'` or `'credit'`
- `debit`: Money going out (expenses, withdrawals)
- `credit`: Money coming in (income, deposits)
- Note: `amount` field is always positive; use `type` to determine direction

## Foreign Key Constraints

1. **`balances.account_id` → `accounts.id`**
   - ON DELETE: CASCADE (or SET NULL, depending on implementation)
   - ON UPDATE: NO ACTION
   - Effect: Balance records are linked to accounts

2. **`accounts.balance_id` → `balances.id`**
   - ON DELETE: SET NULL (or CASCADE, depending on implementation)
   - ON UPDATE: NO ACTION
   - Effect: Account references its current balance record

3. **`transactions.account_id` → `accounts.id`**
   - ON DELETE: CASCADE
   - ON UPDATE: NO ACTION
   - Effect: Deleting an account automatically deletes all its transactions

4. **`transactions.category_id` → `categories.id`**
   - ON DELETE: SET NULL
   - ON UPDATE: NO ACTION
   - Effect: Deleting a category sets `category_id` to NULL in related transactions

## Common Query Patterns

### Get all transactions for a user
```sql
SELECT t.*, a.name as account_name, c.name as category_name
FROM transactions t
INNER JOIN accounts a ON t.account_id = a.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE a.user_id = $1
  AND t.deleted_at IS NULL
  AND a.deleted_at IS NULL;
```

### Get account balance summary
```sql
SELECT 
  a.id,
  a.name,
  b.balance as current_balance,
  SUM(t.amount) as transaction_total
FROM accounts a
LEFT JOIN balances b ON a.balance_id = b.id
LEFT JOIN transactions t ON a.id = t.account_id
  AND t.deleted_at IS NULL
WHERE a.user_id = $1
  AND a.deleted_at IS NULL
GROUP BY a.id, a.name, b.balance;
```

### Get balance history for an account
```sql
SELECT 
  b.balance,
  b.created_at as balance_date
FROM balances b
WHERE b.account_id = $1
ORDER BY b.created_at DESC;
```

### Get spending by category
```sql
SELECT 
  COALESCE(c.name, 'Not in a category') as category,
  SUM(t.amount) as total
FROM transactions t
INNER JOIN accounts a ON t.account_id = a.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE a.user_id = $1
  AND t.date >= $2
  AND t.date <= $3
  AND t.deleted_at IS NULL
  AND a.deleted_at IS NULL
  AND (c.deleted_at IS NULL OR c.id IS NULL)
GROUP BY t.category_id, c.name;
```

## Notes

- All tables use `text` type for primary keys (typically UUIDs or nanoid strings)
- User identification is done via `user_id` fields (Clerk user IDs)
- The `balances` table tracks historical account balances over time, allowing for balance history and snapshots
- The `accounts.balance_id` references the current/latest balance record in the `balances` table
- Most tables implement soft deletes using `deleted_at` timestamp (NULL = active, timestamp = deleted)
- Most tables include `created_at` and `updated_at` timestamps for audit tracking
- Transaction `amount` is always stored as a positive value; use the `type` field (`debit` or `credit`) to indicate direction
- `debit` = money out (expenses, withdrawals), `credit` = money in (income, deposits)
- Categories are optional for transactions (can be NULL)
- The `description` field in transactions replaces the previous `payee` and `notes` fields

