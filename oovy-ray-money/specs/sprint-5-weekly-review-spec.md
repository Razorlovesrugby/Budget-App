# Sprint 5 — Weekly Review
> Phase 1 MVP | Est. Week 5–6 | 7 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, non-negotiables
2. **TRACKER.md** (root) — Sprint progress
3. **UX Mockups** — Visual reference for review flow:
   - `/Users/raymckenzie/Documents/Claude/Projects/budget-app/mock ups/oovy-ray-iphone-v3.html`
     - Screen 4: Weekly Review (lines ~1253–1289)
     - Screen 5: Review Summary (lines ~1291–1361)
4. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §9, §10 — **primary authority**
   - `oovy-ray-forecast-engine-spec.md` §9 (comparison engine)
   - `oovy-ray-data-model-spec.md` §5 (review schema)
5. **Existing components:** `/components/ui/AmountDisplay.tsx`, `/lib/utils/money.ts`

---

## Sprint Goal

Build the complete Weekly Review flow on iPhone. Users confirm the review date, then swipe through account flashcards entering current balances. Live variance shows against the Budget. A summary screen shows savings projections and cash balance totals. Reviews are persisted to Supabase.

**Golden rule: The Weekly Review never modifies the Budget. It is a comparison and snapshot tool only.**

---

## Task 1 — Review Date Confirmation Screen

**Build the entry screen where the user confirms or changes the review date.**

### What to Build

File: `/app/review/page.tsx` — Weekly Review page
File: `/components/review/ReviewDateConfirm.tsx` — Date confirmation component

### Layout (per UX spec §9.2)

```
┌──────────────────────────────────────┐
│ Weekly Review                         │
│                                      │
│  Review Date                         │  ← Section label, muted
│  Today, 20 May 2026                  │  ← Default, prominent
│                                      │
│  [ Change Date ]                     │  ← Text button, opens date picker
│                                      │
│  Last review: 13 May 2026            │  ← Context, muted
│                                      │
│         [ Continue → ]               │  ← Full-width button
└──────────────────────────────────────┘
```

### Date Rules (from spec §9.2)

- **Defaults to today**
- **Can backdate** — but minimum is **last completed review date + 1 day**
- **Cannot backdate to or before the last review date** — prevents duplicate reviews
- **Cannot select a future date** — review is always for today or a past date
- **Last review date** fetched from Supabase: `SELECT MAX(review_date) FROM reviews`

### Component Interface

```typescript
interface ReviewDateConfirmProps {
  lastReviewDate: string | null    // null = first review ever
  onContinue: (reviewDate: Date) => void
}
```

### Logic

```typescript
// Fetch last review date
const { data: lastReview } = await supabase
  .from('reviews')
  .select('review_date')
  .order('review_date', { ascending: false })
  .limit(1)
  .single()

const minDate = lastReview 
  ? addDays(new Date(lastReview.review_date), 1) 
  : new Date('2024-08-01')  // Opening date if first review

const maxDate = new Date()  // Today — can't review the future
```

### Date Picker

Reuse the DatePicker from Sprint 4 (`/components/ui/DatePicker.tsx`). Configure with:
- `minDate`: last review + 1 day (or opening date)
- `maxDate`: today

### Styling

- Full page, light background
- Title: 22px, weight 700
- Review date: 22px, weight 600, primary colour
- "Change Date": 14px, tappable, accent colour
- "Last review": 13px, muted
- Continue button: 58px height, border-radius 18px, solid dark, white text, 17px weight 700
- Padding: 24px horizontal

### Edge Cases

- **First review ever:** "Last review: None" or hide the last review line
- **Review already completed today:** Show message "Review already completed for today" with disabled Continue button
- **No reviews table rows:** Handle gracefully — this is the first review

### Acceptance Criteria

- [ ] Page renders at `/review`
- [ ] Today's date shown as default review date
- [ ] "Change Date" opens date picker with correct min/max bounds
- [ ] Can backdate but not before last review date
- [ ] Cannot select a future date
- [ ] Last review date displayed from Supabase
- [ ] "Continue" navigates to the flashcard flow
- [ ] First review ever handled (no last review date)
- [ ] Already-reviewed-today handled
- [ ] Build passes

**Output:** `TASK DONE: Review date confirmation screen`

---

## Task 2 — Review Flashcard Component

**Build the individual account flashcard used during the review flow.**

### What to Build

File: `/components/review/ReviewFlashcard.tsx`

### Layout (per mockup + spec §9.3)

```
┌──────────────────────────────────────┐
│ Weekly Review                   3/12 │  ← Progress (excludes Tracking)
│                                      │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │  MONZO SAVINGS                   │ │  ← Account name, uppercase, muted
│ │                                  │ │
│ │  Budget today                    │ │
│ │  £3,500.00                       │ │  ← Budget at review date, prominent
│ │                                  │ │
│ │  Last actual · 13 May            │ │
│ │  £3,368.33 ──────────           │ │  ← Struck through, muted
│ │                                  │ │
│ │  Current Balance                 │ │  ← Input label
│ │  £3,720.00_                      │ │  ← Large input, auto-focused, cursor
│ │                                  │ │
│ │  Variance                        │ │
│ │  +£220.00                        │ │  ← Live calculation: input - Budget
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│   [ Skip ]          [ Next → ]       │  ← Two buttons
└──────────────────────────────────────┘
```

### Component Interface

```typescript
interface ReviewFlashcardProps {
  account: Account                    // Current account being reviewed
  budgetBalance: number               // Budget at review date for this account
  lastActualBalance: number | null    // Most recent actual balance (null if first review)
  lastActualDate: string | null       // Date of that last actual
  progress: { current: number; total: number }  // e.g. "3 of 12"
  onNext: (actualBalance: number) => void     // Save + advance
  onSkip: () => void                          // Skip + advance
}
```

### State

```typescript
const [inputValue, setInputValue] = useState('')
const [isFocused, setIsFocused] = useState(true)

// Live variance calculation
const variance = useMemo(() => {
  if (!inputValue || isNaN(Number(inputValue))) return null
  const entered = new Decimal(inputValue)
  const budget = toDecimal(budgetBalance)
  return entered.minus(budget)
}, [inputValue, budgetBalance])
```

### Behaviour

- **Input auto-focused** on mount — keyboard up immediately
- **Variance updates live** as the user types — no debounce needed
- **Previous actual shown struck-through** (`text-decoration: line-through`)
- **Budget shown prominently** — it's the comparison point
- **No back navigation** — forward only. Skip or Next moves to the next account.
- **Enter key / keyboard "Done"** → same as tapping "Next"

### Currency Handling

- Input prefix matches the account's currency: `£` or `NZ$`
- Variance display follows same rules as AmountDisplay `variant='variance'`:
  - Positive: `+£220.00`
  - Negative: `(£220.00)`
  - Zero: `£0.00`

### Pre-fill Behaviour

When the flashcard opens for an account:
- **Input starts empty** — don't pre-fill with the last actual
- User must intentionally enter the new balance
- This prevents mindless "Next" tapping

### Styling

- Card: border-radius 28px, padding 28px 24px, background white with subtle shadow
- Account name: 13px, weight 600, uppercase, tracking 0.08em, muted
- Budget label: 11px, muted, uppercase
- Budget amount: 32px, weight 700
- Last actual: 32px, weight 700, struck-through, muted at 40% opacity
- Input label: 11px, muted, uppercase
- Input: 42px, weight 700, bottom border 1px at 15% opacity, padding-bottom 8px
- Variance: 15px, weight 600, muted
- Skip button: flex 1, 54px height, subtle background, muted text
- Next button: flex 2, 54px height, dark background, white text, weight 700

### Acceptance Criteria

- [ ] Flashcard renders with account name, budget, last actual, input, variance
- [ ] Input auto-focused on mount
- [ ] Variance updates live as user types
- [ ] Last actual displayed struck-through
- [ ] Skip advances to next account without saving
- [ ] Next saves entered balance and advances
- [ ] Enter key acts as Next
- [ ] NZD accounts show NZ$ prefix
- [ ] Variance: positive = +£x, negative = (£x), zero = £0.00
- [ ] No pre-fill of last actual into input
- [ ] Build passes

**Output:** `TASK DONE: Review flashcard component`

---

## Task 3 — Review Flow Controller + Live Variance

**Build the controller that manages the review flow — iterating through accounts, collecting entries, and calculating live variance.**

### What to Build

File: `/components/review/ReviewFlow.tsx` — Main review flow controller
Modify: `/app/review/page.tsx` — Wire flow controller after date confirmation

### Flow States

```
START
  │
  ▼
DATE CONFIRM (Task 1)
  │
  ▼
FOR EACH ACCOUNT (excluding Tracking):
  │
  ├── Show flashcard (Task 2)
  │     ├── User taps "Skip" → mark skipped, next account
  │     └── User taps "Next" → save entry, next account
  │
  ▼
ALL ACCOUNTS DONE
  │
  ▼
REVIEW SUMMARY (Task 5)
```

### Component Interface

```typescript
interface ReviewFlowProps {
  reviewDate: Date
  accounts: Account[]              // Non-Tracking, non-archived, in display_order
  budgetBalances: Map<string, number>  // accountId → Budget at review date
  onComplete: (entries: ReviewEntryData[]) => void
  onCancel: () => void
}

interface ReviewEntryData {
  accountId: string
  actualBalance: number | null     // null = skipped
  budgetBalance: number            // Snapshot at review date
  variance: number | null          // null = skipped
  wasSkipped: boolean
}
```

### Controller Logic

```typescript
function ReviewFlow({ reviewDate, accounts, budgetBalances, onComplete, onCancel }: ReviewFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [entries, setEntries] = useState<ReviewEntryData[]>([])
  const [isComplete, setIsComplete] = useState(false)
  
  // Total excludes Tracking accounts (already filtered by parent)
  const total = accounts.length
  const currentAccount = accounts[currentIndex]
  
  // Budget for current account at review date
  const budgetBalance = budgetBalances.get(currentAccount.id) || 0
  
  // Last actual: fetch from most recent review_entry for this account
  const lastActual = useLastActual(currentAccount.id, reviewDate)
  
  function handleNext(actualBalance: number) {
    const variance = new Decimal(actualBalance).minus(toDecimal(budgetBalance))
    
    const entry: ReviewEntryData = {
      accountId: currentAccount.id,
      actualBalance,
      budgetBalance,
      variance: fromDecimal(variance),
      wasSkipped: false,
    }
    
    entries.push(entry)
    advanceOrComplete()
  }
  
  function handleSkip() {
    const entry: ReviewEntryData = {
      accountId: currentAccount.id,
      actualBalance: null,
      budgetBalance,
      variance: null,
      wasSkipped: true,
    }
    
    entries.push(entry)
    advanceOrComplete()
  }
  
  function advanceOrComplete() {
    if (currentIndex + 1 < total) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsComplete(true)
      onComplete(entries)
    }
  }
  
  // ... render current flashcard or summary
}
```

### Progress Display

```
Weekly Review                   3/12
```

- "3" = current index + 1 (1-indexed)
- "12" = total (excludes Tracking)
- Updates as the user advances

### Last Actual Lookup

For each account, fetch the most recent actual balance from a prior review:

```typescript
function useLastActual(accountId: string, beforeDate: Date) {
  // Fetch from Supabase:
  // SELECT actual_balance, created_at 
  // FROM review_entries 
  // WHERE account_id = {accountId} 
  //   AND was_skipped = false 
  //   AND actual_balance IS NOT NULL
  //   AND review_id IN (SELECT id FROM reviews WHERE review_date < {beforeDate})
  // ORDER BY created_at DESC 
  // LIMIT 1
}
```

If no prior actual exists: show "No previous balance" instead of the struck-through amount.

### Account Order

Accounts are presented in the user-defined order from Settings:
- `display_order` field on the accounts table
- GBP accounts first, then NZD
- Tracking accounts excluded
- External account excluded

### Acceptance Criteria

- [ ] Flow iterates through all non-Tracking accounts in display_order
- [ ] Progress counter shows "X of Y" and updates correctly
- [ ] Each account's Budget is fetched for the review date (or placeholder)
- [ ] Last actual balance displayed from prior review (if exists)
- [ ] Entries collected in array with correct data
- [ ] Skip marks entry as skipped (null balance, null variance)
- [ ] Next saves entry with balance, budget snapshot, calculated variance
- [ ] Flow ends after last account → calls onComplete
- [ ] All entries use decimal.js for variance calculation (no float arithmetic)
- [ ] Build passes

**Output:** `TASK DONE: Live variance calculation`

---

## Task 4 — Review Persistence to Supabase

**Save the completed review and all entries to the database.**

### What to Build

File: `/lib/db/reviews.ts` — Review database operations
Modify: `/app/review/page.tsx` — Wire persistence after flow completion

### Database Operations

```typescript
// /lib/db/reviews.ts
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface SaveReviewParams {
  reviewDate: string           // 'YYYY-MM-DD'
  entries: {
    account_id: string
    actual_balance: number | null   // null = skipped
    budget_balance: number          // snapshot at review time
    variance: number | null         // null = skipped
    was_skipped: boolean
  }[]
}

export async function saveReview({ reviewDate, entries }: SaveReviewParams): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  
  // 1. Insert the review record
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({ review_date: reviewDate })
    .select('id')
    .single()
  
  if (reviewError) throw reviewError
  
  // 2. Insert all review entries
  const reviewEntries = entries.map(entry => ({
    review_id: review.id,
    account_id: entry.account_id,
    actual_balance: entry.actual_balance,
    budget_balance: entry.budget_balance,
    variance: entry.variance,
    was_skipped: entry.was_skipped,
  }))
  
  const { error: entriesError } = await supabase
    .from('review_entries')
    .insert(reviewEntries)
  
  if (entriesError) throw entriesError
  
  return review.id
}
```

### Transaction Safety

The review + entries insert should be atomic. If entries fail, the review should not be created. Use a try/catch:

```typescript
async function handleComplete(entries: ReviewEntryData[]) {
  setIsSaving(true)
  try {
    const reviewId = await saveReview({
      reviewDate: format(reviewDate, 'yyyy-MM-dd'),
      entries: entries.map(e => ({
        account_id: e.accountId,
        actual_balance: e.actualBalance,
        budget_balance: e.budgetBalance,
        variance: e.variance,
        was_skipped: e.wasSkipped,
      })),
    })
    
    // Navigate to summary
    setReviewId(reviewId)
    showSummary()
  } catch (err) {
    setError('Failed to save review. Please try again.')
  } finally {
    setIsSaving(false)
  }
}
```

### Duplicate Prevention

- Check before saving: does a review already exist for this date?
- If yes: show error "A review already exists for this date"
- The date confirmation screen should also prevent this, but server-side check as safety net

### Data Integrity

- `budget_balance` is **snapshotted** at review time — it's the Budget value at that moment
- If the Budget is later amended (e.g., recurring transaction edited), historical review records preserve the original Budget snapshot
- `variance = actual - budget` — stored, not recalculated later
- Skipped entries: `actual_balance = null`, `variance = null`, `was_skipped = true`

### Acceptance Criteria

- [ ] Review record inserted with correct review_date
- [ ] All review_entries inserted with correct account IDs, balances, snapshots
- [ ] Budget balance snapshotted at review time (not recalculated later)
- [ ] Skipped entries stored with null balances and was_skipped = true
- [ ] Duplicate date prevented
- [ ] Save failure shows error, doesn't lose collected entries
- [ ] Successful save moves to summary screen
- [ ] Build passes

**Output:** `TASK DONE: Review completion and storage`

---

## Task 5 — Review Summary Screen

**Build the post-review summary showing savings projections and cash balance totals.**

### What to Build

File: `/components/review/ReviewSummary.tsx`

### Layout (per mockup + spec §10)

```
┌──────────────────────────────────────┐
│                                      │
│  ✓                                   │  ← Checkmark in circle
│  Review Complete                     │  ← Title, large
│  Projected at 15 June 2026           │  ← Summary Target Date from Settings
│                                      │
│  SAVINGS ACCOUNTS                    │  ← Section header
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Monzo Savings                    │ │  ← Account name
│ │ £3,720  →  £4,520               │ │  ← Actual → Budget at target date
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Rent Deposit                     │ │
│ │ £1,746  →  £1,746               │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ NZ Savings                       │ │
│ │ NZ$10,000  →  NZ$11,400          │ │
│ └──────────────────────────────────┘ │
│                                      │
│  CASH BALANCE                        │  ← Section header
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Total GBP                        │ │  ← Highlighted row
│ │ £11,502  →  £13,100              │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Total NZD                        │ │
│ │ NZ$25,560  →  NZ$29,100          │ │
│ └──────────────────────────────────┘ │
│                                      │
│          [ Done ]                    │  ← Returns to home
└──────────────────────────────────────┘
```

### Component Interface

```typescript
interface ReviewSummaryProps {
  reviewId: string
  entries: ReviewEntryData[]
  summaryTargetDate: string | null    // From Settings (null = not set)
  onDone: () => void
}
```

### Data Computation

**Savings accounts section:**
- Filter entries where account type = SAVINGS
- Show: account name, actual balance (from review), projected Budget at target date

**Cash Balance section:**
- Total GBP = sum of all GBP account actuals from this review
- Total GBP projected = sum of GBP Budget values at target date
- Same for NZD

**Budget at target date:**
- This is a forward projection using the Budget formula
- If Sprint 2 forecast engine is available: `calculateBudget(account, targetDate)`
- If not: show placeholder and a comment `// TODO: Sprint 2 — use calculateBudget()`

### Display

- Each row: account name left, "£X → £Y" right
- Arrow `→` between actual and projected
- Current actual: 13px, muted, no strike-through (unlike the flashcard)
- Projected: 15px, weight 700, primary colour
- Highlighted rows (totals): slightly different background, larger text
- Target date shown at top: "Projected at 15 June 2026"
- If no target date set in Settings: hide the projections, show "Set a target date in Settings to see projections"

### Savings vs Non-Savings Grouping

The mockup shows only "SAVINGS ACCOUNTS" section. The UX spec §10 shows this format. For Sprint 5, show:
1. Savings accounts (type = SAVINGS)
2. Cash Balance totals (GBP + NZD)

Non-savings accounts (CURRENT, CREDIT, DEBT) are part of the cash balance totals but not shown individually. This keeps the summary focused on what matters.

### Styling

- Checkmark: 52px circle, subtle background, centred checkmark
- Title: 28px, weight 700
- Subtitle: 14px, muted
- Section headers: 11px, weight 600, uppercase, muted, centred
- Rows: border-radius 18px, padding 18px 20px, subtle background
- Highlighted rows: slightly stronger background
- Account name: 14px, weight 600, muted
- Done button: 58px height, border-radius 18px, solid dark, white text, 17px weight 700

### Acceptance Criteria

- [ ] Summary screen shows after review save completes
- [ ] Savings accounts listed with Actual → Projected values
- [ ] Cash Balance GBP and NZD totals shown with projections
- [ ] Target date displayed at top (from Settings)
- [ ] "Done" returns to home screen
- [ ] No target date set → projections hidden, prompt to set in Settings
- [ ] Projections use Budget formula (or placeholder if Sprint 2 pending)
- [ ] NZD amounts prefixed NZ$
- [ ] Debit/credit convention consistent throughout
- [ ] Build passes

**Output:** `TASK DONE: Review summary screen`

---

## Task 6 — Summary Target Date Projection

**Implement the forward projection logic for the summary screen.**

### What to Build

File: `/lib/forecast/projection.ts` — Forward projection helper

### What It Does

Given a target date (from Settings → `summary_target_date`), calculate the Budget for each account at that date:

```typescript
// /lib/forecast/projection.ts
import Decimal from 'decimal.js'
import { Account } from '@/types'
import { toDecimal } from '@/lib/utils/money'

export interface AccountProjection {
  accountId: string
  accountName: string
  currency: Currency
  type: AccountType
  actualBalance: Decimal        // From this review
  projectedBalance: Decimal     // Budget at target date
}

export interface CashBalanceProjection {
  currency: Currency
  actualTotal: Decimal
  projectedTotal: Decimal
}

export function calculateSummaryProjections(
  accounts: Account[],
  entries: ReviewEntryData[],
  targetDate: Date,
  // TODO: Sprint 2 — pass stored transactions + recurring schedules
): {
  savingsProjections: AccountProjection[]
  cashBalanceProjections: CashBalanceProjection[]
} {
  // 1. For each account with a review entry:
  //    - Get actual balance from entry (or zero if skipped/null)
  //    - Calculate Budget at target date using forecast engine
  //    - If Sprint 2 not ready: use actual as projected (no projection)
  
  // 2. Group by currency for cash balance totals
  //    - GBP: sum all GBP account actuals and projections
  //    - NZD: sum all NZD account actuals and projections
  //    - NZD totals displayed in NZD (not converted to GBP)
  
  // 3. Return separated into savings + totals
}
```

### Sprint 2 Dependency

If the forecast engine (Sprint 2) is not available:
- Show actual balance as the projection (no forward calculation)
- Display a note: "Set up recurring transactions to see future projections"
- The summary screen still works — it shows all current actuals

If Sprint 2 is available:
- Call `calculateBudget(account, targetDate)` for each account
- Compare against the actual from this review
- Show the projected balance

### Target Date from Settings

```typescript
// Fetch settings
const { data: settings } = await supabase
  .from('settings')
  .select('summary_target_date')
  .single()

const targetDate = settings?.summary_target_date 
  ? new Date(settings.summary_target_date) 
  : null
```

If no target date is set, show the summary without projections and prompt the user to set one in Settings.

### Acceptance Criteria

- [ ] Projections calculated using Budget formula at target date
- [ ] Savings accounts projected individually
- [ ] Cash balance totals projected by currency
- [ ] No target date → projections hidden
- [ ] Sprint 2 unavailable → graceful fallback with user message
- [ ] NZD projections displayed in NZD (not converted)
- [ ] All projection amounts use decimal.js
- [ ] Build passes

**Output:** `TASK DONE: Summary Target Date projection`

---

## Task 7 — Integration + Review Completion

**Wire the full review flow end-to-end: date confirm → flashcards → save → summary → home.**

### What to Build

No new files. Fix, wire, polish the `/app/review/page.tsx` flow.

### Full Flow Sequence

```
1. User navigates to /review (from side menu or direct)
2. Date confirmation screen appears
3. User confirms or changes date → taps "Continue"
4. Flashcard for account 1 appears (input focused, keyboard up)
5. User enters balance or skips → advances to account 2
6. Repeats for all non-Tracking accounts
7. After final account: "Saving review..." → review + entries persisted
8. Summary screen appears with projections
9. User taps "Done" → returns to home
```

### Edge Cases

- **Zero accounts to review** (all are Tracking/archived): Show message "No accounts to review" with back button
- **All accounts skipped:** Save review with all entries as skipped. Summary shows only totals (all actual = prior actuals)
- **User kills app mid-review:** No partial save. Review only persists when all accounts completed.
- **Single account to review:** Flow works correctly (just one flashcard)

### Navigation

- Entry: Side Menu → Weekly Review (or direct `/review`)
- Exit: Summary → Done → `/` (home)
- Cancel at any point: Alert "Discard this review?" → Yes → `/`
- No back navigation during flashcard flow (forward only)

### Integration Checklist

- [ ] `/review` route renders date confirmation
- [ ] Date confirmation → flashcard flow
- [ ] Flashcard iterates all non-Tracking accounts
- [ ] Last actual fetched from prior reviews for each account
- [ ] Live variance updates as user types
- [ ] Skip/Next advances correctly
- [ ] All entries collected by end of flow
- [ ] Review + entries persisted to Supabase
- [ ] Summary shows with projections
- [ ] Done returns to home
- [ ] TypeScript strict: zero errors
- [ ] `npm run build` exits 0

### Polish

- Smooth transition between flashcards (no jarring jump)
- Keyboard stays up between accounts (same input type)
- Progress counter animates smoothly
- Loading state during save ("Saving review...")
- Error state if save fails (retry option)

### Acceptance Criteria

- [ ] Full flow works end-to-end without console errors
- [ ] All 12 reviewable accounts shown (15 total − 1 EXTERNAL − 2 TRACKING)
- [ ] Review persisted with all entries including skips
- [ ] Summary shows correctly with actuals and projections
- [ ] Returns to home on Done
- [ ] Cancel discards unsaved review
- [ ] Zero-account edge case handled
- [ ] `npm run build` passes

**Output:** `TASK DONE: Review completion (end-to-end flow)`

---

## Sprint 5 Definition of Done

All 7 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] `/review` shows date confirmation screen
- [ ] Date validation: can backdate but not ≤ last review date
- [ ] Flashcard flow covers all non-Tracking accounts in display_order
- [ ] Budget shown on each flashcard for review date
- [ ] Last actual shown struck-through
- [ ] Live variance updates as user types
- [ ] Skip preserves last actual, Next saves new actual
- [ ] Review + entries persisted to Supabase upon completion
- [ ] Budget balance snapshotted at review time
- [ ] Summary screen shows savings projections + cash balance totals
- [ ] Projections use Budget formula at target date
- [ ] "Done" returns to home
- [ ] Budget NEVER modified by the review process
- [ ] All amounts use decimal.js, debit bracket notation, NZ$ prefix
- [ ] TypeScript strict: zero errors

---

## Notes for Claude

- **The Weekly Review is a read-compare-snapshot tool.** It reads the Budget. It captures actuals. It stores snapshots. It NEVER modifies the Budget. This is the golden rule — if any code path could alter the Budget through a review, flag it as `ISSUE:`.
- **The flashcard is forward-only.** No back button, no undo. This is intentional — keeps the review fast and deliberate. Each account gets one pass.
- **Budget is snapshotted at review time.** Store `budget_balance` in the review_entry as a fixed number. If someone later changes a recurring transaction from £200 to £250, the historical review still shows £200 as what the Budget said on that date. This is correct behaviour.
- **Sprint 2 dependency:** The Budget values on each flashcard come from the forecast engine. If Sprint 2 is not complete, use `opening_balance` as placeholder with `// TODO: Sprint 2` comments. The review flow still works — variance just compares against opening balance instead of true Budget.
- **Tracking accounts are EXCLUDED.** Never appear in review flow. The progress counter (e.g. "3 of 12") reflects this — it counts only reviewable accounts.
- **Skip ≠ delete.** Skipping an account means "keep the previous actual balance." It's not the same as having no balance. The user is saying "unchanged since last time."
- **When done with each task, output:** `TASK DONE: [exact task name]`
- **If spec is unclear, output:** `SPEC GAP: [description]` and stop.
- **If you see an issue, output:** `ISSUE: [description]` with reasoning.
