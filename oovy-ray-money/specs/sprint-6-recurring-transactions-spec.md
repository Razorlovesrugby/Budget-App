# Sprint 6 — Recurring Transactions
> Phase 1 MVP | Est. Week 6–7 | 7 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, non-negotiables
2. **TRACKER.md** (root) — Sprint progress
3. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §17 — **primary authority**
   - `oovy-ray-forecast-engine-spec.md` §6 (recurring rules, edit/delete scopes, weekday-only)
   - `oovy-ray-data-model-spec.md` §4 (recurring_schedules, recurring_skips, recurring_overrides)
4. **Existing components:** `/lib/forecast/recurring.ts` (Sprint 2), `/components/ui/AmountDisplay.tsx`, `/components/ui/DatePicker.tsx`, `/components/accounts/AccountPicker.tsx`

---

## Sprint Goal

Build the full Recurring Transactions feature. Users can view, add, edit, and delete recurring schedules from a dedicated list page. Each recurring transaction shows its name, amount, frequency, accounts, and next occurrence. Edits and deletes follow the three-scope model: this occurrence only, all future from a date, or the entire series. Recurring transactions appear in the card detail timeline as future projections.

---

## Task 1 — Recurring Transactions List Page

**Build the recurring transactions list with summary cards for each schedule.**

### What to Build

File: `/app/recurring/page.tsx` — Recurring Transactions page
File: `/components/transactions/RecurringList.tsx` — List component

### Layout (per UX spec §17.2)

```
┌──────────────────────────────────────┐
│ ‹ Back    Recurring Transactions  [+] │  ← Header with add button
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Rent                             │ │
│ │ £1,800.00 · Monthly · 1st       │ │
│ │ Monzo General → External         │ │
│ │ Next: 1 Jun 2026                 │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Weekly Spending                  │ │
│ │ £200.00 · Weekly · Monday        │ │
│ │ Monzo General → Monzo Spending   │ │
│ │ Next: 26 May 2026                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ YouTube                          │ │
│ │ £22.99 · Monthly · 15th          │ │
│ │ Monzo General → External         │ │
│ │ Next: 15 Jun 2026                │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Data Fetching (Server Component)

```typescript
// /app/recurring/page.tsx
export default async function RecurringTransactionsPage() {
  const supabase = createSupabaseServerClient()
  
  // Fetch all active recurring schedules
  const { data: schedules } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
  // Fetch account names for display
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency')
  
  // Compute next occurrence for each schedule
  const schedulesWithNext = schedules.map(s => ({
    ...s,
    nextOccurrence: getNextOccurrenceDate(s)  // from Sprint 2 utils
  }))
}
```

### List Item Component

File: `/components/transactions/RecurringListItem.tsx`

```typescript
interface RecurringListItemProps {
  schedule: RecurringSchedule
  fromAccountName: string
  toAccountName: string
  nextOccurrence: Date | null
  onPress: () => void   // Navigate to edit/detail
}
```

Each item shows:
- **Name** (or "Untitled" if null): 16px, weight 600
- **Amount · Frequency · Day anchor**: 14px, weight 500
  - Format: `£1,800.00 · Monthly · 1st`
  - Day anchor: for WEEKLY = "Monday", for MONTHLY = "15th", for FORTNIGHTLY skip
- **From → To**: 13px, muted
  - Format: "Monzo General → External"
- **Next occurrence**: 13px, muted
  - Format: "Next: 1 Jun 2026"
  - If no future occurrences (past end_date): "Ended"
  - If inactive: "Paused"

### Empty State

```
┌──────────────────────────────────────┐
│                                      │
│        No recurring transactions     │
│                                      │
│        Tap [+] to add one            │
│                                      │
└──────────────────────────────────────┘
```

### Styling

- Page: light background (#f2f2f7)
- Header: 22px, weight 700 title + [+] button (36px circle)
- Cards: border-radius 18px, white background, padding 16px 20px, subtle shadow
- Card spacing: 10px gap
- Name: 16px weight 600
- Meta row: 14px weight 500
- From → To: 13px, muted
- Next: 13px, muted, right-aligned or bottom-right

### Acceptance Criteria

- [ ] Page renders at `/recurring`
- [ ] All active recurring schedules displayed
- [ ] Each item shows: name, amount, frequency, day anchor, accounts, next occurrence
- [ ] "Untitled" shown when name is null
- [ ] "Ended" shown when no future occurrences
- [ ] Empty state when no schedules exist
- [ ] [+] button visible (wired in Task 3)
- [ ] Tapping item opens edit/detail (Task 5)
- [ ] NZD amounts shown as NZ$
- [ ] Build passes

**Output:** `TASK DONE: Recurring transactions list`

---

## Task 2 — Next Occurrence Date Display

**Compute and display the next occurrence date for each recurring schedule.**

### What to Build

File: `/lib/forecast/next-occurrence.ts` — Next occurrence helper

### Logic

```typescript
import { RecurringSchedule } from '@/types'
import { getFirstOccurrence, getNextOccurrence } from './recurring'
import { parseDate } from '@/lib/utils/dates'

export function getNextOccurrenceDate(
  schedule: RecurringSchedule,
  fromDate: Date = new Date()
): Date | null {
  // If schedule is inactive or has ended, return null
  if (!schedule.is_active) return null
  if (schedule.end_date && new Date(schedule.end_date) < fromDate) return null
  
  // Get the first occurrence (after start_date, weekday-adjusted)
  const firstDate = getFirstOccurrence(schedule)
  
  // If first occurrence is in the future (schedule hasn't started yet)
  if (firstDate > fromDate) return firstDate
  
  // Find the next occurrence after fromDate
  return getNextOccurrence(schedule, fromDate)
}
```

### Display Format

```typescript
export function formatNextOccurrence(date: Date | null): string {
  if (!date) return '—'
  
  const today = startOfDay(new Date())
  const diff = differenceInDays(date, today)
  
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return format(date, 'EEEE')  // "Monday"
  if (diff < 14) return `Next ${format(date, 'EEEE')}`  // "Next Monday"
  return format(date, 'd MMM yyyy')  // "1 Jun 2026"
}
```

### Integration

Call `getNextOccurrenceDate()` for each schedule when rendering the list. The function uses the occurrence generator from Sprint 2 (`/lib/forecast/recurring.ts`) which handles weekday_only, skips, and month-end rules.

If Sprint 2 is not complete, stub the function:
```typescript
// Stub: return start_date as next occurrence
// TODO: Sprint 2 — replace with real occurrence generator
```

### Acceptance Criteria

- [ ] Next occurrence computed for each schedule
- [ ] Respects weekday_only: adjusts weekend → Friday
- [ ] Handles schedules that haven't started yet (start_date in future)
- [ ] Handles schedules that have ended (returns null)
- [ ] Handles inactive schedules (returns null)
- [ ] Format: "Today", "Tomorrow", "Monday", "Next Monday", "1 Jun 2026"
- [ ] Stub works if Sprint 2 not complete
- [ ] Build passes

**Output:** `TASK DONE: Recurring transactions shown with next occurrence`

---

## Task 3 — Add Recurring Form

**Build the form to create a new recurring schedule with all frequency options.**

### What to Build

File: `/app/recurring/add/page.tsx` — Add Recurring page
File: `/components/transactions/RecurringForm.tsx` — Shared form component (used for add + edit)

### Layout

```
┌──────────────────────────────────────┐
│ ‹ Back    Add Recurring               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Name            Optional       › │ │  ← Text input
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Amount          £200.00_        › │ │  ← Number input, currency prefix
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ From            Monzo General  › │ │  ← Account picker
│ │ To              Monzo Spending › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Frequency       Monthly        › │ │  ← Frequency picker
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Day of Month    15th           › │ │  ← Shown for MONTHLY/QUARTERLY/BIANNUAL
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Day of Week     Monday         › │ │  ← Shown for WEEKLY only
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Start Date      Today, 20 May  › │ │  ← Date picker
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Weekday only    [Toggle OFF]     │ │  ← Toggle switch
│ └──────────────────────────────────┘ │
│                                      │
│          [ Add Recurring ]           │  ← Submit
└──────────────────────────────────────┘
```

### Dynamic Fields

The form adapts based on frequency selection:

| Frequency | Day Field |
|-----------|-----------|
| WEEKLY | Day of Week (Monday–Sunday picker) |
| FORTNIGHTLY | No day field (every 14 days from start) |
| MONTHLY | Day of Month (1–31 picker) |
| QUARTERLY | Day of Month (1–31 picker) |
| BIANNUAL | Day of Month (1–31 picker) |

### Component Interface

```typescript
interface RecurringFormProps {
  mode: 'add' | 'edit'
  initialValues?: Partial<RecurringSchedule>   // For edit mode
  onSubmit: (data: RecurringFormData) => Promise<void>
  onCancel: () => void
}

interface RecurringFormData {
  name: string | null
  from_account_id: string
  to_account_id: string
  amount: number                    // Base amount (first effective_change)
  currency_from: Currency           // Derived from From account
  currency_to: Currency             // Derived from To account
  frequency: Frequency
  day_of_week: number | null        // 0=Sun–6=Sat, only for WEEKLY
  day_of_month: number | null       // 1–31, for non-WEEKLY
  weekday_only: boolean
  start_date: string                // 'YYYY-MM-DD'
}
```

### Cross-Currency Support

When From and To accounts are in different currencies, show dual amount fields (same as Sprint 4 Add Transaction). The form component should reuse the cross-currency detection logic from Sprint 4.

For recurring schedules, the `effective_changes` JSONB stores both `amount_from` and `amount_to` in each change entry, supporting future amount changes on both sides.

### Frequency Picker

A simple selector showing the 5 options:

```
WEEKLY      — Every week on [day]
FORTNIGHTLY — Every 14 days
MONTHLY     — Every month on [day]
QUARTERLY   — Every 3 months on [day]
BIANNUAL    — Every 6 months on [day]
```

### Validation

- Amount > 0
- From account selected (not null)
- To account selected (not null)
- From ≠ To (cannot transfer to self)
- Frequency selected
- Day field valid for the frequency (e.g., day of week 0–6, day of month 1–31)
- Start date selected
- Cross-currency: both amounts > 0

### Persistence

```typescript
// /lib/db/recurring.ts
export async function createRecurringSchedule(data: RecurringFormData): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  
  // Build initial effective_change with the starting amount
  const initialChange: EffectiveChange = {
    effective_from: data.start_date,
    amount_from: data.amount,
    amount_to: data.isCrossCurrency ? data.amountTo : data.amount,
  }
  
  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .insert({
      name: data.name || null,
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      currency_from: data.currency_from,
      currency_to: data.currency_to,
      frequency: data.frequency,
      day_of_week: data.day_of_week,
      day_of_month: data.day_of_month,
      weekday_only: data.weekday_only,
      start_date: data.start_date,
      effective_changes: [initialChange],
      is_active: true,
    })
    .select('id')
    .single()
  
  if (error) throw error
  return schedule.id
}
```

### Acceptance Criteria

- [ ] Form renders at `/recurring/add`
- [ ] All frequency options available
- [ ] Day field adapts based on frequency selection
- [ ] WEEKLY shows day-of-week picker
- [ ] MONTHLY/QUARTERLY/BIANNUAL show day-of-month picker
- [ ] FORTNIGHTLY hides day field
- [ ] Weekday only toggle present (default OFF)
- [ ] Cross-currency detected → dual amount fields
- [ ] Validation prevents incomplete/invalid submissions
- [ ] Submit creates schedule in Supabase with initial effective_change
- [ ] Redirects to `/recurring` on success
- [ ] Build passes

**Output:** `TASK DONE: Add recurring form (with all frequency options)`

---

## Task 4 — Edit Recurring (Three Scopes)

**Build the edit flow with three scope options: this occurrence, all future, entire series.**

### What to Build

Modify: `/components/transactions/RecurringForm.tsx` — Add edit mode + scope selector
File: `/app/recurring/[id]/edit/page.tsx` — Edit Recurring page

### Edit Flow

1. User taps a recurring item in the list → navigates to edit page
2. Edit page shows the current schedule details + **scope selector**
3. User selects scope → form adapts

### Three Edit Scopes

```
┌──────────────────────────────────────┐
│ Edit Recurring                        │
│                                      │
│  Scope:                              │
│  ○ This occurrence only              │
│  ● All future from [1 Jul 2026 ›]    │  ← Default: next occurrence
│  ○ Entire series (all occurrences)   │
│                                      │
│  [The form fields, pre-filled...]    │
│                                      │
│          [ Save Changes ]            │
└──────────────────────────────────────┘
```

### Scope Behaviour

| Scope | What Happens | DB Operation |
|-------|-------------|-------------|
| This occurrence only | Creates an override for this specific date | INSERT into `recurring_overrides` |
| All future from [date] | Adds new effective_change from that date | UPDATE `effective_changes` JSONB |
| Entire series | Modifies all occurrences past and future | UPDATE the schedule row directly |

### Scope 1: This Occurrence Only

- Creates a row in `recurring_overrides`:
  ```typescript
  {
    recurring_id: scheduleId,
    original_date: '2026-06-01',    // The scheduled date being overridden
    override_date: '2026-06-02',    // Optional: change the date too
    amount_from: 200.00,            // New amount
    amount_to: 200.00,
    name: 'Changed name',           // Optional: change the name
  }
  ```
- The original schedule is unchanged — only this one occurrence is different
- User can change: amount, date, name
- Cannot change: frequency, accounts, weekday_only (those are series-level)

### Scope 2: All Future from [Date]

- Shows an **effective date picker** — defaults to the next occurrence date
- Adds a new entry to the `effective_changes` JSONB array:
  ```json
  {
    "effective_from": "2026-07-01",
    "amount_from": 1900.00,
    "amount_to": 1900.00
  }
  ```
- Past occurrences (before the effective date) keep their old amounts
- Future occurrences use the new amount
- User can change: amount, name (future only), weekday_only
- Cannot change: frequency, accounts (those require "Entire series")

### Scope 3: Entire Series

- Updates the schedule row directly
- Changes apply to ALL occurrences including historical
- User can change: amount, name, frequency, day_of_week/month, weekday_only
- Cannot change: from_account_id, to_account_id (would break history) — warn user to create new + delete old instead
- Effective_changes array is replaced with a single entry at the new amount

### Effective Date Prompt (Scope 2)

```
Apply changes from:
[1 Jul 2026 ›]
 ↑ Default: next occurrence date
```

The user can change this date. Changes apply from (and including) that date forward. The Budget recalculates from that date forward for both affected accounts.

### Form Pre-fill (Edit Mode)

- All fields pre-filled with current values
- Amount shows the **current effective amount** for today
- If effective_changes has multiple entries, show the one that applies now

### Persistence

```typescript
// /lib/db/recurring.ts

export async function editThisOccurrence(
  scheduleId: string,
  originalDate: string,
  override: { amount_from: number; amount_to: number; name?: string; override_date?: string }
): Promise<void> {
  // INSERT into recurring_overrides
}

export async function editAllFuture(
  scheduleId: string,
  effectiveFrom: string,
  newAmounts: { amount_from: number; amount_to: number }
): Promise<void> {
  // Fetch schedule
  // Append new effective_change to the JSONB array
  // UPDATE the schedule
}

export async function editEntireSeries(
  scheduleId: string,
  updates: Partial<RecurringSchedule>
): Promise<void> {
  // UPDATE the schedule row directly
}
```

### Acceptance Criteria

- [ ] Edit page shows three scope options
- [ ] Scope 1 (this occurrence): creates recurring_overrides row
- [ ] Scope 2 (all future): appends to effective_changes with effective date
- [ ] Scope 3 (entire series): updates schedule row directly
- [ ] Effective date picker visible for Scope 2
- [ ] Form pre-fills with current values
- [ ] Scope change adapts editable fields
- [ ] Cannot change from/to accounts for entire series (warn user)
- [ ] Budget recalculates from affected date forward after save
- [ ] Build passes

**Output:** `TASK DONE: Edit recurring (three scopes: this / future / all)`

---

## Task 5 — Delete Recurring (Three Scopes)

**Build the delete flow with three scope options + confirmation.**

### What to Build

Modify: `/app/recurring/[id]/edit/page.tsx` — Add delete flow
File: `/components/transactions/DeleteRecurringConfirm.tsx` — Confirmation dialog

### Delete Flow

1. User taps "Delete" on the edit screen (or swipe-to-delete on the list)
2. Confirmation dialog appears with scope options
3. User selects scope + confirms
4. Deletion executes → redirect to list

### Three Delete Scopes

| Scope | What Happens | DB Operation |
|-------|-------------|-------------|
| This occurrence only | Skips this specific date | INSERT into `recurring_skips` |
| All future from [date] | Sets end_date on the series | UPDATE `end_date` |
| Entire series | Removes all occurrences including history | DELETE schedule + related rows |

### Confirmation Dialog

```
┌──────────────────────────────────────┐
│ Delete Recurring Transaction?         │
│                                      │
│  Rent — £1,800.00 / Monthly          │
│                                      │
│  ○ Skip this occurrence (1 Jun 2026) │
│  ● End series after [1 Jul 2026 ›]   │
│  ○ Delete entire series              │
│                                      │
│  [Cancel]              [Delete]      │
└──────────────────────────────────────┘
```

### Scope 1: Skip This Occurrence

```typescript
// INSERT into recurring_skips
await supabase
  .from('recurring_skips')
  .insert({
    recurring_id: scheduleId,
    skip_date: occurrenceDate,  // The specific date to skip
  })
```

The series continues normally on subsequent occurrences. The skipped date is excluded from Budget calculations.

### Scope 2: End Series After [date]

```typescript
// UPDATE the schedule's end_date
await supabase
  .from('recurring_schedules')
  .update({ end_date: selectedDate })
  .eq('id', scheduleId)
```

Occurrences on or before the end_date continue. Occurrences after the end_date are excluded. Historical occurrences are preserved.

The date picker defaults to the **most recent past occurrence** (or "now" if none past). This means:
- If the user wants to stop the series now, they set end_date to today
- If they want one more occurrence, they set it after the next one

### Scope 3: Entire Series

```typescript
// DELETE the schedule (CASCADE deletes skips and overrides)
await supabase
  .from('recurring_schedules')
  .delete()
  .eq('id', scheduleId)
```

**Confirmation required:** "This will remove all history for this transaction. This cannot be undone." — double confirmation for this scope.

Note: Does NOT delete stored RECURRING_INSTANCE transactions that were already written to the transactions table (historical instances from CSV seed). Those remain. Only the schedule and its future projections are removed.

### Styling

- Confirmation dialog: overlay with centred card
- Title: 18px, weight 700
- Schedule summary: name, amount, frequency — shown so user knows what they're deleting
- Scope options: radio buttons with labels
- "Delete entire series" in red/destructive styling
- Delete button: destructive (red) for entire series, neutral for other scopes

### Acceptance Criteria

- [ ] Delete accessible from edit screen
- [ ] Three delete scopes offered
- [ ] Scope 1: creates skip for specific date
- [ ] Scope 2: sets end_date on series
- [ ] Scope 3: deletes entire schedule (CASCADE)
- [ ] Scope 3 requires double confirmation
- [ ] Confirmation dialog shows schedule name/amount/frequency
- [ ] Stored historical transactions preserved on Scope 3 delete
- [ ] Budget recalculates after any delete
- [ ] Cancel dismisses dialog without changes
- [ ] Build passes

**Output:** `TASK DONE: Delete recurring (three scopes)`

---

## Task 6 — Weekday-Only Toggle in Edit

**Implement the weekday-only toggle in both add and edit forms.**

### What to Build

This is a partial task — the toggle is already in the add form (Task 3). This task ensures it works end-to-end:

- Add form: toggle visible, default OFF
- Edit form (Scope 3 — entire series): toggle editable
- Edit form (Scope 2 — all future): toggle editable, applies from effective date
- Edit form (Scope 1 — this occurrence): toggle hidden (applies to the override only via manual date change)

### Toggle Behaviour

```
Weekday only    [OFF ●]
               When ON, moves weekend
               occurrences to the Friday
               before
```

### Effect on Occurrences

When `weekday_only = true`:
- Saturday scheduled dates → move to Friday
- Sunday scheduled dates → move to Friday
- Bank holidays → move to day before (recursive)
- Uses the `applyWeekdayRule()` function from Sprint 2

When `weekday_only = false`:
- Transaction falls on the scheduled date regardless of day

### Storage

- Stored as `weekday_only` boolean on `recurring_schedules`
- Scope 2 (all future): changing this adds a note to the effective_changes? No — weekday_only is a schedule-level property, not an amount. For now, changing it for "all future" updates the schedule row and a comment is stored as metadata.
- Simplification: weekday_only only editable with Scope 3 (entire series). For Scope 2, show it as read-only with a note: "Change the weekday rule for all future occurrences in Entire Series mode."

### Acceptance Criteria

- [ ] Toggle visible in add form (default OFF)
- [ ] Toggle editable when editing entire series
- [ ] Toggle shown as read-only for "this occurrence" and "all future" scopes
- [ ] When ON: description text visible explaining the Friday rule
- [ ] Saved value persists to Supabase
- [ ] Next occurrence calculation respects the toggle
- [ ] Build passes

**Output:** `TASK DONE: Weekday-only toggle`

---

## Task 7 — Recurring in Timeline + Integration

**Show recurring transactions in the card detail timeline and wire everything together.**

### What to Build

Modify: `/components/transactions/TransactionTimeline.tsx` (Sprint 3) — Add recurring occurrences
File: `/lib/forecast/timeline-helpers.ts` — Merge stored + recurring into timeline

### Merging Stored and Recurring

The timeline shows both stored transactions and future recurring projections:

```typescript
export function mergeTransactionsAndOccurrences(
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[],
  accountId: string,
  fromDate: Date,
  toDate: Date
): TimelineEntry[] {
  
  // 1. Start with stored transactions
  const entries: TimelineEntry[] = storedTransactions
    .filter(tx => isWithinRange(tx.transaction_date, fromDate, toDate))
    .map(tx => ({
      ...tx,
      isRecurring: !!tx.recurring_id,
      source: 'stored' as const,
    }))
  
  // 2. Generate recurring occurrences for each active schedule
  for (const schedule of recurringSchedules) {
    if (!schedule.is_active) continue
    
    // Only schedules affecting this account
    if (schedule.from_account_id !== accountId && 
        schedule.to_account_id !== accountId) continue
    
    const occurrences = generateOccurrences(
      schedule, fromDate, toDate, recurringSkips, recurringOverrides
    )
    
    for (const occ of occurrences) {
      // Skip if a stored RECURRING_INSTANCE already exists for this date+schedule
      const alreadyStored = storedTransactions.some(tx =>
        tx.recurring_id === schedule.id &&
        isSameDay(tx.transaction_date, occ.date)
      )
      
      if (!alreadyStored) {
        entries.push({
          date: occ.date,
          name: schedule.name,
          from_account_id: schedule.from_account_id,
          to_account_id: schedule.to_account_id,
          amount_from: fromDecimal(occ.amount_from),
          amount_to: fromDecimal(occ.amount_to),
          currency_from: schedule.currency_from,
          currency_to: schedule.currency_to,
          isRecurring: true,
          recurring_id: schedule.id,
          source: 'generated' as const,
        })
      }
    }
  }
  
  // 3. Sort by date
  return entries.sort((a, b) => compareAsc(a.date, b.date))
}
```

### Duplicate Prevention

The guard `alreadyStored` prevents double-counting. When a RECURRING_INSTANCE was written to the transactions table (from CSV seed), it already represents that occurrence. The generator should not create a duplicate for the same schedule on the same date.

### Timeline Markers

Recurring entries in the timeline are indistinguishable from stored transactions — same visual treatment. The mockup shows future entries at 50% opacity regardless of whether they're stored ONE_OFFs or generated recurring instances.

### Integration Checklist

- [ ] Recurring list page accessible from side menu (or direct `/recurring`)
- [ ] Add form creates schedules that immediately appear in the list
- [ ] Edit flow works for all three scopes
- [ ] Delete flow works for all three scopes
- [ ] Card detail timeline shows recurring occurrences as future entries
- [ ] No double-counting of stored + generated occurrences
- [ ] Budget recalculates after any add/edit/delete of recurring
- [ ] TypeScript strict: zero errors
- [ ] `npm run build` exits 0

### Acceptance Criteria

- [ ] Recurring occurrences appear in card detail timeline
- [ ] Future recurring shown at 50% opacity (same as other future entries)
- [ ] No duplicate entries for stored RECURRING_INSTANCE
- [ ] List → Add → Create → List flow works end-to-end
- [ ] List → Edit (any scope) → Save → List flow works
- [ ] List → Delete (any scope) → Confirm → List flow works
- [ ] Budget values update after recurring changes
- [ ] Build passes

**Output:** `TASK DONE: Recurring transactions shown in timeline`

---

## Sprint 6 Definition of Done

All 7 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] `/recurring` shows all active schedules with name, amount, frequency, next occurrence
- [ ] `/recurring/add` creates new schedules with correct frequency + day fields
- [ ] Edit supports three scopes: this occurrence (override), all future (effective_changes), entire series (row update)
- [ ] Delete supports three scopes: skip this, end after date, delete entire series
- [ ] Effective date prompt shown for "all future" scope
- [ ] Weekday-only toggle functional in add and edit
- [ ] Recurring occurrences visible in card detail timeline
- [ ] No duplicate entries (stored RECURRING_INSTANCE + generated)
- [ ] Budget recalculates after any recurring change
- [ ] Cross-currency recurring: dual amount fields, stored in effective_changes
- [ ] All amounts use decimal.js, NZ$ prefix, debit bracket notation
- [ ] TypeScript strict: zero errors

---

## Notes for Claude

- **The three-scope model is the heart of this sprint.** Every edit and delete offers three choices. Don't collapse them into one "just edit it" flow — the scopes are fundamentally different database operations.
- **Scope 1 = recurring_overrides table.** Creates a one-off exception for a specific date.
- **Scope 2 = effective_changes JSONB.** Appends a new amount version from an effective date. The resolution logic ("largest effective_from ≤ date") is in Sprint 2.
- **Scope 3 = raw row update/delete.** Changes everything including history.
- **Sprint 2 dependency:** The occurrence generator (`generateOccurrences`) and `getNextOccurrence()` are used throughout this sprint. If Sprint 2 is not complete, stub these functions. The list + forms still work — you just won't see generated future occurrences in the timeline.
- **Recurring schedules are NOT pre-generated** into the transactions table (per data model spec §4.4). They are calculated on the fly. The only exception is historical RECURRING_INSTANCE records from the CSV seed.
- **Cross-currency recurring:** When From and To currencies differ, `effective_changes` stores both `amount_from` and `amount_to`. The add/edit forms must show dual amount fields (same as Sprint 4).
- **When done with each task, output:** `TASK DONE: [exact task name]`.
- **If spec is unclear, output:** `SPEC GAP: [description]` and stop.
- **If you see an issue, output:** `ISSUE: [description]` with reasoning.
