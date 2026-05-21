# Sprint 4 — Add Transaction
> Phase 1 MVP | Est. Week 4–5 | 7 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, non-negotiables
2. **TRACKER.md** (root) — Sprint progress
3. **UX Mockups** — Visual reference for Add Transaction screen:
   - `/Users/raymckenzie/Documents/Claude/Projects/budget-app/mock ups/oovy-ray-iphone-v3.html` (Screen 3: Add Transaction, lines ~1199–1248)
4. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §8 — **primary authority**
   - `oovy-ray-forecast-engine-spec.md` §5 (transaction types), §7 (recalculation triggers)
   - `oovy-ray-data-model-spec.md` §3 (transaction schema)
5. **Existing components:** `/components/ui/AmountDisplay.tsx` (Sprint 3), `/lib/utils/money.ts` (Sprint 2)

---

## Sprint Goal

Build the Add Transaction panel for iPhone. Users can add transactions between accounts. Cross-currency transfers are detected automatically and show dual amount fields. The form pre-fills contextually based on where the user came from (home vs card detail). On submit, the transaction is persisted to Supabase and the forecast recalculates.

**This is the first sprint that writes to the database.**

---

## Task 1 — Add Transaction Page + Panel Shell

**Create the Add Transaction page with slide-in panel and basic form structure.**

### What to Build

File: `/app/add/page.tsx` — Add Transaction page
File: `/components/transactions/AddTransactionPanel.tsx` — Form panel component
File: `/components/ui/Panel.tsx` — Reusable slide-in panel wrapper (if not yet built)

### Entry Points

Two entry points, which determine initial context:

| Entry Point | From Account | To Account | Return Route |
|-------------|-------------|------------|-------------|
| Home [+] | Empty | Empty | `/` |
| Card Detail [+] | Pre-filled (this account) | Empty | `/accounts/[id]` |

Context is passed via query params: `/add?fromAccountId=abc123&returnTo=/accounts/abc123`

### Panel Layout

```
┌──────────────────────────────────────┐
│ Add Transaction               Cancel │  ← Header
│                                      │
│  £200.00_                            │  ← Amount, large, cursor blinking, auto-focus
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ From    Monzo General          › │ │  ← Pre-filled if from card
│ │ To      Monzo Spending         › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Date    Today, 20 May 2026     › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Note    Optional               › │ │
│ └──────────────────────────────────┘ │
│                                      │
│         [ Add Transaction ]          │  ← Submit button
└──────────────────────────────────────┘
```

### Component Structure

```typescript
// /app/add/page.tsx — Client Component
'use client'

export default function AddTransactionPage() {
  const searchParams = useSearchParams()
  const fromAccountId = searchParams.get('fromAccountId')
  const returnTo = searchParams.get('returnTo') || '/'
  const router = useRouter()
  
  // Fetch accounts from Supabase (client-side)
  // Render AddTransactionPanel
  
  function handleCancel() {
    router.push(returnTo)
  }
  
  function handleSubmit(transaction: NewTransaction) {
    // Insert into Supabase
    // Trigger forecast recalculation
    // Navigate back to returnTo
  }
}
```

### AddTransactionPanel State

```typescript
interface AddTransactionState {
  amount: string                    // Raw input as user types (e.g. "200" or "200.50")
  fromAccountId: string | null      // null = not selected
  toAccountId: string | null
  date: Date                        // Default: today
  note: string                      // Default: empty
  isValid: boolean                  // Computed: amount > 0 AND both accounts selected AND accounts differ
}
```

### Validation Rules

- **Submit disabled until:**
  - Amount > 0 (numeric, not empty)
  - From account selected (not null)
  - To account selected (not null)
  - From account ≠ To account (cannot transfer to self)
- **Note field:** always optional, never blocks submit
- **Date:** always valid (defaults to today, can be changed)

### Styling

- **Background:** Full screen overlay or page, light mode (#f2f2f7)
- **Header:** "Add Transaction" (22px, weight 700) + "Cancel" (16px, muted, tappable)
- **Amount input:** Large (38px, weight 700), no visible input border, cursor blinking animation. Prefix `£` or `NZ$` based on From account currency (once From is selected). Before From is selected, show `£` as default.
- **Form rows:** Grouped sections with rounded borders (16px), semi-transparent backgrounds. Each field: label left, value/chevron right. 1px separator between fields in same group.
- **Submit button:** 58px height, border-radius 18px, solid dark background (black or near-black), white text, 17px weight 700. Disabled state: opacity 40%.
- Same light mode tokens as Sprint 3

### Acceptance Criteria

- [ ] Page renders at `/add` 
- [ ] `/add?fromAccountId=xxx` pre-fills From field
- [ ] Cancel navigates back to `returnTo` param or `/` default
- [ ] Amount field auto-focused on open (keyboard up on mobile)
- [ ] Submit disabled when form incomplete
- [ ] Submit disabled when From = To (self-transfer)
- [ ] Header layout matches mockup
- [ ] Build passes

**Output:** `TASK DONE: Add Transaction panel (same-currency)`

---

## Task 2 — Account Picker Component

**Build the account picker — grouped list, GBP/NZD sections, current selection highlighted.**

### What to Build

File: `/components/accounts/AccountPicker.tsx`

### Behaviour

Tapping "From" or "To" field opens a scrollable account picker:

```
┌──────────────────────────────────────┐
│ Select Account                 Done   │  ← Header
│                                      │
│ GBP                                  │  ← Section header, muted, uppercase
│ ┌──────────────────────────────────┐ │
│ │ Monzo General                    │ │  ← Selected: checkmark right
│ │ Monzo Spending                   │ │
│ │ Monzo Bills                      │ │
│ │ Monzo Rent + Expenses            │ │
│ │ Monzo Savings                    │ │
│ │ Rent Deposit                     │ │
│ │ Monzo NZ House                   │ │
│ │ Ray Revolut                      │ │
│ │ Olivia Owed                      │ │
│ │ Ray Owed                         │ │
│ │ Monzo Student Loan               │ │  ← TRACKING: subtle indicator
│ └──────────────────────────────────┘ │
│                                      │
│ NZD                                  │
│ ┌──────────────────────────────────┐ │
│ │ Olivia Revolut                   │ │
│ │ NZ Savings                       │ │
│ │ NZ Credit Card                   │ │
│ │ NZ House                         │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Component Interface

```typescript
interface AccountPickerProps {
  accounts: Account[]           // All non-archived, non-system accounts
  selectedId: string | null     // Currently selected (for display)
  excludeId?: string            // Don't show this account (prevent self-select)
  onSelect: (account: Account) => void
  onClose: () => void
}
```

### Rules

- **Grouped by currency:** GBP section first, then NZD
- **External account never shown**
- **Archived accounts never shown**
- **excludeId:** When picking "To" account, the selected "From" account should be excluded (and vice versa). Pass the other field's selected ID as `excludeId`.
- **Currently selected:** Highlighted with checkmark or subtle background
- **TRACKING accounts:** Shown with subtle "(Tracking)" label or muted indicator
- **Single tap** selects and closes picker immediately (no "Done" required)
- **Each account shows:** Name (14px, weight 500) + currency badge (10px, muted)

### Styling

- Full-screen modal or bottom sheet
- White background with frosted blur
- Section headers: 11px, weight 600, uppercase, muted
- Rows: 52px height, bottom border at 5% opacity
- Selected row: subtle background highlight

### Acceptance Criteria

- [ ] Picker opens as modal/bottom sheet
- [ ] Accounts grouped by currency (GBP first, NZD second)
- [ ] External account not shown
- [ ] Archived accounts not shown
- [ ] excludeId prevents selecting same account for both From and To
- [ ] Currently selected account highlighted
- [ ] Single tap selects and closes
- [ ] Tracking accounts shown with subtle indicator
- [ ] Build passes

**Output:** `TASK DONE: Account picker (grouped GBP/NZD)`

---

## Task 3 — Cross-Currency Detection + Dual Amount Fields

**Automatically detect cross-currency transfers and show dual amount fields.**

### What to Build

Modify `/components/transactions/AddTransactionPanel.tsx`

### Detection Logic

When both From and To accounts are selected, compare their currencies:

```typescript
const isCrossCurrency = useMemo(() => {
  if (!fromAccount || !toAccount) return false
  return fromAccount.currency !== toAccount.currency
}, [fromAccount, toAccount])
```

### Single-Currency Layout (same currency)

```
│  £200.00_                            │  ← One amount field
```

### Cross-Currency Layout (different currencies)

```
│  Amount Out   £450.00_               │  ← GBP leaving From account
│  Amount In    NZ$950.00_             │  ← NZD entering To account
```

**Key rules from spec §8.3:**
- Both amounts entered **manually** — no auto-conversion
- App **never calculates or stores implied exchange rate**
- Exchange rate setting is not used here
- Each side is stored independently: `amount_from` and `amount_to`

### State Changes

```typescript
// Single currency: one amount string
amount: string

// Cross-currency: two amount strings
amountFrom: string    // In From account currency
amountTo: string      // In To account currency
```

### Switching Between Modes

- When user changes account selections, recalculate `isCrossCurrency`
- If switching **to** cross-currency: split the current `amount` into both fields (user must adjust)
- If switching **from** cross-currency to single: keep `amountFrom` as the amount (both sides were same currency anyway, so either is fine)
- The currency prefix on each amount field matches the account: GBP = `£`, NZD = `NZ$`

### Validation (cross-currency)

- Both amount_out > 0 AND amount_in > 0 required
- Submit disabled until both fields have positive values

### Styling

- Two amount fields stacked vertically
- Each: label above (12px, uppercase, muted), amount below (38px, weight 700)
- Labels: "Amount Out" and "Amount In" — clear which is which
- Currency prefix inline with amount

### Acceptance Criteria

- [ ] Cross-currency detected automatically when From and To currencies differ
- [ ] Dual amount fields appear (Amount Out + Amount In)
- [ ] Currency prefix matches each account's currency
- [ ] Both fields required for cross-currency submit
- [ ] Switching accounts updates detection immediately
- [ ] No auto-conversion ever
- [ ] Build passes

**Output:** `TASK DONE: Cross-currency detection and dual amount fields`

---

## Task 4 — Date Picker Component

**Build the date picker for selecting transaction date.**

### What to Build

File: `/components/ui/DatePicker.tsx`

### Behaviour

Tapping the "Date" field opens a date picker. The mockup shows it as another row in the form — tapping opens the picker.

### Date Rules (from spec §8.5)

- **Defaults to today** when Add Transaction opens
- **Can be backdated** — no minimum restriction for ad-hoc transfers. The spec says "minimum: today (no restriction for ad-hoc transfers)" — meaning today is suggested but the user can pick any date back to the opening date.
- **Minimum date:** Opening date (1 Aug 2024) — cannot backdate before the system was created
- **Future dates allowed** — creates a planned one-off transaction
- **Maximum date:** No hard maximum, but practically limited to 18 months from today (match grid range)

### Component Interface

```typescript
interface DatePickerProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date     // Default: 2024-08-01 (opening date)
  maxDate?: Date     // Default: 18 months from today
}
```

### Display Format

When closed, the date field shows:
- If today: "Today, 20 May 2026"
- If tomorrow: "Tomorrow, 21 May 2026"
- If yesterday: "Yesterday, 19 May 2026"
- Otherwise: "20 May 2026" (day month year)

### Implementation

**Option A (recommended for Sprint 4):** Use native HTML `<input type="date">` in a modal overlay. Fast, accessible, handles all date logic natively.

```typescript
// Simple approach:
<input 
  type="date" 
  value={format(value, 'yyyy-MM-dd')}
  min="2024-08-01"
  onChange={(e) => onChange(new Date(e.target.value))}
/>
```

**Option B:** Custom iOS-style date picker (scrolling wheels). More work. Defer to a polish sprint if desired.

### Styling

The "Date" field is a form row matching the From/To row style:
- Label left: "Date"
- Value right: formatted date string + chevron `›`
- Tapping the row opens the picker

### Acceptance Criteria

- [ ] Date field defaults to today
- [ ] Tapping opens date picker
- [ ] Can select past dates back to opening date (1 Aug 2024)
- [ ] Can select future dates
- [ ] Display format: "Today, 20 May 2026" / "Yesterday, ..." / "Tomorrow, ..." or plain date
- [ ] Selected date reflects immediately in the field
- [ ] Build passes

**Output:** `TASK DONE: Date picker (with backdating rules)`

---

## Task 5 — Context-Aware Pre-Fill + Dismissal

**Implement the context-aware pre-fill based on entry point, and correct return navigation.**

### What to Build

Modify `/app/add/page.tsx` — enhance the existing entry point logic.

### Entry Point Behaviour

| Entry Point | From Account | To Account | Amount | Date | After Submit |
|-------------|-------------|------------|--------|------|-------------|
| Home [+] | Empty | Empty | Empty | Today | Return to `/` |
| Card Detail [+] | This account | Empty | Empty | Today | Return to `/accounts/[id]` |
| Grid cell tap (future) | This account | Empty | Empty | Cell's date | Return to iPad grid |

### Context from URL Params

```
/add                                    → Home entry: all empty
/add?fromAccountId=abc123              → Card detail entry: From pre-filled
/add?fromAccountId=abc123&date=2026-06-15  → Grid entry: From + Date pre-filled
```

The `returnTo` param controls where to go after submit/cancel:

```typescript
const returnTo = searchParams.get('returnTo') || '/'
```

### Pre-Fill Logic

When `fromAccountId` is provided:
1. Fetch the account record from Supabase (or get from passed props)
2. Set `fromAccountId` in form state
3. Set the amount currency prefix to match the From account's currency
4. Do NOT pre-fill the To account — user must choose

When `date` is provided:
1. Parse the date string
2. Set `date` in form state

### Dismissal

- **Cancel button:** Navigates to `returnTo` without saving
- **After successful submit:** Navigates to `returnTo`
- **Back gesture (iOS swipe):** Same as cancel — no save

### Edge Cases

- URL params for a non-existent account ID → ignore, leave field empty
- `fromAccountId` is the EXTERNAL account → ignore (External should never be pre-filled as From for user-initiated transactions)
- `returnTo` is an invalid path → default to `/`

### Acceptance Criteria

- [ ] Home [+] → all fields empty, return to `/`
- [ ] Card detail [+] → From pre-filled with that account, return to `/accounts/[id]`
- [ ] Card detail [+] correctly shows the card's currency as amount prefix
- [ ] Grid entry (if wired) → From + Date pre-filled
- [ ] Cancel always returns to correct origin
- [ ] After submit, returns to correct origin
- [ ] Invalid account IDs in URL params handled gracefully
- [ ] External account never pre-filled as From
- [ ] Build passes

**Output:** `TASK DONE: Context-aware pre-fill (from card vs. from home) + dismissal`

---

## Task 6 — Transaction Persistence + Supabase Insert

**Insert the transaction into Supabase and handle the response.**

### What to Build

File: `/lib/db/transactions.ts` — Transaction database operations
Modify `/app/add/page.tsx` — Wire submit to DB

### Database Operations Module

```typescript
// /lib/db/transactions.ts
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { NewTransaction } from '@/types'

export async function insertTransaction(tx: NewTransaction): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      name: tx.name || null,
      type: tx.type,
      from_account_id: tx.from_account_id,
      to_account_id: tx.to_account_id,
      amount_from: tx.amount_from,
      amount_to: tx.amount_to,
      currency_from: tx.currency_from,
      currency_to: tx.currency_to,
      transaction_date: tx.transaction_date,
      recurring_id: tx.recurring_id || null,
      is_adjustment: tx.is_adjustment || false,
      note: tx.note || null,
    })
    .select('id')
    .single()
  
  if (error) throw error
  return data.id
}
```

### Submit Handler Logic

```typescript
async function handleSubmit() {
  // 1. Determine transaction type
  const type = determineTransactionType(fromAccount, toAccount, date, isCrossCurrency)
  // - Default: 'TRANSFER'
  // - Future date + no recurring link: 'ONE_OFF'
  // - If fromAccount is External: 'ADJUSTMENT' (or handle differently)

  // 2. Build NewTransaction object
  const tx: NewTransaction = {
    name: note || null,
    type,
    from_account_id: fromAccountId!,
    to_account_id: toAccountId!,
    amount_from: parseFloat(amountFrom),
    amount_to: parseFloat(amountTo),
    currency_from: fromAccount!.currency,
    currency_to: toAccount!.currency,
    transaction_date: format(date, 'yyyy-MM-dd'),
    recurring_id: null,
    is_adjustment: false,
    note: note || null,
  }

  // 3. Insert into Supabase
  await insertTransaction(tx)

  // 4. Trigger forecast recalculation
  // TODO: Sprint 2 — call forecastStore.invalidate(fromAccountId) + invalidate(toAccountId)

  // 5. Navigate back
  router.push(returnTo)
}
```

### Transaction Type Determination

```typescript
function determineTransactionType(
  fromAccount: Account,
  toAccount: Account,
  date: Date,
  wasFromExternal: boolean
): TransactionType {
  // If entering from External → this is an ADJUSTMENT (manual overspend fix)
  if (fromAccount.is_system) return 'ADJUSTMENT'
  
  // If date is in the future → planned ONE_OFF
  if (isAfter(date, new Date())) return 'ONE_OFF'
  
  // Default: TRANSFER
  return 'TRANSFER'
}
```

### Amount Storage

- **Same-currency:** `amount_from = amount_to` (same value in same currency)
- **Cross-currency:** `amount_from` and `amount_to` are different values — stored independently
- Both stored as DECIMAL-compatible numbers (e.g., 200.00 not "200" or 20000)
- `currency_from` and `currency_to` always set from the account records

### Error Handling

- Network failure → show inline error message, don't navigate away
- Supabase insert failed → show error, keep form state so user can retry
- Validation failed → submit button already disabled, but double-check server-side

### Acceptance Criteria

- [ ] Transaction persisted to Supabase `transactions` table on submit
- [ ] All required fields present in insert (from, to, amounts, currencies, date, type)
- [ ] `different_accounts` constraint respected (From ≠ To)
- [ ] `positive_amounts` constraint respected (amounts > 0)
- [ ] Transaction type correctly set (TRANSFER / ONE_OFF / ADJUSTMENT)
- [ ] Insert error shown to user, form state preserved for retry
- [ ] Successful insert navigates back to origin
- [ ] Build passes

**Output:** `TASK DONE: Transaction persistence to Supabase`

---

## Task 7 — Post-Submit: Forecast Recalculation + Navigation

**Wire up forecast invalidation after transaction insert and ensure smooth UX.**

### What to Build

Modify `/app/add/page.tsx` — add post-submit recalculation trigger
File: `/hooks/useForecast.ts` — Forecast store hook (if not already created in Sprint 2)

### Forecast Store (if Sprint 2 created it)

```typescript
// /hooks/useForecast.ts
import { create } from 'zustand'

interface ForecastStore {
  version: number          // Increment on any invalidation → triggers re-fetch
  invalidate: (accountIds: string[]) => void
}

export const useForecastStore = create<ForecastStore>((set) => ({
  version: 0,
  invalidate: (accountIds) => set((s) => ({ version: s.version + 1 })),
}))
```

**If Sprint 2 forecast store doesn't exist yet:**
- Create a minimal store stub with `version` counter and `invalidate()` method
- Home screen and card detail can subscribe to `version` and re-fetch when it changes
- This is forward-compatible — when Sprint 2 engine is plugged in, it just works

### Recalculation Flow

1. User submits transaction → insert succeeds
2. Call `forecastStore.invalidate([fromAccountId, toAccountId])`
3. Navigate back to `returnTo`
4. Home screen / card detail detect version change → re-fetch data
5. Re-fetch triggers `calculateBudget()` (or placeholder) → new values render

### Post-Submit UX

- Brief loading state on the submit button (spinner or "Adding...")
- On success: navigate back immediately (the destination page will show fresh data on load)
- On failure: stay on form, show error
- No toast or confirmation — the transaction appearing in the timeline IS the confirmation

### Navigation After Submit

```typescript
async function handleSubmit() {
  setIsSubmitting(true)
  try {
    await insertTransaction(tx)
    forecastStore.invalidate([fromAccountId, toAccountId])
    router.push(returnTo)  // Navigate back — data will be fresh on re-render
  } catch (err) {
    setError('Failed to add transaction. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
```

### Acceptance Criteria

- [ ] Transaction inserts and navigates back to origin screen
- [ ] Forecast store invalidation triggered for both affected accounts
- [ ] Origin screen shows updated data (new transaction visible in timeline)
- [ ] Submit button shows loading state during insert
- [ ] Errors shown inline, form state preserved
- [ ] No navigation on error
- [ ] Build passes

**Output:** `TASK DONE: Forecast recalculation on submit`

---

## Sprint 4 Definition of Done

All 7 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] Add Transaction page renders at `/add`
- [ ] Amount field auto-focused with keyboard up
- [ ] Account picker shows grouped accounts (GBP/NZD, no External, no archived)
- [ ] From/To pre-fills correctly from card detail entry point
- [ ] Cross-currency detected → dual amount fields appear
- [ ] Same-currency: single amount, single currency prefix
- [ ] Date picker: defaults to today, allows backdating to opening date, allows future dates
- [ ] Submit disabled until form is complete and valid
- [ ] Self-transfer prevented (From ≠ To)
- [ ] Transaction persists to Supabase with correct type, amounts, currencies
- [ ] Cancel and submit both navigate back to correct origin
- [ ] Forecast invalidation triggered on submit
- [ ] NZD amounts: NZ$ prefix everywhere
- [ ] Debit/credit display consistent with Sprint 3 conventions
- [ ] No red/green colour coding on any amount
- [ ] TypeScript strict: zero errors

---

## Notes for Claude

- **This is the first write sprint.** Until now we've only read from the DB. Ensure RLS policies allow inserts for the authenticated user.
- **decimal.js everywhere.** When receiving user input (string → number), parse with decimal.js. When sending to Supabase, send as number (Supabase handles DECIMAL(12,2)). When displaying, use AmountDisplay from Sprint 3.
- **Amount storage:** `amount_from` and `amount_to` in the DB are DECIMAL(12,2). Store as numbers, not strings. The JS number 200.00 is fine — Postgres handles the precision.
- **Cross-currency rule is ironclad:** Never auto-convert. Never store implied rate. Two amounts entered manually, two amounts stored independently.
- **External account:** Can appear as the "To" account (for bills, subscriptions, etc.) but NEVER as the "From" account (user can't pull money from External).
- **Context-aware pre-fill:** The `fromAccountId` and `returnTo` query params are the contract between screens. Don't break this contract.
- **When done with each task, output:** `TASK DONE: [exact task name]`
- **If spec is unclear, output:** `SPEC GAP: [description]` and stop.
