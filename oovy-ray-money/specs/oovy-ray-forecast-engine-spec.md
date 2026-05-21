# Oovy & Ray’s Money — Forecast Calculation Engine Spec

**Version:** 1.0  
**Phase:** 1 — MVP  
**Last Updated:** May 2026  
**Status:** Approved for Development

-----

## Table of Contents

1. [Core Principles](#1-core-principles)
1. [The Three Values](#2-the-three-values)
1. [The Budget Formula](#3-the-budget-formula)
1. [Opening Balances & Seed Data](#4-opening-balances--seed-data)
1. [Transaction Engine](#5-transaction-engine)
1. [Recurring Transaction Rules](#6-recurring-transaction-rules)
1. [Recalculation Triggers](#7-recalculation-triggers)
1. [Multi-Currency Handling](#8-multi-currency-handling)
1. [Weekly Review — Comparison Engine](#9-weekly-review--comparison-engine)
1. [Display Rules](#10-display-rules)
1. [Edge Cases & Guards](#11-edge-cases--guards)

-----

## 1. Core Principles

### 1.1 The Budget Line

> **The Budget is a pure mathematical projection. It models perfect execution of all planned transactions from the opening balance date forward. It never auto-adjusts based on actual behaviour. It is only changed by explicit user action.**

### 1.2 The Golden Rules

1. The Budget line is sacred — it only changes when the user adds, edits, or deletes a transaction
1. The Weekly Review **never modifies** the Budget line
1. Actual balances are compared against the Budget for information only
1. If the user wants to adjust the Budget to reflect reality, they add an **overspend DR transaction** manually
1. Cash Balance always shows **real money** — the last manually entered actual balance
1. There is no automatic reconciliation — ever

### 1.3 Data Source of Truth

- **Opening date:** August 2024
- **Source:** `UK_BUDGET__-UK_BUDGET.csv`
- All opening balances, recurring transactions, and historical entries are seeded from this file
- After import, the CSV has no further role — the database is the source of truth

-----

## 2. The Three Values

Every account, on every date, has exactly three values:

|Value       |Definition                                           |Source                                                      |
|------------|-----------------------------------------------------|------------------------------------------------------------|
|**Budget**  |What the plan says the balance should be on this date|Calculated from opening balance + all scheduled transactions|
|**Actual**  |The last manually entered real balance               |Set during Weekly Review or manual card update              |
|**Variance**|Actual minus Budget                                  |Derived: `Actual - Budget`                                  |

### 2.1 Variance Display Convention

```
Actual > Budget  →  +£260      ← ahead of plan (plain with + prefix)
Actual < Budget  →  (£260)     ← behind plan (bracket notation)
Actual = Budget  →  £0.00      ← exactly on plan
```

No colour coding. No good/bad signal. Purely informational.

### 2.2 Where These Values Appear

**Home Screen (aggregate):**

```
Cash Balance     £11,502    ← sum of all actual balances (GBP + NZD converted)
Budget           £11,762    ← sum of all budget balances (GBP + NZD converted)
Variance           (£260)   ← Cash Balance minus Budget
```

**Account Card (per account):**

```
Monzo General        £2,340   ← Actual (last updated balance, top right)
Budget today:        £2,600   ← Budget calculated to comparison date
Variance:             (£260)  ← Actual minus Budget
Updated: 17 May              ← date of last actual entry
```

**iPad Grid Cell:**

- Each cell shows the **Budget** balance for that account on that date
- Today’s row shows all three values in a summary strip below the grid

-----

## 3. The Budget Formula

### 3.1 Core Formula

For any account on any date:

```
Budget(account, date) =
  OpeningBalance(account, opening_date)
  + SUM( CR transactions where date <= [date] AND account = To_Account )
  - SUM( DR transactions where date <= [date] AND account = From_Account )
```

Where transactions include:

- All **recurring transactions** that fall on or before `[date]`
- All **planned one-off transactions** on or before `[date]`
- All **manual adjustment transactions** (overspend DRs) on or before `[date]`
- All **ad-hoc transfers** logged by the user on or before `[date]`

### 3.2 Running Balance Calculation

The Budget is computed as a **running balance** — each day’s value depends only on the previous day plus any transactions on that day:

```
Budget(account, date) = Budget(account, date - 1)
  + SUM( CR transactions on [date] for this account )
  - SUM( DR transactions on [date] for this account )
```

This is equivalent to 3.1 but is the preferred implementation approach for performance.

### 3.3 What Does NOT Affect the Budget

- Weekly Review entries — never modify the Budget
- Exchange rate changes — only affect display conversion, not stored values
- Skipped review accounts — no effect on Budget
- Actual balances — purely for comparison, never fed back into Budget

-----

## 4. Opening Balances & Seed Data

### 4.1 Opening Date

- **1 August 2024** — all accounts start from this date
- Opening balance for each account is the balance recorded in the CSV for that date

### 4.2 Seed Data from CSV

The following data is imported from `UK_BUDGET__-UK_BUDGET.csv`:

**Recurring Transactions (as seeded):**

|Name              |Amount     |Frequency|From Account |To Account    |Day/Date|
|------------------|-----------|---------|-------------|--------------|--------|
|YouTube           |£22.99     |Monthly  |Monzo General|External      |15th    |
|Apple One         |£33.94     |Monthly  |Monzo General|External      |30th    |
|Monzo Premium     |£34.00     |Monthly  |Monzo General|External      |30th    |
|Disney+           |£9.68      |Monthly  |Monzo General|External      |16th    |
|Amazon Prime      |£8.99      |Monthly  |Monzo General|External      |24th    |
|Phone Plan        |£30.00     |Monthly  |Monzo General|External      |16th    |
|Oura Ring         |£5.50      |Monthly  |Monzo General|External      |30th    |
|Contents Insurance|£25.14     |Monthly  |Monzo General|External      |30th    |
|Weekly Spending   |£200.00    |Weekly   |Monzo General|Monzo Spending|Monday  |
|Rent              |£1,800.00  |Monthly  |Monzo General|External      |TBC     |
|Utilities         |£125.00    |Monthly  |Monzo General|External      |TBC     |
|Council Tax       |£125.00    |Monthly  |Monzo General|External      |TBC     |
|Rental Top-Up     |£900.00    |Monthly  |Monzo General|External      |TBC     |
|NZ Mortgage       |Fortnightly|NZ House |External     |Fortnightly   |TBC     |


> **Note:** “External” means money exits or enters the tracked account system entirely. It is a virtual account — not tracked, not shown, not included in Cash Balance.

### 4.3 Opening Balance Import Rules

- Each account’s opening balance is set as at **1 August 2024**
- All recurring transactions are backdated to their first occurrence on or after 1 August 2024
- Historical data from CSV populates the transaction ledger through to the current date
- After import, all future dates are projected by the Budget formula

### 4.4 The External Account

- A virtual account representing money outside the tracked system
- Used as the To/From for salary income, bill payments, subscription charges
- Has no balance, no display, not included in any totals
- Every transaction that exits the system uses External as the counterparty

-----

## 5. Transaction Engine

### 5.1 Transaction Types

|Type             |Description                                             |Affects Budget              |
|-----------------|--------------------------------------------------------|----------------------------|
|Recurring        |Scheduled, repeating — seeded from CSV or added by user |Yes — all future occurrences|
|Planned One-off  |Single future date, manually added                      |Yes — on its date only      |
|Ad-hoc Transfer  |One-time movement between accounts, any date            |Yes — on its date           |
|Manual Adjustment|Overspend DR — used to bring Budget in line with reality|Yes — from its date forward |
|Salary / Income  |Recurring CR from External into an account              |Yes — all future occurrences|

### 5.2 Transaction Data Model

Every transaction record stores:

```
transaction {
  id                  uuid
  name                string (nullable — "Untitled" if null)
  type                enum: CR | DR
  amount              decimal (always positive — type determines direction)
  currency            enum: GBP | NZD
  from_account_id     uuid (references accounts — or "external")
  to_account_id       uuid (references accounts — or "external")
  date                date
  is_recurring        boolean
  recurring_id        uuid (nullable — links to recurring_schedule)
  is_adjustment       boolean (true for manual overspend adjustments)
  created_at          timestamp
  updated_at          timestamp
}
```

### 5.3 Recurring Schedule Data Model

```
recurring_schedule {
  id                  uuid
  name                string (nullable)
  type                enum: CR | DR
  base_amount         decimal
  currency            enum: GBP | NZD
  from_account_id     uuid
  to_account_id       uuid
  frequency           enum: WEEKLY | FORTNIGHTLY | MONTHLY | QUARTERLY | BIANNUAL
  day_of_week         integer (0-6, nullable — for WEEKLY)
  day_of_month        integer (1-31, nullable — for MONTHLY etc.)
  start_date          date
  weekday_only        boolean (default false)
  effective_changes   array of { from_date, amount } ← version history
  created_at          timestamp
  updated_at          timestamp
}
```

### 5.4 Amount Versioning on Recurring Transactions

When a recurring transaction amount (or any field) is edited, the user specifies an **effective from date:**

```
effective_changes: [
  { from_date: "2024-08-01", amount: 1800.00 },  ← original
  { from_date: "2026-07-01", amount: 1900.00 }   ← updated from July 2026
]
```

**Resolution rule:**

> For any date, use the `amount` from the `effective_change` record with the largest `from_date` that is still ≤ the target date.

This means:

- Pre-July 2026 occurrences: £1,800
- July 2026 onwards: £1,900
- Historical data is never retroactively changed

-----

## 6. Recurring Transaction Rules

### 6.1 Frequency Definitions

|Frequency  |Rule                                                                                          |
|-----------|----------------------------------------------------------------------------------------------|
|Weekly     |Same day of week every week (e.g. every Monday)                                               |
|Fortnightly|Every 14 days from start date                                                                 |
|Monthly    |Same day of month (e.g. every 30th). If month has fewer days (e.g. Feb), use last day of month|
|Quarterly  |Every 3 months on same day (e.g. 1st Jan, 1st Apr, 1st Jul, 1st Oct)                          |
|Biannual   |Every 6 months on same day                                                                    |

### 6.2 Weekend / Bank Holiday Rule

Each recurring transaction has a **`weekday_only`** toggle:

```
weekday_only = false (default)
→ Transaction falls exactly on its scheduled date regardless of day
→ Used for: direct debits, standing orders, subscriptions (take on the date regardless)

weekday_only = true
→ If scheduled date falls on Saturday or Sunday, move to the FRIDAY BEFORE
→ Never move forward to Monday
→ Bank holidays: treated the same as weekends — move to Friday before
→ Used for: salary payments, manual transfers where you need funds available
```

**Examples:**

```
Monthly on 30th, weekday_only = true:
  30 Aug 2025 (Saturday) → 29 Aug 2025 (Friday) ✓
  30 Sep 2025 (Tuesday)  → 30 Sep 2025 (Tuesday) ✓ (no change needed)
  30 Nov 2025 (Sunday)   → 28 Nov 2025 (Friday) ✓
```

### 6.3 Editing Recurring Transactions

**Three edit scopes:**

|Scope                 |Behaviour                                                                            |
|----------------------|-------------------------------------------------------------------------------------|
|This occurrence only  |Creates a one-off override for this date. All other occurrences unchanged.           |
|All future occurrences|Applies change from a user-specified effective date forward. Past occurrences frozen.|
|Full series (all)     |Retroactively changes all occurrences including history. Use with caution.           |

**Effective date prompt (for “all future occurrences”):**

```
Apply changes from:  [1 July 2026  ›]
                     ↑ user picks — defaults to next occurrence
```

**Recalculation after edit:**

- Budget recalculates for all affected accounts from the effective date forward
- Must complete within the same render cycle — no loading states

### 6.4 Deleting Recurring Transactions

Same three scopes as editing:

- **This occurrence only:** Creates a skip for this date. Series continues.
- **All future occurrences from [date]:** Sets an end date on the series.
- **Full series:** Removes all occurrences including history.

-----

## 7. Recalculation Triggers

The Budget recalculates **immediately and synchronously** whenever:

|Trigger                  |Recalculation Scope                                       |
|-------------------------|----------------------------------------------------------|
|Add any transaction      |From transaction date forward, all affected accounts      |
|Edit any transaction     |From earliest affected date forward, all affected accounts|
|Delete any transaction   |From transaction date forward, all affected accounts      |
|Add recurring transaction|From series start date forward, affected accounts         |
|Edit recurring (future)  |From effective date forward, affected accounts            |
|Edit recurring (all)     |From series start date forward, affected accounts         |
|Delete recurring series  |From series start date forward, affected accounts         |
|Opening balance change   |Full recalculation from opening date, that account        |
|Exchange rate change     |Display recalculation only — no stored values change      |

**Performance requirement:**

- All recalculations must feel instant to the user
- No loading spinners for standard operations
- Grid, cards, and totals all update in the same render cycle

-----

## 8. Multi-Currency Handling

### 8.1 Currency Rules

- Every account is denominated in either **GBP** or **NZD** — set at account creation, never changed
- Every transaction operates in the currency of its **From account**
- Cross-currency transfers require **two amount fields** — one per currency — entered manually by the user
- The app **never auto-converts** transaction amounts
- Exchange rate is used **only** for display purposes (Cash Balance totals, Budget totals, Variance totals)

### 8.2 Cross-Currency Transfer

When From and To accounts are in different currencies:

```
transfer {
  from_account:   Ray Revolut (GBP)
  to_account:     Olivia Revolut (NZD)
  amount_out:     £450.00      ← debits Ray Revolut in GBP
  amount_in:      NZ$950.00    ← credits Olivia Revolut in NZD
}
```

Each side is stored and applied independently:

- Ray Revolut Budget: `- £450.00` on transaction date
- Olivia Revolut Budget: `+ NZ$950.00` on transaction date
- Implied rate is not stored

### 8.3 Exchange Rate

```
exchange_rate {
  gbp_to_nzd:     2.22          ← 1 GBP = 2.22 NZD
  source:         manual | auto
  last_updated:   timestamp
}
```

**Used for:**

- Converting NZD account balances to GBP equivalent for Cash Balance total
- Converting NZD Budget to GBP equivalent for Budget total
- Converting NZD Variance to GBP equivalent for Variance total

**Formula for GBP-equivalent totals:**

```
Total Cash Balance (GBP) =
  SUM( Actual(account) for all GBP accounts )
  + SUM( Actual(account) / gbp_to_nzd for all NZD accounts )

Total Budget (GBP) =
  SUM( Budget(account, today) for all GBP accounts )
  + SUM( Budget(account, today) / gbp_to_nzd for all NZD accounts )

Total Variance (GBP) = Total Cash Balance - Total Budget
```

**Auto-fetch (optional):**

- Free API: `frankfurter.app` — no key required
- Endpoint: `https://api.frankfurter.app/latest?from=GBP&to=NZD`
- Fetched daily on app open if auto-fetch is enabled
- Falls back to last stored rate if fetch fails

### 8.4 NZD Display

- NZD amounts always prefixed `NZ$` — never bare `$`
- NZD totals shown separately on home screen alongside GBP totals
- iPad bottom bar shows both currency totals independently

-----

## 9. Weekly Review — Comparison Engine

### 9.1 What the Review Does

The Weekly Review is a **comparison and snapshot tool only.** It:

- Captures the actual balance of each account on the review date
- Compares actual balance to Budget balance on that date
- Shows the variance
- Displays a forward projection to the user-defined target date

**It does NOT:**

- Modify the Budget in any way
- Auto-adjust future forecasts
- Create any transactions automatically

### 9.2 Comparison Formula

On the review date, for each account:

```
Budget(account, review_date)    ← calculated by Budget formula
Actual(account, review_date)    ← entered by user during review
Variance                        = Actual - Budget

Positive variance (+£260):  Actual > Budget  → ahead of plan
Negative variance (£260):   Actual < Budget  → behind plan
```

### 9.3 Review Data Model

```
review {
  id              uuid
  review_date     date          ← date of review (user-confirmed, can be backdated)
  created_at      timestamp
}

review_entry {
  id              uuid
  review_id       uuid
  account_id      uuid
  actual_balance  decimal
  budget_balance  decimal       ← snapshot of Budget at review_date (stored for history)
  variance        decimal       ← actual_balance - budget_balance (stored for history)
  was_skipped     boolean
}
```

> **Note:** `budget_balance` is snapshotted at review time and stored. This means historical review records are preserved even if the Budget is subsequently amended.

### 9.4 Adjusting the Budget After a Review

If the user wants to bring the Budget in line with reality after a review:

1. User sees variance: `(£260)` — behind budget
1. User decides to acknowledge the overspend
1. User adds a **Manual Adjustment DR transaction** for `£260` on the review date from the relevant account to External
1. Budget recalculates — new Budget balance matches actual
1. Variance on next review: `£0.00`

This is always a deliberate, explicit user action — never automatic.

### 9.5 Budget Comparison Date (Settings)

The date used for the Budget comparison on cards and the home screen:

```
Settings → Budget Comparison Date
  Options:
    - Today (default)
    - Custom date (user picks)
```

This controls:

- The “Budget today” figure on each account card
- The Budget total on the home screen
- The Variance figure on the home screen

-----

## 10. Display Rules

### 10.1 Home Screen

```
Oovy & Ray's Money                     [+][⋯]

Cash Balance        £11,502            ← SUM of all actual balances (GBP equivalent)
Budget              £11,762            ← SUM of all Budget balances at comparison date
Variance              (£260)           ← Cash Balance minus Budget

[Account cards below...]
```

### 10.2 Account Card

```
┌──────────────────────────────────────┐
│ Monzo General              £2,340.00 │  ← Actual (last entered)
│ Budget:   £2,600.00                  │  ← Budget at comparison date
│ Variance:   (£260.00)                │  ← Actual minus Budget
│ Updated: 17 May                      │  ← Date of last actual entry
│ Expected today: £1,340.00            │  ← Budget calculated to today
└──────────────────────────────────────┘
```

> **Note:** “Expected today” is always the Budget for today’s date regardless of the comparison date setting. It answers “what does the plan say this account has right now?”

### 10.3 iPad Grid

- Every cell shows the **Budget** balance for that account on that date
- Today’s row shows Budget values in full brightness
- A summary strip below the grid (or in the bottom bar) shows for today:
  
  ```
  Cash Balance: £11,502  |  Budget: £11,762  |  Variance: (£260)
  ```

### 10.4 Weekly Review Summary Screen

```
Review Complete  ✓
Projected at 15 June 2026        ← user-defined target date

SAVINGS ACCOUNTS
Monzo Savings        £3,720  →  £4,520    ← actual today → Budget at target date
Rent Deposit         £1,746  →  £1,746
NZ Savings      NZ$10,000  →  NZ$11,400

CASH BALANCE
Total GBP           £11,502  →  £13,100
Total NZD          NZ$25,560  →  NZ$29,100
```

> **Projection = Budget formula applied to target date using current opening balances and all scheduled transactions.** Not the actual. The plan.

-----

## 11. Edge Cases & Guards

|Scenario                                                         |Behaviour                                                                  |
|-----------------------------------------------------------------|---------------------------------------------------------------------------|
|Recurring transaction on 31st in a month with 30 days            |Use last day of month (30th)                                               |
|Recurring transaction on 29th Feb in a non-leap year             |Use 28th Feb                                                               |
|`weekday_only = true` and Friday is a bank holiday               |Move to Thursday before                                                    |
|Exchange rate not set                                            |Default to 1.00 — user alerted to set rate on first launch                 |
|Exchange rate fetch fails (auto mode)                            |Use last stored rate silently — no error shown                             |
|Opening balance not set for an account                           |Account shows £0.00 — user prompted to set on first launch                 |
|Manual adjustment DR larger than account balance                 |Allowed — account can go negative in Budget. No guard.                     |
|Two transactions on same account on same date                    |Both applied — order within day is CR first, then DR                       |
|Edit recurring transaction with no future occurrences            |Edit applies to historical records only — user warned                      |
|Delete all occurrences of a recurring transaction                |Confirmation required — “This will remove all history for this transaction”|
|Backdate a transaction before opening date (Aug 2024)            |Not permitted — date picker restricts to opening date or later             |
|Review entry on a date with no Budget data                       |Budget snapshot stored as £0.00 for that account                           |
|Cross-currency transaction with mismatched amounts               |No validation — user is responsible for accuracy                           |
|Account archived mid-series (recurring transaction references it)|Recurring transaction paused — user notified to update accounts            |

-----

*End of Forecast Calculation Engine Spec v1.0*  
*Next section: Database Schema Spec*