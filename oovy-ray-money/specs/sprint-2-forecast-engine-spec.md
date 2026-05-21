# Sprint 2 — Forecast Engine
> Phase 1 MVP | Est. Week 2–3 | 9 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Your developer bible. Model boundaries, reasoning protocol, all rules.
2. **TRACKER.md** (root) — Current sprint progress, task list.
3. **Spec docs** in `/specs/` (authority order):
   - `oovy-ray-forecast-engine-spec.md` ← **primary authority this sprint**
   - `oovy-ray-data-model-spec.md`
   - `oovy-ray-technical-stack-spec.md`
4. **Existing types** in `/types/index.ts` — ForecastEngine, DailyBalance, GridData already defined.

---

## Sprint Goal

Build the forecast calculation engine — the mathematical core of the app. After this sprint, the Budget formula runs correctly for any account on any date, all recurring transactions generate correctly with edge cases handled, and every function has passing unit tests.

---

## Task 1 — decimal.js Money Utilities

**Create the money utility module. All monetary arithmetic in the app flows through these helpers.**

### What to Build

File: `/lib/utils/money.ts`

```typescript
import Decimal from 'decimal.js'

// Configure precision globally
Decimal.set({ precision: 14, rounding: Decimal.ROUND_HALF_UP })

// ─── Currency conversions ─────────────────────────────────────────
// Convert a stored number (from DB DECIMAL) to Decimal
export function toDecimal(value: number): Decimal
  // return new Decimal(String(value))

// Convert Decimal back to a plain number for JSON/store
export function fromDecimal(d: Decimal): number
  // return d.toDecimalPlaces(2).toNumber()

// Format a Decimal as display string in given currency
export function formatMoney(amount: Decimal, currency: Currency): string
  // GBP: prefix £ (e.g. "£1,800.00")
  // NZD: prefix NZ$ (e.g. "NZ$2,220.00")
  // Negative values → debit bracket notation: "(£200.00)" instead of "-£200.00"
  // Uses toLocaleString with appropriate locale + min/maxFractionDigits: 2

// Format a Decimal as debit bracket notation for DR entries
export function formatDebit(amount: Decimal, currency: Currency): string
  // Always in brackets: (£200.00) / (NZ$450.00)
  // Amount is expected to be positive — displayed as negative via brackets

// ─── Arithmetic helpers ────────────────────────────────────────────
export function add(a: number | Decimal, b: number | Decimal): Decimal
export function subtract(a: number | Decimal, b: number | Decimal): Decimal
export function multiply(a: number | Decimal, b: number | Decimal): Decimal
export function divide(a: number | Decimal, b: number | Decimal): Decimal

// Sum an array of Decimals or numbers
export function sum(values: (number | Decimal)[]): Decimal

// Compare two Decimal values
export function isGreaterThan(a: Decimal, b: Decimal): boolean
export function isLessThan(a: Decimal, b: Decimal): boolean
export function isZero(d: Decimal): boolean

// ─── Exchange rate helper ──────────────────────────────────────────
// Convert a GBP amount to NZD using stored exchange rate
export function gbpToNzd(gbpAmount: Decimal, rate: Decimal): Decimal
  // return gbpAmount.times(rate)

// Convert NZD to GBP equivalent for totals
export function nzdToGbp(nzdAmount: Decimal, rate: Decimal): Decimal
  // return nzdAmount.div(rate)
```

### Design Rules

- Every function that accepts or returns money uses `Decimal`, never `number`.
- Conversion helpers `toDecimal()` / `fromDecimal()` exist at the exact boundary where DB values enter/leave the engine.
- `formatMoney()` handles the debit bracket rule: positive values get plain prefix, negative values get `(£value)`.
- NZD always `NZ$` prefix. GBP always `£` prefix.
- Use `toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` for comma formatting.

### Acceptance Criteria

- [ ] All exported functions exist with correct signatures
- [ ] `formatMoney(new Decimal('1234.50'), 'GBP')` → `"£1,234.50"`
- [ ] `formatMoney(new Decimal('-200.00'), 'GBP')` → `"(£200.00)"`
- [ ] `formatMoney(new Decimal('-450.00'), 'NZD')` → `"(NZ$450.00)"`
- [ ] `formatMoney(new Decimal('0.00'), 'GBP')` → `"£0.00"`
- [ ] `formatDebit(new Decimal('200.00'), 'GBP')` → `"(£200.00)"`
- [ ] `gbpToNzd(new Decimal('100'), new Decimal('2.22'))` equals `new Decimal('222')`
- [ ] `sum([toDecimal(1.1), toDecimal(2.2)])` equals `new Decimal('3.30')` (not 3.3000000000000003)
- [ ] All arithmetic functions use Decimal internally — zero JS float arithmetic

**Output:** `TASK DONE: decimal.js integration and money utilities`

---

## Task 2 — date-fns Date Utilities

**Create date utility module. All date arithmetic flows through these helpers.**

### What to Build

File: `/lib/utils/dates.ts`

```typescript
import {
  addDays, addWeeks, addMonths, subDays,
  startOfDay, endOfDay,
  isBefore, isAfter, isEqual, isSameDay,
  getDay, getDate,
  format, parseISO,
  differenceInDays,
  startOfMonth, endOfMonth, getDaysInMonth,
  isWeekend,
  isSaturday, isSunday,
  addBusinessDays,
  previousFriday
} from 'date-fns'

// ─── Core helpers ─────────────────────────────────────────────────
export function parseDate(dateOrString: Date | string): Date
  // Accept Date or ISO string, return Date

export function toDateString(date: Date): string
  // Return ISO date string (YYYY-MM-DD) — used for Map keys

export function formatDisplayDate(date: Date): string
  // "15 May 2026" style

export function formatShortDate(date: Date): string
  // "15 May" style

// ─── Comparison ────────────────────────────────────────────────────
export function isOnOrBefore(date: Date, target: Date): boolean
export function isOnOrAfter(date: Date, target: Date): boolean
export function isBetween(date: Date, start: Date, end: Date): boolean

// ─── Occurrence generation helpers ────────────────────────────────
// Advance to next occurrence based on frequency
export function nextOccurrenceDate(
  current: Date,
  frequency: Frequency,
  dayOfMonth?: number,   // for MONTHLY / QUARTERLY / BIANNUAL
  dayOfWeek?: number     // for WEEKLY
): Date

// Get the last day of month, handling month-end edge cases
// e.g. dayOfMonth=31 in April → returns April 30
export function getSafeDayOfMonth(year: number, month: number, dayOfMonth: number): number

// ─── Weekday-only rule ─────────────────────────────────────────────
// Move weekend dates to Friday before. Bank holidays to day before.
// Saturday → Friday, Sunday → Friday, bank holiday → day before (recursive)
export function applyWeekdayRule(date: Date, weekdayOnly: boolean): Date

// Check if date is a UK bank holiday (hardcoded list for 2024-2030)
export function isUKBankHoliday(date: Date): boolean
```

### Bank Holiday Data

Hardcode a UK bank holiday lookup covering 2024–2030. Include:
- New Year's Day (1 Jan, or next weekday if weekend)
- Good Friday, Easter Monday (variable dates)
- Early May, Spring, August bank holidays (Mondays)
- Christmas Day, Boxing Day (or substitute weekdays)

The function `isUKBankHoliday(date)` returns true if the date is a bank holiday. Falling on a weekend → the substitute weekday is the actual holiday.

### Occurrence Logic

```
WEEKLY:      addWeeks(current, 1) → but must land on correct day_of_week
FORTNIGHTLY: addDays(current, 14)
MONTHLY:     addMonths(current, 1) → with day_of_month safety (end-of-month if exceeded)
QUARTERLY:   addMonths(current, 3) → same day_of_month rules
BIANNUAL:    addMonths(current, 6) → same day_of_month rules
```

### Acceptance Criteria

- [ ] `nextOccurrenceDate` handles all 5 frequencies correctly
- [ ] Month-end: 31st Jan → 28/29 Feb, 31st Mar → 30 Apr, etc.
- [ ] `applyWeekdayRule(date, true)` moves Sat→Fri, Sun→Fri
- [ ] `applyWeekdayRule(date, false)` returns date unchanged
- [ ] `isUKBankHoliday` returns true for known UK bank holidays
- [ ] `isOnOrBefore` and `isOnOrAfter` work correctly
- [ ] All functions use date-fns v3 internally, no raw Date math

**Output:** `TASK DONE: date-fns date utilities`

---

## Task 3 — Recurring Occurrence Generator

**Build the function that generates all occurrence dates for a recurring schedule between two dates.**

### What to Build

File: `/lib/forecast/recurring.ts`

```typescript
import Decimal from 'decimal.js'
import { RecurringSchedule, RecurringSkip, RecurringOverride } from '@/types'
import { toDecimal } from '@/lib/utils/money'
import { nextOccurrenceDate, applyWeekdayRule, isOnOrBefore, parseDate } from '@/lib/utils/dates'
import { getEffectiveAmount } from './effective-amount'

export interface RecurringOccurrence {
  date: Date
  amount_from: Decimal
  amount_to: Decimal
  from_account_id: string
  to_account_id: string
  currency_from: Currency
  currency_to: Currency
  recurring_id: string
  name: string | null
}

// ─── Main generator ─────────────────────────────────────────────────
export function generateOccurrences(
  schedule: RecurringSchedule,
  fromDate: Date,
  toDate: Date,
  skips: RecurringSkip[],
  overrides: RecurringOverride[]
): RecurringOccurrence[]

// ─── Single next occurrence (used by advance loop) ─────────────────
export function getNextOccurrence(
  schedule: RecurringSchedule,
  afterDate: Date
): Date | null
  // Returns the next occurrence date strictly after `afterDate`
  // Returns null if beyond end_date or schedule is inactive
  // Handles weekday_only adjustment per occurrence

// ─── First occurrence on or after start ───────────────────────────
export function getFirstOccurrence(
  schedule: RecurringSchedule
): Date
  // Returns the start_date itself (adjusted for weekday_only if needed)
  // The start_date IS an occurrence
```

### Algorithm (generateOccurrences)

```
1. Validate schedule.is_active — return [] if inactive
2. Set current = first occurrence (start_date, weekday-adjusted)
3. WHILE current <= toDate AND (end_date is null OR current <= end_date):
   a. IF current >= fromDate:
      - Check if NOT in skips list (match on skip_date)
      - If skipped: advance to next, CONTINUE
      - Check if override exists for this date (match on original_date)
      - Get effective amount for this date from effective_changes
      - Push occurrence with correct:
        * date = override ? override.override_date : current
        * amount_from = override ? override.amount_from : effective amount
        * amount_to = override ? override.amount_to : effective amount
   b. Advance current = getNextOccurrence(schedule, current)
4. RETURN occurrences array
```

### Key Rules

- **Skips**: single-date skip. Recurring continues normally before/after.
- **Overrides**: replace the occurrence entirely for that original_date with new amount/date/name.
- **Effective amount**: use the largest `effective_from` ≤ occurrence date from `effective_changes` JSONB. If no changes match, throw error (should always have at least one change — the initial amount).
- **Start date is inclusive** — the start_date itself is an occurrence.
- **End date is inclusive** — the end_date itself is the last occurrence.
- **Weekday-only is checked per occurrence** — the raw scheduled date is adjusted before any comparison.

### Acceptance Criteria

- [ ] Generates correct occurrences for WEEKLY (every Monday, 52/year)
- [ ] Generates correct occurrences for FORTNIGHTLY (every 14 days from start)
- [ ] Generates correct occurrences for MONTHLY (same day each month)
- [ ] Generates correct occurrences for QUARTERLY and BIANNUAL
- [ ] Respects start_date (inclusive) and end_date (inclusive)
- [ ] Respects weekday_only adjustment
- [ ] Skips excluded dates
- [ ] Overrides replace individual occurrences
- [ ] Returns empty array for inactive schedules
- [ ] Returns empty array when start_date > toDate
- [ ] Month-end edge cases handled (31st → 30th/28th)
- [ ] Leap year February 29 handled

**Output:** `TASK DONE: Recurring occurrence generator`

---

## Task 4 — Weekday-Only Rule Implementation

**Implement the weekday-only adjustment, including bank holiday handling.**

### What to Build

Already partially covered by Task 2 — ensure `applyWeekdayRule()` in `/lib/utils/dates.ts` is complete:

```typescript
export function applyWeekdayRule(date: Date, weekdayOnly: boolean): Date {
  if (!weekdayOnly) return date
  
  let result = date
  
  // Move weekend to Friday before
  const day = getDay(result) // 0=Sun, 1=Mon, ... 6=Sat
  if (day === 6) result = subDays(result, 1)      // Saturday → Friday
  if (day === 0) result = subDays(result, 2)      // Sunday → Friday
  
  // Recursive bank holiday handling:
  // After the weekend adjustment, if the result falls on a bank holiday,
  // move back one day and check again (recursive).
  // This handles rare cases like Easter Monday after a weekend adjustment.
  while (isUKBankHoliday(result)) {
    result = subDays(result, 1)
  }
  
  return result
}
```

### Bank Holiday Data

Hardcode UK bank holidays 2024–2030 as an array or lookup:

```typescript
const UK_BANK_HOLIDAYS: string[] = [
  // 2024
  '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-06', '2024-05-27',
  '2024-08-26', '2024-12-25', '2024-12-26',
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26',
  '2025-08-25', '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
  '2026-08-31', '2026-12-25', '2026-12-28',  // 26 Dec is Saturday, substitute Mon 28
  // ... continue through 2030
]
```

Reference: gov.uk/bank-holidays for the exact dates. Use the actual dates (not variable calculation) — hardcode is simpler and less error-prone.

### Acceptance Criteria

- [ ] Saturday 30 Aug 2025, weekday_only=true → Friday 29 Aug 2025
- [ ] Sunday 30 Nov 2025, weekday_only=true → Friday 28 Nov 2025
- [ ] Tuesday 30 Sep 2025, weekday_only=true → Tuesday 30 Sep 2025 (unchanged)
- [ ] Bank holiday Friday, weekday_only=true → Thursday before
- [ ] Non-bank-holiday weekday, weekday_only=true → unchanged
- [ ] weekday_only=false → date always unchanged regardless of day
- [ ] Bank holiday coverage 2024-2030 complete

**Output:** `TASK DONE: Weekday-only rule implementation`

---

## Task 5 — Effective Amount Resolver

**Implement version history resolution for recurring transactions.**

### What to Build

File: `/lib/forecast/effective-amount.ts`

```typescript
import Decimal from 'decimal.js'
import { EffectiveChange } from '@/types'
import { toDecimal } from '@/lib/utils/money'
import { parseDate, isOnOrBefore } from '@/lib/utils/dates'

// ─── Effective amount (from_account perspective) ──────────────────
export function getEffectiveAmount(
  changes: EffectiveChange[],
  date: Date
): Decimal
  // Sort effective_changes by effective_from DESC
  // Find first (most recent) change where effective_from <= date
  // Return amount_from as Decimal
  // Throw if no change matches (should never happen — always at least one)

// ─── Effective amounts (both sides, for cross-currency) ───────────
export function getEffectiveAmounts(
  changes: EffectiveChange[],
  date: Date
): { amountFrom: Decimal; amountTo: Decimal }
  // Same as above but returns both amount_from and amount_to
```

### Algorithm

```
1. If changes array is empty: throw Error("No effective changes defined")
2. Sort changes by effective_from descending (most recent first)
3. Find the first change where effective_from <= target date
4. Return that change's amounts
5. If no change found (all changes are in the future relative to date): 
   throw Error("No effective amount for date before first change")
```

### Edge Cases

- Single change (initial amount only): always returned for any date
- Multiple changes: correct one selected by date
- Mid-series change: date before change → old amount, date after → new amount
- Change exactly on effective_from date: that change applies (inclusive)

### Acceptance Criteria

- [ ] Single change returns that amount for any date
- [ ] Two changes: date before 2nd → 1st amount, date after → 2nd amount
- [ ] Three changes: correct selection for dates between each
- [ ] Change on exact effective_from date: that change applies
- [ ] Empty changes array → throws
- [ ] All changes in future → throws (no matching change)

**Output:** `TASK DONE: Effective amount resolver (version history)`

---

## Task 6 — Core Budget Calculation Function

**Build the core Budget formula: account balance on a specific date.**

### What to Build

File: `/lib/forecast/engine.ts`

```typescript
import Decimal from 'decimal.js'
import { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, DailyBalance, GridData } from '@/types'
import { toDecimal, fromDecimal, sum } from '@/lib/utils/money'
import { isOnOrBefore, parseDate, toDateString } from '@/lib/utils/dates'
import { generateOccurrences } from './recurring'

// ─── Core Budget Formula ───────────────────────────────────────────
// Calculate the budget balance for a single account on a single date.
// Formula: opening_balance + CRs - DRs up to and including targetDate.
export function calculateBudget(
  account: Account,
  targetDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): Decimal

// ─── Get all budgets for a date ────────────────────────────────────
export function calculateAllBudgets(
  accounts: Account[],
  targetDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): Map<string, Decimal>
```

### Algorithm (calculateBudget)

```
1. Start balance = toDecimal(account.opening_balance)
2. Filter stored transactions where transaction_date <= targetDate
3. For each stored transaction:
   - If to_account_id === account.id → balance += amount_to     (CR)
   - If from_account_id === account.id → balance -= amount_from (DR)
   - If both (shouldn't happen unless self-transfer) → both applied
4. Generate recurring occurrences for ALL schedules where:
   - from_account_id === account.id OR to_account_id === account.id
   - occurrence date <= targetDate
5. For each occurrence (same logic as stored transactions):
   - If to_account_id === account.id → balance += amount_to     (CR)
   - If from_account_id === account.id → balance -= amount_from (DR)
6. Return balance
```

### Important Rules

- **Opening balance is already included** in step 1. Do not double-count OPENING type transactions that set it.
- **Order within a day**: CR first, then DR — per the spec edge cases table.
- **Cross-currency**: amounts stored independently. Each side uses its account's currency.
- **Don't duplicate**: If a transaction has both `recurring_id` set AND appears in stored transactions (historical instances), it would be counted twice. The engine should skip recurring generation for any date where a stored RECURRING_INSTANCE transaction already exists for that schedule.
- **Is this duplication issue real?** Check: if historical recurring instances were stored in the transactions table during CSV seed, and the generator also produces them from the schedule, they'd double-count. Guard: when a stored RECURRING_INSTANCE for a given recurring_id + date exists, skip that occurrence in the generator.

### Performance

- `calculateBudget` must complete in < 50ms for a single account over 18 months.
- Filter transactions and occurrences, don't iterate all history for every calculation.
- The occurrence generator should be the heavy lifter — cache-friendly.

### Acceptance Criteria

- [ ] Account with opening balance £1,000 and no transactions → Budget = £1,000
- [ ] Account with opening balance £1,000 + CR £200 on 15 May → Budget on 20 May = £1,200
- [ ] Account with opening balance £1,000 + DR £200 on 15 May → Budget on 20 May = £800
- [ ] Account with both CR (+£500) and DR (-£200) on same date → both applied correctly
- [ ] Target date before any transactions → budget = opening balance
- [ ] Target date exactly matching a transaction date → transaction included
- [ ] Recurring transactions contribute correctly to budget
- [ ] No double-counting of stored RECURRING_INSTANCE that overlaps with schedule generation
- [ ] External account (receiving money out) — budget is calculated but never displayed

**Output:** `TASK DONE: Core Budget calculation function`

---

## Task 7 — Full Grid Calculation Function

**Build the grid calculator that computes budget balances for all accounts across a date range.**

### What to Build

Add to `/lib/forecast/engine.ts`:

```typescript
// ─── Timeline (single account) ─────────────────────────────────────
// Get day-by-day balances for one account over a date range.
// Returns one DailyBalance per day, even if no transactions.
export function getTimeline(
  account: Account,
  startDate: Date,
  endDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): DailyBalance[]

// ─── Full Grid (all accounts) ──────────────────────────────────────
// Get balances for all accounts across a date range.
export function getGrid(
  accounts: Account[],
  startDate: Date,
  endDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): GridData
```

### Algorithm (getGrid — preferred running balance approach)

```
1. For each account:
   a. Initialize balance = opening_balance
   b. For each day from startDate to endDate:
      - Apply any transactions (stored + recurring) occurring ON this day
      - CR first, then DR
      - Store the resulting balance in the grid
   c. Day N balance = Day N-1 balance ± Day N transactions

2. Return GridData:
   - dates: array of Date objects (one per day in range)
   - accounts: array of Account objects
   - balances: Map<accountId, Map<dateISO, balanceAsNumber>>
```

### Alternative Approach (simpler, may be fast enough)

For each account, call `calculateBudget()` for the end date. Then walk backwards subtracting transactions to get each day's value. Or call `calculateBudget()` per day.

Given the performance target (< 200ms for full grid), the running balance approach is preferred. Start from opening balance and advance day by day, applying only that day's transactions.

### Performance Requirements

- Full grid: 15 accounts × ~550 days (18 months) = 8,250 calls
- Per spec: must complete < 200ms
- Use running balance (day N = day N-1 ± today's transactions), not full recalculation per day
- Pre-compute all occurrences once, not per-account

### Acceptance Criteria

- [ ] `getTimeline` returns daily balances for entire date range
- [ ] `getTimeline` includes transactions array for each day that has activity
- [ ] `getTimeline` includes days with no transactions (balance unchanged)
- [ ] `getGrid` returns correct Map structure: accountId → dateISO → balance
- [ ] Grid handles 15 accounts × 550 days correctly
- [ ] Grid handles accounts with different opening dates
- [ ] Grid complete in < 200ms for typical data
- [ ] Both functions use decimal.js (no float arithmetic leaks)

**Output:** `TASK DONE: Full grid calculation function`

---

## Task 8 — Unit Tests for All Calculation Functions

**Write comprehensive unit tests for every forecast engine function.**

### What to Build

File: `/lib/forecast/__tests__/money.test.ts`
File: `/lib/forecast/__tests__/dates.test.ts`
File: `/lib/forecast/__tests__/recurring.test.ts`
File: `/lib/forecast/__tests__/effective-amount.test.ts`
File: `/lib/forecast/__tests__/engine.test.ts`

### Test Framework

Use **vitest** (add to devDependencies). It's fast, Jest-compatible, and works with TypeScript out of the box.

```bash
npm install -D vitest
```

Add to package.json:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Test Config

File: `/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

### Required Test Cases

**money.test.ts:**
- `toDecimal` and `fromDecimal` roundtrip correctly
- `formatMoney` GBP: positive, negative, zero
- `formatMoney` NZD: positive, negative, zero (NZ$ prefix)
- `formatMoney` large numbers with comma formatting
- `formatDebit` always bracket notation
- `add`, `subtract`, `multiply`, `divide` precision (no float errors)
- `sum` with 0, 1, many values
- `gbpToNzd` and `nzdToGbp` with rate 2.22
- Currency display: NZ$ never bare $

**dates.test.ts:**
- `nextOccurrenceDate` for all 5 frequencies
- Month-end: 31 Jan → 28/29 Feb, 31 Mar → 30 Apr, etc.
- Leap year: 29 Feb handling
- `applyWeekdayRule`: Sat→Fri, Sun→Fri, weekday unchanged
- `applyWeekdayRule` with bank holiday: Fri bank hol → Thu
- `applyWeekdayRule` weekdayOnly=false always returns same date
- `isUKBankHoliday` for known dates
- `isOnOrBefore`, `isOnOrAfter`, `isBetween`

**recurring.test.ts:**
- WEEKLY: generates correct Monday dates
- FORTNIGHTLY: every 14 days exactly
- MONTHLY: 15th of every month
- MONTHLY 31st: handles short months
- QUARTERLY: every 3 months
- BIANNUAL: every 6 months
- Start date inclusive (start_date itself is an occurrence)
- End date inclusive
- Skips exclude specific dates
- Overrides replace a single occurrence
- Weekday-only adjustment per occurrence
- Inactive schedule returns empty
- Empty range (fromDate > toDate) returns empty
- No occurrences when all dates are skipped

**effective-amount.test.ts:**
- Single change: always returned
- Two changes: date before 2nd returns 1st, after returns 2nd
- Change on exact effective_from: that change applies
- Empty array → throws
- All changes in future → throws

**engine.test.ts:**
- Budget = opening balance when no transactions
- CR increases budget
- DR decreases budget
- Multiple transactions on same day (CR first, then DR)
- Recurring transactions affect budget
- Stored RECURRING_INSTANCE + schedule: no double-counting
- Target date before any transactions = opening balance
- Timeline: returns correct daily balances
- Timeline: includes days with no transactions
- Grid: all accounts × date range correct
- Grid: 3 accounts × 5 days (small integration test)

### Acceptance Criteria

- [ ] All test files exist with at least the cases listed above
- [ ] `npm test` passes all tests
- [ ] Tests use real (not mocked) decimal.js and date-fns
- [ ] Test data is inline (small fixtures), no external JSON files needed
- [ ] Each test file tests one module only
- [ ] Edge cases explicitly tested (leap year, month-end, bank holidays, double-counting)

**Output:** `TASK DONE: Unit tests for all calculation functions`

---

## Task 9 — Edge Case Handling

**Verify all edge cases from the forecast engine spec §11 are handled.**

### What to Build

This is a verification + fix task. No new files. Go through each edge case in `oovy-ray-forecast-engine-spec.md §11` and ensure the engine handles it correctly. Write additional tests if any are missing.

### Edge Cases Checklist

| # | Scenario | Expected Behaviour | Verify |
|---|----------|-------------------|--------|
| 1 | Recurring 31st in 30-day month | Last day of month (30th) | Monthly occurrence generator |
| 2 | Recurring 29th Feb non-leap year | 28th Feb | Monthly occurrence generator |
| 3 | weekday_only=true + Fri bank hol | Thursday before | applyWeekdayRule |
| 4 | Exchange rate not set | Default 2.22 (already seeded) | Settings seed |
| 5 | Exchange rate fetch fails | Use last stored rate silently | Future sprint |
| 6 | Opening balance not set | £0.00 default | DB default |
| 7 | DR larger than account balance | Budget goes negative — allowed | calculateBudget |
| 8 | Two transactions same account same date | Both applied, CR first then DR | calculateBudget ordering |
| 9 | Edit recurring with no future occurrences | Historical only — user warned | Future sprint |
| 10 | Delete all occurrences | Confirmation required | Future sprint |
| 11 | Backdate before opening date | Not permitted — date picker restricts | Future sprint |
| 12 | Review on date with no Budget data | £0.00 snapshot | Future sprint |
| 13 | Cross-currency mismatched amounts | No validation — user responsible | By design |
| 14 | Archived account with active recurring | Recurring paused — user notified | Future sprint |

**For this sprint, verify items 1, 2, 3, 7, 8.** The others are either covered by DB defaults or belong to future sprints.

### Additional Edge Cases to Test

- Negative opening balance (debt accounts)
- Zero-value transactions (should validate against positive_amounts constraint)
- Very large date range (50 years) — performance check
- Account with currency that differs from transaction currency
- Rounding: GBP amounts always to 2 decimal places, NZD same

### Acceptance Criteria

- [ ] All 5 in-scope edge cases verified with passing tests
- [ ] Month-end 31st → 30th/28th works for all months
- [ ] Leap year Feb 29 handled
- [ ] Negative budget balances allowed
- [ ] Same-day transaction ordering (CR before DR) verified
- [ ] Any bugs found are fixed before marking this task complete

**Output:** `TASK DONE: Edge case handling (month-end, leap year, weekend rules)`

---

## Sprint 2 Definition of Done

All 9 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] `npm test` exits with 0 and all tests pass
- [ ] `/lib/utils/money.ts` — all money helpers complete
- [ ] `/lib/utils/dates.ts` — all date helpers complete
- [ ] `/lib/forecast/recurring.ts` — occurrence generator complete
- [ ] `/lib/forecast/effective-amount.ts` — version history resolver complete
- [ ] `/lib/forecast/engine.ts` — budget, timeline, grid functions complete
- [ ] All 5 test files exist with comprehensive coverage
- [ ] `calculateBudget` returns correct Decimal values for all scenarios
- [ ] Month-end, leap year, weekend/bank holiday edge cases handled
- [ ] TypeScript strict mode: zero errors
- [ ] No float arithmetic anywhere in the forecast engine

---

## Notes for Claude

- The forecast engine is the mathematical core. Every other sprint depends on it being correct.
- **Test exhaustively.** Financial calculations must be exact. If a test fails, fix the code — don't loosen the test.
- If you spot a missing edge case not in the spec, output `SUGGESTION:` and add a test for it anyway (DeepSeek will confirm later).
- When done with each task, output `TASK DONE: [exact task name]`.
- If spec is unclear, output `SPEC GAP: [description]` and stop.
- If you see an issue, output `ISSUE: [description]` with reasoning.
- Build tasks in order — each depends on the previous.
