# Oovy & Ray’s Money — Technical Stack & Architecture Spec

**Version:** 1.0
**Phase:** 1 — MVP
**Last Updated:** May 2026
**Status:** Approved for Development

-----

## Table of Contents

1. [Stack Overview](#1-stack-overview)
1. [Frontend Architecture](#2-frontend-architecture)
1. [Backend Architecture](#3-backend-architecture)
1. [Forecast Engine — Implementation](#4-forecast-engine--implementation)
1. [State Management](#5-state-management)
1. [Performance Requirements](#6-performance-requirements)
1. [Deployment](#7-deployment)
1. [Development Environment](#8-development-environment)

-----

## 1. Stack Overview

|Layer        |Technology   |Version           |Rationale                                                |
|-------------|-------------|------------------|---------------------------------------------------------|
|Framework    |Next.js      |14+ (App Router)  |SSR + RSC; file-based routing; Vercel-native             |
|Language     |TypeScript   |5+ (strict mode)  |Type safety critical for financial calculations          |
|UI           |React        |18                |Component model; hooks for local state                   |
|Styling      |TailwindCSS  |3+                |Utility-first; rapid iteration; mobile-first             |
|Backend / DB |Supabase     |Latest            |Managed Postgres + Auth + Realtime; single user scale    |
|Database     |PostgreSQL   |15+ (via Supabase)|Relational integrity; JSONB for version history          |
|Charts       |Recharts     |Latest            |React-native; lightweight; sufficient for forecast views |
|Date handling|date-fns     |3+                |Tree-shakable; precise day arithmetic for recurring logic|
|State        |Zustand      |Latest            |Lightweight; no Redux overhead at this scale             |
|Deployment   |Vercel       |—                 |Zero-config Next.js; edge CDN                            |
|Auth         |Supabase Auth|—                 |Email/password; single user                              |

### 1.1 Guiding Principles

- **Simple over clever** — optimise for rapid development, not millions of users
- **Single user** — no multi-tenancy, no complex auth flows
- **Accuracy first** — all financial calculations in TypeScript with explicit decimal handling
- **No float arithmetic** — all monetary values stored as integers (pence/cents) or handled via decimal library

-----

## 2. Frontend Architecture

### 2.1 Project Structure

```
/app
  /layout.tsx               ← Root layout, font, providers
  /page.tsx                 ← Home (iPhone card stack)
  /accounts/[id]/page.tsx   ← Card detail view
  /review/page.tsx          ← Weekly review flow
  /settings/page.tsx        ← Settings
  /api/                     ← API routes (exchange rate fetch etc.)

/components
  /accounts/
    AccountCard.tsx          ← iPhone home card
    AccountCardDetail.tsx    ← Expanded card with timeline
    AccountStack.tsx         ← Apple Wallet stack container
  /transactions/
    AddTransactionPanel.tsx  ← Add/edit transaction form
    TransactionRow.tsx       ← Single timeline row
    TransactionTimeline.tsx  ← Scrollable timeline
  /review/
    ReviewFlashcard.tsx      ← Single account review card
    ReviewSummary.tsx        ← Post-review summary screen
  /grid/
    CockpitGrid.tsx          ← iPad main grid
    GridHeader.tsx           ← Frozen account header row
    GridCell.tsx             ← Individual balance cell
    GridDateColumn.tsx       ← Frozen date column
  /ui/
    Panel.tsx                ← Slide-in panel wrapper
    SideMenu.tsx             ← Floating side menu
    CurrencyFilter.tsx       ← GBP/NZD/All toggle
    AmountDisplay.tsx        ← Handles bracket/plain formatting
    DatePicker.tsx           ← Custom date picker

/lib
  /forecast/
    engine.ts                ← Core Budget calculation engine
    recurring.ts             ← Recurring date generation
    currency.ts              ← GBP/NZD conversion helpers
  /db/
    accounts.ts              ← Account queries
    transactions.ts          ← Transaction queries
    reviews.ts               ← Review queries
    settings.ts              ← Settings queries
  /utils/
    money.ts                 ← Decimal arithmetic helpers
    dates.ts                 ← Date formatting + manipulation
    formatting.ts            ← Amount display formatting

/types
  index.ts                   ← All shared TypeScript types
  database.ts                ← Supabase generated types

/hooks
  useAccounts.ts             ← Account data + mutations
  useForecast.ts             ← Budget calculations
  useReview.ts               ← Review state management
  useSettings.ts             ← Settings access
```

### 2.2 Responsive Strategy

- **Mobile-first** — iPhone layout is the base
- **iPad detection** — `useMediaQuery` or CSS breakpoints trigger iPad cockpit layout
- **Breakpoints:**
  - `< 768px` — iPhone layout (card stack, bottom nav, simplified forms)
  - `>= 768px` portrait — iPad portrait (grid with fewer columns, horizontal scroll)
  - `>= 1024px` landscape — iPad landscape (full cockpit, all columns visible)
- No separate codebases — one Next.js app, responsive layouts

### 2.3 Decimal Arithmetic

**Critical:** JavaScript floats cannot reliably handle currency arithmetic.

All monetary values stored in database as `DECIMAL(12,2)` — PostgreSQL handles precision.

In TypeScript, use integer arithmetic (pence) for all calculations:

```typescript
// NEVER do this:
const total = 1.1 + 2.2; // 3.3000000000000003

// DO this:
const totalPence = 110 + 220; // 330
const total = totalPence / 100; // 3.30

// Or use a decimal library for complex operations:
import Decimal from 'decimal.js';
const total = new Decimal('1.10').plus('2.20').toFixed(2); // "3.30"
```

Library recommendation: `decimal.js` for the forecast engine where chained calculations occur.

-----

## 3. Backend Architecture

### 3.1 Supabase Setup

- Single Supabase project
- Single authenticated user (email/password)
- Row Level Security enabled on all tables
- Realtime enabled on: `transactions`, `reviews`, `settings`

### 3.2 API Layer

All database access via **Supabase JS client** (`@supabase/supabase-js`) from Next.js Server Components and API routes.

No custom REST API needed — Supabase client handles all CRUD operations directly.

```typescript
// Server Component example
import { createServerClient } from '@/lib/supabase/server'

export default async function AccountsPage() {
  const supabase = createServerClient()
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_archived', false)
    .order('display_order')
  
  return <AccountStack accounts={accounts} />
}
```

### 3.3 Exchange Rate Auto-Fetch

```typescript
// /app/api/exchange-rate/route.ts
export async function GET() {
  const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=NZD')
  const data = await res.json()
  const rate = data.rates.NZD
  // Update settings table
  return Response.json({ rate })
}
```

Called once daily on app open if `exchange_rate_auto_fetch = true`.

### 3.4 Realtime Subscriptions

iPad cockpit grid subscribes to transaction changes for live updates:

```typescript
const channel = supabase
  .channel('transactions')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'transactions' },
    (payload) => {
      // Trigger forecast recalculation for affected accounts
      recalculateForecast(payload.new.from_account_id)
      recalculateForecast(payload.new.to_account_id)
    }
  )
  .subscribe()
```

-----

## 4. Forecast Engine — Implementation

### 4.1 Core Engine Location

`/lib/forecast/engine.ts`

This is the most critical file in the codebase. All Budget calculations flow through here.

### 4.2 Engine Interface

```typescript
interface ForecastEngine {
  // Get Budget balance for one account on one date
  getBudget(accountId: string, date: Date): Decimal

  // Get Budget balance for all accounts on one date
  getAllBudgets(date: Date): Map<string, Decimal>

  // Get full timeline for one account (start → end)
  getTimeline(
    accountId: string, 
    startDate: Date, 
    endDate: Date
  ): DailyBalance[]

  // Get full grid (all accounts × all dates)
  getGrid(
    startDate: Date,
    endDate: Date
  ): GridData
}

interface DailyBalance {
  date: Date
  balance: Decimal
  transactions: Transaction[]  // transactions on this date
}

interface GridData {
  dates: Date[]
  accounts: Account[]
  balances: Map<string, Map<string, Decimal>>  // accountId → date → balance
}
```

### 4.3 Budget Calculation Algorithm

```typescript
function calculateBudget(
  account: Account,
  targetDate: Date,
  transactions: Transaction[],
  recurringSchedules: RecurringSchedule[]
): Decimal {
  
  let balance = new Decimal(account.opening_balance)
  
  // 1. Apply all stored transactions up to targetDate
  const storedTx = transactions.filter(tx => 
    isOnOrBefore(tx.transaction_date, targetDate)
  )
  
  for (const tx of storedTx) {
    if (tx.to_account_id === account.id) {
      balance = balance.plus(tx.amount_to)  // CR
    }
    if (tx.from_account_id === account.id) {
      balance = balance.minus(tx.amount_from)  // DR
    }
  }
  
  // 2. Apply all recurring occurrences up to targetDate
  const occurrences = generateOccurrences(
    recurringSchedules,
    account.opening_date,
    targetDate
  )
  
  for (const occ of occurrences) {
    if (occ.to_account_id === account.id) {
      balance = balance.plus(occ.amount_to)  // CR
    }
    if (occ.from_account_id === account.id) {
      balance = balance.minus(occ.amount_from)  // DR
    }
  }
  
  return balance
}
```

### 4.4 Recurring Occurrence Generator

```typescript
function generateOccurrences(
  schedule: RecurringSchedule,
  fromDate: Date,
  toDate: Date
): RecurringOccurrence[] {
  
  const occurrences: RecurringOccurrence[] = []
  let current = schedule.start_date
  
  while (isOnOrBefore(current, toDate)) {
    
    // Skip if before fromDate
    if (isOnOrAfter(current, fromDate)) {
      
      // Check not in skips list
      const isSkipped = schedule.skips.some(s => isSameDay(s.skip_date, current))
      
      if (!isSkipped) {
        // Check for override on this date
        const override = schedule.overrides.find(o => 
          isSameDay(o.original_date, current)
        )
        
        // Get effective amount for this date
        const amount = getEffectiveAmount(schedule.effective_changes, current)
        
        occurrences.push({
          date: override ? override.override_date : current,
          amount_from: override ? override.amount_from : amount,
          amount_to: override ? override.amount_to : amount,
          from_account_id: schedule.from_account_id,
          to_account_id: schedule.to_account_id,
          recurring_id: schedule.id
        })
      }
    }
    
    // Advance to next occurrence
    current = nextOccurrence(schedule, current)
  }
  
  return occurrences
}
```

### 4.5 Next Occurrence Logic

```typescript
function nextOccurrence(schedule: RecurringSchedule, from: Date): Date {
  switch (schedule.frequency) {
    case 'WEEKLY':
      return addWeeks(from, 1)
    
    case 'FORTNIGHTLY':
      return addDays(from, 14)
    
    case 'MONTHLY':
      return addMonths(from, 1, schedule.day_of_month)
      // Handles month-end edge cases (31st → last day of month)
    
    case 'QUARTERLY':
      return addMonths(from, 3, schedule.day_of_month)
    
    case 'BIANNUAL':
      return addMonths(from, 6, schedule.day_of_month)
  }
}
```

### 4.6 Weekday-Only Adjustment

```typescript
function applyWeekdayRule(date: Date, weekdayOnly: boolean): Date {
  if (!weekdayOnly) return date
  
  const day = getDay(date) // 0=Sun, 6=Sat
  
  if (day === 6) return subDays(date, 1)  // Saturday → Friday
  if (day === 0) return subDays(date, 2)  // Sunday → Friday
  
  // Bank holidays: treat same as weekend — move to day before
  if (isUKBankHoliday(date)) return subDays(date, 1)
  
  return date
}
```

### 4.7 Effective Amount Resolution

```typescript
function getEffectiveAmount(
  changes: EffectiveChange[], 
  date: Date
): Decimal {
  // Sort descending by from_date
  const sorted = [...changes].sort((a, b) => 
    compareDesc(a.from_date, b.from_date)
  )
  
  // Find first change where from_date <= date
  const effective = sorted.find(c => isOnOrBefore(c.from_date, date))
  
  if (!effective) throw new Error('No effective amount found')
  
  return new Decimal(effective.amount_from)
}
```

-----

## 5. State Management

### 5.1 Zustand Stores

**accounts store:**

```typescript
interface AccountsStore {
  accounts: Account[]
  loading: boolean
  fetchAccounts: () => Promise<void>
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>
  archiveAccount: (id: string) => Promise<void>
}
```

**forecast store:**

```typescript
interface ForecastStore {
  gridData: GridData | null
  loading: boolean
  dateRange: { start: Date; end: Date }
  calculateGrid: () => Promise<void>
  invalidate: (accountId?: string) => void  // triggers recalculation
}
```

**review store:**

```typescript
interface ReviewStore {
  currentReview: Review | null
  entries: ReviewEntry[]
  currentIndex: number
  startReview: (date: Date) => void
  submitEntry: (accountId: string, actualBalance: Decimal) => void
  skipEntry: (accountId: string) => void
  completeReview: () => Promise<void>
}
```

**settings store:**

```typescript
interface SettingsStore {
  settings: Settings
  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<Settings>) => Promise<void>
}
```

### 5.2 Recalculation Strategy

Forecast recalculation is triggered by the `invalidate()` action on the forecast store:

1. Any transaction add/edit/delete calls `invalidate(accountId)`
1. `invalidate` marks affected date ranges as stale
1. Grid and timeline components re-render from recalculated data
1. No loading spinners — recalculation must complete synchronously for typical date ranges

-----

## 6. Performance Requirements

### 6.1 Recalculation Speed

|Operation                                        |Target                    |
|-------------------------------------------------|--------------------------|
|Single account timeline (18 months)              |< 50ms                    |
|Full grid recalculation (15 accounts × 18 months)|< 200ms                   |
|Forecast after transaction add                   |Imperceptible — no spinner|
|Grid initial load                                |< 500ms                   |

### 6.2 Grid Rendering

- iPad grid renders ~550 rows × 15 columns = ~8,250 cells
- Use **windowed rendering** (virtual scroll) for rows — only render visible rows
- Recommended: `@tanstack/react-virtual` for row virtualisation
- Column headers and date column always rendered (frozen)

### 6.3 Date Range

- Render from **opening date (first account entry)** to **18 months from today**
- Extend on demand — “Load more” or automatic extension as user scrolls to edge

-----

## 7. Deployment

### 7.1 Vercel Configuration

```
Framework:     Next.js
Build command: next build
Output:        .next
Node version:  20.x
```

### 7.2 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     ← server-side only, never exposed to client
```

### 7.3 PWA Configuration

Phase 1 is a responsive web app — PWA-capable but not required:

- Add `manifest.json` for “Add to Home Screen” on iOS
- Service worker optional in Phase 1
- Full React Native app deferred to Phase 2

-----

## 8. Development Environment

### 8.1 Setup

```bash
# Clone and install
git clone [repo]
cd oovy-ray-money
npm install

# Environment
cp .env.example .env.local
# Fill in Supabase URL and keys

# Database setup
# Run schema from Data Model & Accounts Spec in Supabase SQL editor

# Seed accounts
npm run seed:accounts

# Start dev server
npm run dev
```

### 8.2 Seed Script

`/scripts/seed-accounts.ts`

- Creates the EXTERNAL system account
- Creates all 15 user accounts with zero balances
- Creates the settings row with default exchange rate
- Idempotent — safe to run multiple times

### 8.3 TypeScript Config

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 8.4 Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.1.0",
    "date-fns": "^3.0.0",
    "decimal.js": "^10.0.0",
    "zustand": "^4.0.0",
    "recharts": "^2.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

-----

*End of Technical Stack & Architecture Spec v1.0*
*Cross-reference: Data Model & Accounts Spec v1.0 · Forecast Calculation Engine Spec v1.0 · UX Flow Spec v2.0*
*Next: Migration Spec (Account Seeding) · Development Phases Spec*