# Oovy & Ray’s Money — Data Model & Accounts Spec

**Version:** 1.0  
**Phase:** 1 — MVP  
**Last Updated:** May 2026  
**Status:** Approved for Development  
**Backend:** Supabase (PostgreSQL)

-----

## Table of Contents

1. [Overview](#1-overview)
1. [Account Model](#2-account-model)
1. [Transaction Model](#3-transaction-model)
1. [Recurring Schedule Model](#4-recurring-schedule-model)
1. [Review Model](#5-review-model)
1. [Settings Model](#6-settings-model)
1. [The External Account](#7-the-external-account)
1. [Full Database Schema](#8-full-database-schema)
1. [Supabase-Specific Implementation](#9-supabase-specific-implementation)
1. [Seed Data](#10-seed-data)

-----

## 1. Overview

### 1.1 Household Context

- Single household — Ray and Olivia
- All accounts are jointly owned regardless of name
- Account names are labels only — no individual ownership concept in Phase 1
- Single Supabase user — no multi-tenancy, no shared access in Phase 1

### 1.2 Currencies

- Two currencies only: **GBP (£)** and **NZD (NZ$)**
- Every account is denominated in exactly one currency — set at creation, never changed
- Exchange rate stored separately — used for display totals only
- NZD always displayed as `NZ$` — never bare `$`

### 1.3 Data Source of Truth

- Opening date: **1 August 2024**
- Seed source: `UK_BUDGET__-UK_BUDGET.csv`
- After import, the database is the sole source of truth

-----

## 2. Account Model

### 2.1 Account Types

|Type      |In Weekly Review|In Cash Balance|Description                                  |
|----------|----------------|---------------|---------------------------------------------|
|`CURRENT` |✓               |✓              |Day-to-day transactional accounts            |
|`SAVINGS` |✓               |✓              |Savings pots                                 |
|`CREDIT`  |✓               |✓              |Credit cards                                 |
|`DEBT`    |✓               |✓              |Money owed to the shared pot (positive value)|
|`TRACKING`|✗               |Toggle         |Purpose-built tracking accounts              |
|`EXTERNAL`|✗               |✗              |Virtual — money leaving/entering the system  |

### 2.2 Account Rules

**CURRENT / SAVINGS / CREDIT / DEBT:**

- Always included in Cash Balance total
- Always included in Weekly Review
- Always visible on home screen card stack

**TRACKING:**

- Never included in Weekly Review
- Cash Balance inclusion controlled by `include_in_cash_balance` toggle (per account)
- Created on demand by user
- Can be archived when purpose complete
- Examples: Monzo Student Loan, Investment principal, Holiday fund

**EXTERNAL:**

- System-level virtual account — one instance only
- Represents money outside the tracked system (salary in, bills out)
- Has no balance, no display, never shown to user
- Used as counterparty for all transactions that exit/enter the system

### 2.3 Production Account List

|# |Account Name         |Currency|Type    |Cash Balance|Review|Notes                                 |
|--|---------------------|--------|--------|------------|------|--------------------------------------|
|1 |Monzo General        |GBP     |CURRENT |✓           |✓     |Primary account                       |
|2 |Monzo Spending       |GBP     |CURRENT |✓           |✓     |Weekly spending pot                   |
|3 |Monzo Bills          |GBP     |CURRENT |✓           |✓     |Direct debits pot                     |
|4 |Monzo Rent + Expenses|GBP     |CURRENT |✓           |✓     |Rent holding account                  |
|5 |Monzo Savings        |GBP     |SAVINGS |✓           |✓     |Primary GBP savings                   |
|6 |Rent Deposit         |GBP     |SAVINGS |✓           |✓     |Rental deposit held                   |
|7 |Monzo NZ House       |GBP     |CURRENT |✓           |✓     |GBP side of NZ transfer               |
|8 |Monzo Student Loan   |GBP     |TRACKING|✓           |✗     |Student loan pot — toggle ON          |
|9 |Ray Revolut          |GBP     |CURRENT |✓           |✓     |GBP Revolut — transfer waypoint       |
|10|Olivia Revolut       |NZD     |CURRENT |✓           |✓     |NZD Revolut — transfer waypoint       |
|11|NZ Savings           |NZD     |SAVINGS |✓           |✓     |Primary NZD savings                   |
|12|NZ Credit Card       |NZD     |CREDIT  |✓           |✓     |NZD credit card                       |
|13|NZ House             |NZD     |CURRENT |✓           |✓     |Westpac NZD — mortgage funding account|
|14|Olivia Owed          |GBP     |DEBT    |✓           |✓     |Olivia owes shared pot                |
|15|Ray Owed             |GBP     |DEBT    |✓           |✓     |Ray owes shared pot                   |


> **NZ House note:** Pass-through transactional account in NZD. Receives transfers from Olivia Revolut. Mortgage payment exits system from here to External. Not a property asset — not related to house value.

> **Transfer chain for NZ mortgage:**  
> `Monzo General (GBP)` → `Ray Revolut (GBP)` → `Olivia Revolut (NZD)` → `NZ House (NZD)` → `External (mortgage exits)`  
> In the app, modelled as direct `Olivia Revolut → NZ House` — intermediate Revolut conversion not tracked step by step.

### 2.4 Account Schema

```sql
CREATE TYPE account_type AS ENUM (
  'CURRENT', 'SAVINGS', 'CREDIT', 'DEBT', 'TRACKING', 'EXTERNAL'
);

CREATE TYPE currency AS ENUM ('GBP', 'NZD');

CREATE TABLE accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  type                    account_type NOT NULL,
  currency                currency NOT NULL,
  include_in_cash_balance BOOLEAN NOT NULL DEFAULT true,
  include_in_review       BOOLEAN NOT NULL DEFAULT true,
  opening_balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  opening_date            DATE NOT NULL DEFAULT '2024-08-01',
  display_order           INTEGER NOT NULL DEFAULT 0,
  color_from              TEXT NOT NULL DEFAULT '#1a1a2e',  -- gradient start hex
  color_to                TEXT NOT NULL DEFAULT '#0f3460',  -- gradient end hex
  is_archived             BOOLEAN NOT NULL DEFAULT false,
  is_system               BOOLEAN NOT NULL DEFAULT false,   -- true for EXTERNAL only
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Constraints:**

- `include_in_cash_balance` and `include_in_review` are always `true` for CURRENT, SAVINGS, CREDIT, DEBT
- `include_in_cash_balance` and `include_in_review` are always `false` for EXTERNAL
- Only TRACKING accounts have user-controllable toggles
- `is_system = true` for the EXTERNAL account only — cannot be deleted or archived

-----

## 3. Transaction Model

### 3.1 Transaction Types

|Type                |Description                                      |Modifies Budget      |
|--------------------|-------------------------------------------------|---------------------|
|`TRANSFER`          |One-time movement between two accounts           |Yes — on its date    |
|`RECURRING_INSTANCE`|Generated instance of a recurring schedule       |Yes — on its date    |
|`ONE_OFF`           |Planned future single transaction                |Yes — on its date    |
|`ADJUSTMENT`        |Manual overspend DR to align Budget with reality |Yes — from its date  |
|`OPENING`           |Opening balance setter — system generated at seed|Yes — at opening date|

### 3.2 Transaction Direction

Every transaction has:

- A **From Account** — the account being debited (DR)
- A **To Account** — the account being credited (CR)
- An **Amount** — always a positive decimal

Direction is determined entirely by which account you’re viewing:

- If you are the From Account → this is a **DR** → display as `(£200.00)`
- If you are the To Account → this is a **CR** → display as `£200.00`

> **There is no separate DR/CR field on the transaction itself — direction is always relative to the viewing account.**

### 3.3 Cross-Currency Transaction

When From and To accounts are in different currencies, two amounts are stored:

```
amount_from    DECIMAL(12,2)   -- in From account currency (GBP)
amount_to      DECIMAL(12,2)   -- in To account currency (NZD)
```

Single-currency transactions: `amount_from = amount_to`, `currency_from = currency_to`

### 3.4 Transaction Schema

```sql
CREATE TYPE transaction_type AS ENUM (
  'TRANSFER', 'RECURRING_INSTANCE', 'ONE_OFF', 'ADJUSTMENT', 'OPENING'
);

CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT,                          -- nullable, "Untitled" shown if null
  type                transaction_type NOT NULL,
  from_account_id     UUID NOT NULL REFERENCES accounts(id),
  to_account_id       UUID NOT NULL REFERENCES accounts(id),
  amount_from         DECIMAL(12,2) NOT NULL,        -- in from_account currency
  amount_to           DECIMAL(12,2) NOT NULL,        -- in to_account currency
  currency_from       currency NOT NULL,
  currency_to         currency NOT NULL,
  transaction_date    DATE NOT NULL,
  recurring_id        UUID REFERENCES recurring_schedules(id),  -- null if not recurring
  is_adjustment       BOOLEAN NOT NULL DEFAULT false,
  note                TEXT,                          -- optional free text
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id),
  CONSTRAINT positive_amounts CHECK (amount_from > 0 AND amount_to > 0)
);

-- Index for fast balance calculation queries
CREATE INDEX idx_transactions_from_account_date 
  ON transactions(from_account_id, transaction_date);

CREATE INDEX idx_transactions_to_account_date 
  ON transactions(to_account_id, transaction_date);

CREATE INDEX idx_transactions_date 
  ON transactions(transaction_date);
```

-----

## 4. Recurring Schedule Model

### 4.1 Frequency Types

```sql
CREATE TYPE frequency AS ENUM (
  'WEEKLY',
  'FORTNIGHTLY', 
  'MONTHLY',
  'QUARTERLY',
  'BIANNUAL'
);
```

### 4.2 Amount Versioning

Recurring transactions support amount changes from a specific effective date. The full change history is stored as a JSONB array:

```json
effective_changes: [
  { "from_date": "2024-08-01", "amount_from": 1800.00, "amount_to": 1800.00 },
  { "from_date": "2026-07-01", "amount_from": 1900.00, "amount_to": 1900.00 }
]
```

**Resolution:** For any date, use the record with the largest `from_date` ≤ target date.

### 4.3 Recurring Schedule Schema

```sql
CREATE TABLE recurring_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT,                          -- nullable
  from_account_id     UUID NOT NULL REFERENCES accounts(id),
  to_account_id       UUID NOT NULL REFERENCES accounts(id),
  currency_from       currency NOT NULL,
  currency_to         currency NOT NULL,
  frequency           frequency NOT NULL,
  day_of_week         SMALLINT,                      -- 0=Sun,1=Mon...6=Sat (WEEKLY only)
  day_of_month        SMALLINT,                      -- 1-31 (MONTHLY/QUARTERLY/BIANNUAL)
  weekday_only        BOOLEAN NOT NULL DEFAULT false, -- if true, move to Friday before weekend
  start_date          DATE NOT NULL,
  end_date            DATE,                          -- null = no end
  effective_changes   JSONB NOT NULL DEFAULT '[]',   -- amount version history
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skipped occurrences (single-instance delete)
CREATE TABLE recurring_skips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id        UUID NOT NULL REFERENCES recurring_schedules(id),
  skip_date           DATE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recurring_id, skip_date)
);

-- Single-instance overrides (edit this occurrence only)
CREATE TABLE recurring_overrides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id        UUID NOT NULL REFERENCES recurring_schedules(id),
  original_date       DATE NOT NULL,
  override_date       DATE NOT NULL,
  amount_from         DECIMAL(12,2) NOT NULL,
  amount_to           DECIMAL(12,2) NOT NULL,
  name                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recurring_id, original_date)
);
```

### 4.4 Recurring Transaction Generation

Recurring transactions are **not pre-generated** into the transactions table. They are **calculated on the fly** when the Budget formula runs, using the recurring_schedules table.

This means:

- No background jobs needed to generate future transactions
- No stale data — every calculation uses live schedule rules
- Adding/editing/deleting a schedule immediately affects all future Budget calculations
- The iPad grid and iPhone timeline both read from the same real-time calculation

> **Exception:** `RECURRING_INSTANCE` records may be written to the transactions table for **past dates only** (historical record keeping from CSV seed). Future occurrences are always computed dynamically.

-----

## 5. Review Model

### 5.1 Review Rules

- One review per calendar date maximum
- Cannot backdate before the previous review date
- Tracking accounts excluded from all reviews
- Skipped accounts retain their previous actual balance

### 5.2 Review Schema

```sql
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date     DATE NOT NULL UNIQUE,              -- one review per date
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           UUID NOT NULL REFERENCES reviews(id),
  account_id          UUID NOT NULL REFERENCES accounts(id),
  actual_balance      DECIMAL(12,2),                 -- null if skipped
  budget_balance      DECIMAL(12,2) NOT NULL,        -- snapshot at review time
  variance            DECIMAL(12,2),                 -- null if skipped
  was_skipped         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, account_id)
);
```

> **budget_balance is snapshotted** at review time. If the Budget is subsequently amended, historical review records remain accurate to what the Budget said at that time.

-----

## 6. Settings Model

```sql
CREATE TABLE settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_target_date       DATE,                    -- Review Summary projection date
  budget_comparison_date    DATE,                    -- null = use today
  exchange_rate_gbp_nzd     DECIMAL(10,6) NOT NULL DEFAULT 2.220000,
  exchange_rate_auto_fetch  BOOLEAN NOT NULL DEFAULT false,
  exchange_rate_updated_at  TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Settings reference:**

|Setting                   |Default             |Description                                       |
|--------------------------|--------------------|--------------------------------------------------|
|`summary_target_date`     |null (user must set)|Date used for Review Summary forward projection   |
|`budget_comparison_date`  |null → today        |Date used for Budget vs Actual comparison on cards|
|`exchange_rate_gbp_nzd`   |2.220000            |1 GBP = X NZD                                     |
|`exchange_rate_auto_fetch`|false               |Fetch rate daily from frankfurter.app             |

-----

## 7. The External Account

### 7.1 Definition

A single system-level virtual account representing all money flows outside the tracked system.

### 7.2 When External is Used

|Scenario             |From         |To           |
|---------------------|-------------|-------------|
|Salary received      |External     |Monzo General|
|Rent paid to landlord|Monzo General|External     |
|Subscription charged |Monzo General|External     |
|NZ mortgage payment  |NZ House     |External     |
|Any bill payment     |Any account  |External     |

### 7.3 Properties

- `id`: fixed UUID — set at seed time, referenced everywhere
- `name`: “External”
- `type`: EXTERNAL
- `is_system`: true — cannot be deleted, archived, or edited
- Never shown in UI
- Never included in any balance calculation
- Never appears in Weekly Review
- Has no opening balance

-----

## 8. Full Database Schema

### 8.1 Complete Schema (ordered by dependency)

```sql
-- 1. Enums
CREATE TYPE account_type AS ENUM ('CURRENT','SAVINGS','CREDIT','DEBT','TRACKING','EXTERNAL');
CREATE TYPE currency AS ENUM ('GBP','NZD');
CREATE TYPE transaction_type AS ENUM ('TRANSFER','RECURRING_INSTANCE','ONE_OFF','ADJUSTMENT','OPENING');
CREATE TYPE frequency AS ENUM ('WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','BIANNUAL');

-- 2. Accounts
CREATE TABLE accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  type                    account_type NOT NULL,
  currency                currency NOT NULL,
  include_in_cash_balance BOOLEAN NOT NULL DEFAULT true,
  include_in_review       BOOLEAN NOT NULL DEFAULT true,
  opening_balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  opening_date            DATE NOT NULL DEFAULT '2024-08-01',
  display_order           INTEGER NOT NULL DEFAULT 0,
  color_from              TEXT NOT NULL DEFAULT '#1a1a2e',
  color_to                TEXT NOT NULL DEFAULT '#0f3460',
  is_archived             BOOLEAN NOT NULL DEFAULT false,
  is_system               BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Recurring Schedules
CREATE TABLE recurring_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT,
  from_account_id     UUID NOT NULL REFERENCES accounts(id),
  to_account_id       UUID NOT NULL REFERENCES accounts(id),
  currency_from       currency NOT NULL,
  currency_to         currency NOT NULL,
  frequency           frequency NOT NULL,
  day_of_week         SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month        SMALLINT CHECK (day_of_month BETWEEN 1 AND 31),
  weekday_only        BOOLEAN NOT NULL DEFAULT false,
  start_date          DATE NOT NULL,
  end_date            DATE,
  effective_changes   JSONB NOT NULL DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Recurring Skips
CREATE TABLE recurring_skips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id    UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  skip_date       DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recurring_id, skip_date)
);

-- 5. Recurring Overrides
CREATE TABLE recurring_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id    UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  original_date   DATE NOT NULL,
  override_date   DATE NOT NULL,
  amount_from     DECIMAL(12,2) NOT NULL,
  amount_to       DECIMAL(12,2) NOT NULL,
  name            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recurring_id, original_date)
);

-- 6. Transactions
CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT,
  type                transaction_type NOT NULL,
  from_account_id     UUID NOT NULL REFERENCES accounts(id),
  to_account_id       UUID NOT NULL REFERENCES accounts(id),
  amount_from         DECIMAL(12,2) NOT NULL,
  amount_to           DECIMAL(12,2) NOT NULL,
  currency_from       currency NOT NULL,
  currency_to         currency NOT NULL,
  transaction_date    DATE NOT NULL,
  recurring_id        UUID REFERENCES recurring_schedules(id),
  is_adjustment       BOOLEAN NOT NULL DEFAULT false,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id),
  CONSTRAINT positive_amounts CHECK (amount_from > 0 AND amount_to > 0)
);

CREATE INDEX idx_tx_from_date ON transactions(from_account_id, transaction_date);
CREATE INDEX idx_tx_to_date ON transactions(to_account_id, transaction_date);
CREATE INDEX idx_tx_date ON transactions(transaction_date);
CREATE INDEX idx_tx_recurring ON transactions(recurring_id) WHERE recurring_id IS NOT NULL;

-- 7. Reviews
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date     DATE NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Review Entries
CREATE TABLE review_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  account_id          UUID NOT NULL REFERENCES accounts(id),
  actual_balance      DECIMAL(12,2),
  budget_balance      DECIMAL(12,2) NOT NULL,
  variance            DECIMAL(12,2),
  was_skipped         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, account_id)
);

-- 9. Settings (single row)
CREATE TABLE settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_target_date       DATE,
  budget_comparison_date    DATE,
  exchange_rate_gbp_nzd     DECIMAL(10,6) NOT NULL DEFAULT 2.220000,
  exchange_rate_auto_fetch  BOOLEAN NOT NULL DEFAULT false,
  exchange_rate_updated_at  TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

-----

## 9. Supabase-Specific Implementation

### 9.1 Auth

- Single user — Supabase Auth with email/password
- All tables protected by Row Level Security (RLS)
- All policies: `auth.uid() = [owner_id]` — single user so this is a simple guard

### 9.2 Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_skips ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Single user: allow all operations for authenticated user
CREATE POLICY "allow_all_authenticated" ON accounts
  FOR ALL USING (auth.role() = 'authenticated');
-- (repeat for all tables)
```

### 9.3 Realtime

Enable Supabase Realtime on:

- `transactions` — iPad grid updates instantly when iPhone logs a transfer
- `reviews` — review completion propagates to all open views
- `settings` — exchange rate updates propagate immediately

### 9.4 Database Functions

**Budget calculation function (PostgreSQL):**

```sql
-- Calculate Budget balance for an account on a given date
-- Called from application layer — not used directly in queries
CREATE OR REPLACE FUNCTION calculate_budget(
  p_account_id UUID,
  p_date DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_opening_balance DECIMAL;
  v_cr_sum DECIMAL;
  v_dr_sum DECIMAL;
BEGIN
  -- Get opening balance
  SELECT opening_balance INTO v_opening_balance
  FROM accounts WHERE id = p_account_id;

  -- Sum all CRs up to date (from transactions table — historical only)
  SELECT COALESCE(SUM(amount_to), 0) INTO v_cr_sum
  FROM transactions
  WHERE to_account_id = p_account_id
    AND transaction_date <= p_date;

  -- Sum all DRs up to date (from transactions table — historical only)
  SELECT COALESCE(SUM(amount_from), 0) INTO v_dr_sum
  FROM transactions
  WHERE from_account_id = p_account_id
    AND transaction_date <= p_date;

  -- Note: recurring future transactions calculated in application layer
  RETURN v_opening_balance + v_cr_sum - v_dr_sum;
END;
$$ LANGUAGE plpgsql;
```

> **Note:** Future recurring transactions are calculated in the **application layer** (TypeScript/Next.js), not in PostgreSQL. The DB function handles historical transactions only. This keeps the recurring schedule logic in one place and avoids complex SQL for date arithmetic.

-----

## 10. Seed Data

### 10.1 Seed Order

1. Insert EXTERNAL system account
1. Insert all 15 user accounts with opening balances from CSV
1. Insert all recurring schedules from CSV
1. Insert historical transactions from CSV (Aug 2024 → today)
1. Insert initial settings row (exchange rate, no target date set)

### 10.2 Recurring Schedules to Seed

|Name              |From         |To            |Amount   |Frequency  |Day   |Weekday Only|
|------------------|-------------|--------------|---------|-----------|------|------------|
|YouTube           |Monzo General|External      |£22.99   |MONTHLY    |15th  |false       |
|Apple One         |Monzo General|External      |£33.94   |MONTHLY    |30th  |false       |
|Monzo Premium     |Monzo General|External      |£34.00   |MONTHLY    |30th  |false       |
|Disney+           |Monzo General|External      |£9.68    |MONTHLY    |16th  |false       |
|Amazon Prime      |Monzo General|External      |£8.99    |MONTHLY    |24th  |false       |
|Phone Plan        |Monzo General|External      |£30.00   |MONTHLY    |16th  |false       |
|Oura Ring         |Monzo General|External      |£5.50    |MONTHLY    |30th  |false       |
|Contents Insurance|Monzo General|External      |£25.14   |MONTHLY    |30th  |false       |
|Weekly Spending   |Monzo General|Monzo Spending|£200.00  |WEEKLY     |Monday|false       |
|Rent              |Monzo General|External      |£1,800.00|MONTHLY    |TBC   |false       |
|Utilities         |Monzo General|External      |£125.00  |MONTHLY    |TBC   |false       |
|Council Tax       |Monzo General|External      |£125.00  |MONTHLY    |TBC   |false       |
|Rental Top-Up     |Monzo General|External      |£900.00  |MONTHLY    |TBC   |false       |
|NZ Mortgage       |NZ House     |External      |TBC      |FORTNIGHTLY|TBC   |false       |


> **TBC items:** Exact day-of-month for rent/utilities/council tax/rental top-up and NZ mortgage amount/date to be confirmed from full CSV analysis at build time.

### 10.3 First Launch Checklist

- [ ] EXTERNAL account seeded with `is_system = true`
- [ ] All 15 accounts seeded with opening balances
- [ ] All recurring schedules seeded from CSV
- [ ] Historical transactions imported from CSV
- [ ] Settings row created with default exchange rate
- [ ] User prompted to set `summary_target_date` on first launch
- [ ] User prompted to verify exchange rate on first launch

-----

*End of Data Model & Accounts Spec v1.0*  
*Next: UX Flow Spec v2 (full rewrite incorporating all decisions)*