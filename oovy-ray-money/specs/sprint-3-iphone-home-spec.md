# Sprint 3 — iPhone Home + Cards
> Phase 1 MVP | Est. Week 3–4 | 7 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, model boundaries, non-negotiables
2. **TRACKER.md** (root) — Sprint progress, task list
3. **UX Mockups** — Visual design reference (dark mode — translate to light):
   - `/Users/raymckenzie/Documents/Claude/Projects/budget-app/mock ups/oovy-ray-iphone-v3.html`
4. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §6, §7 — **primary authority this sprint**
   - `oovy-ray-technical-stack-spec.md` §2.1 (folder structure)

---

## Sprint Goal

Build the iPhone home screen with Cash Balance header, Apple Wallet-style card stack, card detail view with transaction timeline, and navigation shell. After this sprint, the app is visually complete on iPhone with live data from Supabase — accounts appear, cards stack, and the timeline renders with real transactions and recurring projections.

**This is a read-only sprint.** No add/edit/delete functionality yet. Display only.

---

## Design Tokens — Light Mode

Your mockups are dark mode. UX spec §2.1 mandates **light mode** with frosted/translucent base. Here's the translation:

```
DARK (mockups)          →  LIGHT (production)
=============================================
--black: #000000        →  --bg: #f2f2f7 (iOS system background)
--surface: #111111      →  --surface: rgba(255,255,255,0.72) + blur
--surface2: #1a1a1a     →  --surface2: rgba(255,255,255,0.88)
--text: #ffffff         →  --text: #1c1c1e
--text-secondary: 50%w  →  --text-secondary: rgba(0,0,0,0.45)
--text-tertiary: 30%w   →  --text-tertiary: rgba(0,0,0,0.25)
--border: rgba(w,0.08)  →  --border: rgba(0,0,0,0.08)
```

Cards stay **bold vivid gradients** (user-defined per account) — they punch against the light background. Same gradient direction, same visual weight. Just the background flips from black to frosted white.

Reference: Apple's iOS design language — frosted glass, SF-style typography, card depth via subtle shadows + blur rather than harsh borders.

---

## Task 1 — Home Screen Shell + Header

**Create the main home page layout with the Cash Balance / Budget / Variance header.**

### What to Build

File: `/app/page.tsx` (replacing placeholder)
File: `/components/ui/AmountDisplay.tsx` (shared component)

**Home page layout (top to bottom):**

```
┌──────────────────────────────────┐
│ 9:41                     ●●● WiFi │  ← iOS status bar (real device)
│                                  │
│ Oovy & Ray's Money     [+][⋯]    │  ← App title + action buttons
│                                  │
│ Cash Balance                     │  ← Label, small, muted
│ £11,502.00                       │  ← Large, bold
│                                  │
│ Budget    £11,762.00             │  ← Smaller
│ Variance    (£260.00)            │  ← Actual – Budget
│                                  │
│ [Account cards stack below...]   │
└──────────────────────────────────┘
```

### Components

**AmountDisplay.tsx** — Shared display formatter for all monetary values:

```typescript
interface AmountDisplayProps {
  amount: number       // stored DECIMAL value from DB
  currency: Currency   // 'GBP' | 'NZD'
  variant: 'plain' | 'debit' | 'variance'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
```

Rules:
- `variant='plain'`: positive = `£1,234.00`, negative = `(£1,234.00)` (brackets)
- `variant='debit'`: always brackets — `(£200.00)` (amount is positive, displayed as debit)
- `variant='variance'`: positive = `+£260.00`, negative = `(£260.00)`, zero = `£0.00`
- NZD always `NZ$` prefix
- Use `decimal.js` fromTask 1 of Sprint 2. **If Sprint 2 is not yet complete, use `decimal.js` inline until those utilities exist.**

### Page Data Flow

`app/page.tsx` is a **Server Component** that fetches:

```typescript
// 1. All non-archived, non-system accounts (ordered by display_order)
const { data: accounts } = await supabase
  .from('accounts')
  .select('*')
  .eq('is_archived', false)
  .eq('is_system', false)
  .order('display_order')

// 2. Settings (for exchange rate + comparison date)
const { data: settings } = await supabase
  .from('settings')
  .select('*')
  .single()
```

Then compute:
- **Cash Balance** = sum of last actual balances (placeholder: use opening_balance for now — actual balances come from review in Sprint 5)
- **Budget** = sum of Budget balances at comparison date (placeholder: opening_balance for now — real Budget comes from forecast engine Sprint 2)
- **Variance** = Cash Balance – Budget

> **Note:** Real Budget calculation depends on Sprint 2 forecast engine. Since Sprint 2 may still be in progress, use **opening_balance** as a placeholder. Add a comment: `// TODO: Replace with calculateAllBudgets() from /lib/forecast/engine.ts when Sprint 2 complete`

### [＋] and [⋯] Buttons

- **[＋]**: Routes to `/add` (Add Transaction page — built in Sprint 4). For now, just a button with no action or console.log placeholder.
- **[⋯]**: Opens side menu (built in Sprint 8). For now, just a button with no action.

Both are 36×36px circular buttons, semi-transparent background, centred icons.

### Styling

- Full viewport height, flex column layout
- Status bar height: 54px (safe area top)
- Title: 28px, weight 700, letter-spacing -0.8px
- Cash Balance amount: 42px, weight 700, letter-spacing -1.5px
- Budget/Variance: 15px, weight 400, muted colour
- Global font: Figtree (from Google Fonts) or system sans-serif as fallback
- Background: `#f2f2f7` (iOS system background)
- Use Tailwind CSS for all styling

### Dependencies

- This task creates the home page shell. Tasks 2–4 populate the card stack area.
- Use Server Component pattern (fetch data, pass to client components as props).

### Acceptance Criteria

- [ ] Home page renders at `/` and builds without errors
- [ ] App title "Oovy & Ray's Money" visible, never truncated
- [ ] Cash Balance header with Budget and Variance
- [ ] AmountDisplay component handles all 3 variants
- [ ] NZD always shows `NZ$` prefix
- [ ] Debit bracket notation: `(£200.00)` not `-£200.00`
- [ ] Variance: `+£260.00` for positive, `(£260.00)` for negative
- [ ] [＋] and [⋯] buttons rendered (actions stubbed)
- [ ] Build passes: `npm run build`

**Output:** `TASK DONE: Home screen header (Cash Balance, Budget, Variance)`

---

## Task 2 — Account Card Component

**Build the individual account card with gradient background, three values, and updated date.**

### What to Build

File: `/components/accounts/AccountCard.tsx`

### Card Layout (per mockup + UX spec §6.3)

```
┌──────────────────────────────────────┐
│ Monzo General              £2,340.00 │  ← Name TL, Actual TR
│                                      │
│                                      │  ← Gradient fills remaining space
│                                      │
│ Updated: 17 May     Expected: £2,600 │  ← Bottom row
└──────────────────────────────────────┘
```

### Component Interface

```typescript
interface AccountCardProps {
  account: Account
  actualBalance: number       // Last entered actual (placeholder: opening_balance)
  budgetBalance: number       // Budget at comparison date (placeholder: opening_balance)
  lastUpdatedDate?: string    // Date of last actual entry (placeholder: opening_date)
  onPress: () => void         // Navigate to card detail
}
```

### Visual Spec

- **Height:** 88px (mockup-confirmed)
- **Border radius:** 20px
- **Padding:** 16px 20px
- **Background:** CSS linear-gradient using `account.color_from` and `account.color_to`
- **Border:** 1px solid with 8% opacity white overlay (gives subtle depth regardless of gradient)
- **Name:** 13px, weight 600, colour: white at 85% opacity
- **Actual balance:** 17px, weight 700, white, right-aligned
- **Bottom row:** 11px, weight 400, white at 40% opacity
- **Font:** Figtree (inherited)

### Gradient Examples (from mockups)

```
Monzo General:   #1a1a2e → #0f3460  (deep navy)
Monzo Spending:  #2d1b69 → #11998e  (purple to teal)
Monzo Bills:     #1a1a1a → #2d2d2d  (charcoal)
Monzo Savings:   #0d4f2f → #1a8a4a  (forest green)
Rent Deposit:    #4a1942 → #c74b50  (burgundy to coral)
Ray Revolut:     #1a237e → #283593  (indigo)
NZ accounts:     #1b4332 → #2d6a4f  (deep teal/green)
```

These are the seed defaults from `/specs/oovy-ray-migration-and-phases-spec.md`. Use them as-is.

### Interaction

- Entire card is tappable
- Subtle scale animation on press (transform: scale(0.98))
- Navigate to `/accounts/[id]` on tap

### Acceptance Criteria

- [ ] Card renders with account name, actual balance, bottom metadata
- [ ] Gradient uses `color_from` and `color_to` from account record
- [ ] Text is white and readable against all gradient colours
- [ ] Bottom row shows "Updated: [date]" and "Expected: [amount]"
- [ ] Tap navigates to `/accounts/[id]` 
- [ ] Card height 88px, border-radius 20px
- [ ] Build passes

**Output:** `TASK DONE: Account card component (gradient, three values)`

---

## Task 3 — Apple Wallet Card Stack

**Build the overlapping card stack container with vertical scroll.**

### What to Build

File: `/components/accounts/AccountStack.tsx`

### Visual Behaviour (Apple Wallet style)

Cards overlap with a **-52px margin-bottom** between them (each card peeks out from behind the one above). The last card has no negative margin.

```
┌──────────────────────┐
│ Card 1               │  ← margin-bottom: -52px
├──────────────────────┤
││ Card 2              │  ← partially hidden behind Card 1, peeks out
│├─────────────────────┤
││ Card 3              │
│├─────────────────────┤
││ Card 4              │
│└──────────────────────┘  ← last card: no negative margin
```

### Component Interface

```typescript
interface AccountStackProps {
  accounts: Account[]
  onCardPress: (accountId: string) => void
}
```

### Props

- **accounts:** Pre-sorted by `display_order` from the server. GBP first, then NZD. Tracking accounts at bottom. The parent (page.tsx) handles sorting.
- **actualBalances:** Map of account ID → actual balance (placeholder: opening_balance)
- **budgetBalances:** Map of account ID → budget balance (placeholder: opening_balance)

### Container

- Vertical scroll container — no horizontal scroll
- `overflow-y: auto`, `overflow-x: hidden`
- No scroll bounce: `overscroll-behavior: none`
- Padding: 0 24px (left/right)
- Cards rendered in display_order sequence
- Each card gets `margin-bottom: -52px` except the last card (margin-bottom: 0)

### Empty State

If accounts array is empty:
```
┌──────────────────────┐
│                      │
│   No accounts yet    │
│   Add accounts in    │
│   Settings           │
│                      │
└──────────────────────┘
```

### Scroll Behaviour

- Cards scroll as one continuous list (not individually snapping)
- Smooth momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Entire stack scrollable — user sees all cards

### Acceptance Criteria

- [ ] Cards overlap with -52px margin (Apple Wallet style)
- [ ] Last card has no negative bottom margin
- [ ] Vertical scroll works, no horizontal overflow
- [ ] Accounts rendered in display_order sequence
- [ ] Empty state shown when no accounts
- [ ] No scroll bounce
- [ ] Build passes

**Output:** `TASK DONE: Apple Wallet card stack (overlap scroll)`

---

## Task 4 — Card Detail View (Header)

**Build the expanded card detail page with full balance display.**

### What to Build

File: `/app/accounts/[id]/page.tsx`

### Layout (per mockup + UX spec §7)

```
┌──────────────────────────────────────┐
│ ‹ Back                    [📅][+][⋯] │  ← Header with actions
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Monzo General                    │ │
│ │                                  │ │
│ │ £2,800.00                        │ │  ← Large, prominent
│ │                                  │ │
│ │ Last Updated       Expected Today│ │
│ │ 17 May             £1,340.00     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Timeline below — Task 5]            │
└──────────────────────────────────────┘
```

### Data Fetching (Server Component)

```typescript
// Dynamic route: /accounts/[id]/page.tsx
export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  
  // 1. Fetch single account
  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', params.id)
    .single()
  
  if (!account) return notFound()
  
  // 2. Placeholder: opening_balance used as actual + budget
  // TODO: Replace with real Budget calculation from Sprint 2
  const actualBalance = account.opening_balance
  const budgetBalance = account.opening_balance
  
  return <AccountDetailContent account={account} ... />
}
```

### Detail Card Component

File: `/components/accounts/AccountCardDetail.tsx`

```typescript
interface AccountCardDetailProps {
  account: Account
  actualBalance: number
  budgetBalance: number   // Budget at comparison date  
  lastUpdatedDate: string
}
```

**Visual spec:**
- **Height:** 140px (taller than home card — more detail)
- **Border radius:** 24px
- **Padding:** 20px 24px
- **Background:** Same user gradient as the home card
- **Decorative element:** Soft radial gradient circle in top right corner (40% larger than card, white at 3% opacity) — adds depth
- **Name:** 14px, weight 600, white at 70% opacity, top left
- **Balance:** 36px, weight 700, white, letter-spacing -1.2px, centered vertically
- **Bottom meta:** flex row, space-between
  - Left: "Last Updated" label (10px, weight 500, white 35%, uppercase) + date (14px, weight 600, white 80%)
  - Right: "Expected Today" label + amount (same sizing)

### Header Actions

- **‹ Back:** Returns to home. Standard Next.js `router.back()` or Link to `/`
- **[📅]: Jump to Date** — button rendered, opens a date picker (functionality built in Task 6)
- **[＋]: Add Transaction** — button rendered, routes to `/add?fromAccountId={id}` (built in Sprint 4)
- **[⋯]: Card Options** — button rendered, opens menu (built in Sprint 8)

All action buttons: 36px circles, semi-transparent white background.

### Acceptance Criteria

- [ ] Detail page renders at `/accounts/[id]`
- [ ] 404/notFound for invalid account ID
- [ ] Account name displayed in card header
- [ ] Large actual balance (36px) prominently displayed
- [ ] "Last Updated" and "Expected Today" meta in bottom row
- [ ] Card gradient matches account's colour settings
- [ ] Radial gradient decorative circle in top right
- [ ] Back, calendar, add, and menu buttons rendered (most stubbed)
- [ ] Build passes

**Output:** `TASK DONE: Card detail view`

---

## Task 5 — Transaction Timeline

**Build the vertical transaction timeline with today marker.**

### What to Build

File: `/components/transactions/TransactionTimeline.tsx`
File: `/components/transactions/TransactionRow.tsx`

### Layout (per mockup)

```
┌──────────────────────────────────────┐
│ TRANSACTIONS                         │  ← Section header, 13px, muted, uppercase
│                                      │
│ 13 May                               │
│ → Monzo Spending          (£200.00)  │  ← DR: bracketed
│                                      │
│ 15 May                               │
│ → Monzo Bills             (£178.34)  │
│                                      │
│ 17 May                               │
│ ← Salary (Olivia)        £4,120.00   │  ← CR: plain
│                                      │
│ ───────── Today · 20 May ──────────  │  ← Today marker, centred
│                                      │
│ 25 May                               │  ← Future entries: 50% opacity
│ → Monzo Spending          (£200.00)  │
│                                      │
│ 30 May                               │
│ → Monzo Bills             (£178.34)  │
└──────────────────────────────────────┘
```

### TransactionRow Component

```typescript
interface TransactionRowProps {
  transaction: TransactionUnion   // Stored transaction OR generated recurring occurrence
  isFuture: boolean               // true → 50% opacity
  viewingAccountId: string        // To determine CR vs DR display
}
```

**Logic for direction display:**
```
If transaction.to_account_id === viewingAccountId:
  → This is a CR (credit) — money entering this account
  → Show: arrow ←, plain amount, no brackets
  → Arrow direction: ← (entering)

If transaction.from_account_id === viewingAccountId:
  → This is a DR (debit) — money leaving this account
  → Show: arrow →, bracketed amount
  → Arrow direction: → (leaving)
```

**Visual:**
- Row height: 44px (min)
- Padding: 12px 0
- Border-bottom: 1px solid, 5% opacity (separator)
- Date: 11px, weight 400, muted colour (left column)
- Name: 14px, weight 500, primary text colour (centre)
  - Format: "→ AccountName" or "← SourceName"
  - If transaction.name is null → show counterparty account name
- Amount: 15px, weight 600, right-aligned, tabular-nums
  - CR: plain colour
  - DR: bracketed, same colour (no red/green)
- Future transactions: opacity 0.5

### TransactionTimeline Component

```typescript
interface TransactionTimelineProps {
  accountId: string
  transactions: TransactionUnion[]   // Combined stored + generated
  recurringSchedules?: RecurringSchedule[]
}
```

**Timeline structure:**
1. **Section header:** "TRANSACTIONS" — 13px, weight 600, uppercase, muted
2. **Past transactions:** sorted by date ascending (oldest first → newest)
3. **Today marker:** Horizontal line with "Today · [date]" text centred
4. **Future transactions:** 50% opacity, sorted by date ascending

**Today marker styling:**
- Flex row: `<hr>` flex:1 + "Today · 20 May" text + `<hr>` flex:1
- HR: 1px height, border colour at 8-15% opacity
- Text: 11px, weight 600, uppercase, muted colour
- Margin: 4px 0

### Data Sources

For Sprint 3, the timeline shows **all transactions for this account** (past stored + future recurring projections):

```typescript
// 1. Fetch stored transactions for this account
const { data: storedTx } = await supabase
  .from('transactions')
  .select('*')
  .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
  .order('transaction_date')

// 2. Fetch recurring schedules affecting this account
const { data: schedules } = await supabase
  .from('recurring_schedules')
  .select('*')
  .eq('is_active', true)
  .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)

// 3. Generate future occurrences using the forecast engine from Sprint 2
// TODO: If Sprint 2 not complete, show stored transactions only
// with a note "Forecast engine pending — Sprint 2"
```

**If Sprint 2 forecast engine is not yet available:**
- Show stored transactions only
- Render the "Today" marker
- Below it, show a muted message: "Forecast available when Sprint 2 complete"
- The timeline still works — just shows past data only

### Scroll Behaviour

- Opens scrolled to **today** (today marker in view, centred if possible)
- Scroll up = past
- Scroll down = future
- No horizontal scroll
- No bounce (`overscroll-behavior: none`)
- Smooth momentum scrolling
- Use `scrollIntoView` or `scrollTop` calculation on mount to centre today marker
- Virtual scrolling not needed for initial implementation (simple list, likely < 1000 rows)

### Acceptance Criteria

- [ ] Timeline renders with past transactions above today marker
- [ ] Future transactions shown below today marker at 50% opacity
- [ ] Today marker centred with horizontal lines
- [ ] DR transactions displayed as bracketed `(£200.00)`
- [ ] CR transactions displayed as plain `£4,120.00`
- [ ] Arrow direction indicates money flow (→ leaving, ← entering)
- [ ] Scroll opens centred on today
- [ ] No scroll bounce
- [ ] Transaction name defaults to counterparty account name if null
- [ ] Graceful handling if Sprint 2 forecast engine not available
- [ ] Build passes

**Output:** `TASK DONE: Transaction timeline (vertical scroll, today marker)`

---

## Task 6 — Jump to Date Functionality

**Implement the date picker and timeline scroll-to-date feature.**

### What to Build

Add to `/app/accounts/[id]/page.tsx` and `/components/transactions/TransactionTimeline.tsx`

### Behaviour

1. User taps [📅] in the card detail header
2. A date picker appears (native or custom)
3. User selects a date
4. Timeline scrolls to centre that date
5. Card header updates: "Expected Today" changes to "Expected on [selected date]" with Budget calculated for that date

### Date Picker

Use a simple custom date picker or a lightweight library. The mockup shows iOS-style. For this sprint, simplest approach:

- **Option A:** HTML `<input type="date">` in a modal/dropdown — fast, native, accessible
- **Option B:** Custom iOS-style picker component in `/components/ui/DatePicker.tsx`

Recommend Option A for Sprint 3 — replace with custom picker later if needed.

### Implementation

```typescript
// In Card Detail page
const [jumpToDate, setJumpToDate] = useState<Date | null>(null)

function handleJumpToDate(date: Date) {
  setJumpToDate(date)
  // Update card header to show Budget on selected date
  // Timeline scrolls to date
}
```

**Timeline scroll:**
- Pass `jumpToDate` as prop to TransactionTimeline
- Timeline finds or creates a marker for that date
- Scrolls to position it (similar to today marker positioning)
- Selected date highlighted differently from today (e.g., subtle background tint)

### Acceptance Criteria

- [ ] Tapping [📅] opens a date picker
- [ ] Selecting a date scrolls timeline to that date
- [ ] Card header updates to show Budget on selected date
- [ ] Can jump to past dates (historical)
- [ ] Can jump to future dates (projected)
- [ ] Date picker restricts to valid range (opening_date → 18 months from today)
- [ ] Build passes

**Output:** `TASK DONE: Jump to date functionality`

---

## Task 7 — Integration + Polish

**Wire everything together. Ensure all data flows work and the app feels cohesive.**

### What to Build

No new files. Fix, wire, polish.

### Integration Checklist

- [ ] `/app/page.tsx` imports and renders AccountStack with live Supabase data
- [ ] AccountStack renders AccountCard for each account in display_order
- [ ] Tapping a card navigates to `/accounts/[id]`
- [ ] `/accounts/[id]/page.tsx` fetches account + transactions + schedules
- [ ] Card detail renders AccountCardDetail + TransactionTimeline
- [ ] All navigation works: Home → Card Detail → Back
- [ ] AmountDisplay used consistently across all components (no raw number formatting)
- [ ] TypeScript strict mode: zero errors
- [ ] `npm run build` exits 0

### Polish Items

- **Figtree font:** Add to app layout. Import from Google Fonts:

```typescript
// /app/layout.tsx
import { Figtree } from 'next/font/google'
const figtree = Figtree({ subsets: ['latin'], weight: ['400','500','600','700','800'] })
```

- **Global body background:** `#f2f2f7` (iOS system background)
- **Meta viewport:** Confirm `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`
- **Apple touch icon:** Placeholder favicon
- **Smooth scrolling:** Add `scroll-behavior: smooth` to timeline
- **Consistent spacing:** All screens use 24px horizontal padding
- **Status bar safe area:** Top padding accounts for iOS notch (54px equivalent)

### Acceptance Criteria

- [ ] Full app renders at `/` with all 15 accounts in card stack
- [ ] Tapping a card navigates to detail view
- [ ] Detail view shows transactions timeline
- [ ] Today marker visible and correctly positioned
- [ ] All amounts formatted correctly (GBP `£`, NZD `NZ$`, debits bracketed)
- [ ] Zero TypeScript errors
- [ ] `npm run build` passes
- [ ] `npm run dev` serves the app without runtime errors
- [ ] Figtree font loaded and applied globally
- [ ] Light mode background and text colours consistent across all screens

**Output:** `TASK DONE: Integration + Polish`

---

## Sprint 3 Definition of Done

All 7 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] Home screen renders at `/` with Cash Balance header + card stack
- [ ] All 15 accounts visible in card stack (if seeded)
- [ ] Card detail page renders at `/accounts/[id]` with expanded card + timeline
- [ ] Timeline shows stored transactions with today marker
- [ ] Jump to date scrolls timeline
- [ ] All amounts use debit bracket notation for DRs
- [ ] NZD always `NZ$` prefix
- [ ] Light mode frosted glass aesthetic throughout
- [ ] No red/green colour coding on any amount
- [ ] TypeScript strict: zero errors
- [ ] All placeholder values clearly commented with `// TODO: Sprint 2` markers where forecast engine integration is pending

---

## Notes for Claude

- **Light mode is mandatory.** UX spec §2.1 is explicit. Your mockups show dark mode — follow the layout/structure exactly but translate all backgrounds/surfaces/text to the light mode values in the Design Tokens section above.
- **Cards keep their bold gradients.** The gradients are user-defined and Punchy. They look great against light backgrounds — same vibrant colours, same white text on top.
- **Sprint 2 dependency:** The forecast engine may not be built yet. Use `opening_balance` as placeholder for all budget/actual values. Mark every placeholder with `// TODO: Sprint 2 — replace with calculateBudget()`. Don't block on Sprint 2.
- **Amount display is critical:** Every `£` and `NZ$` must be correct. Brackets for debits. Plus prefix for positive variance. No exceptions.
- **When done with each task, output:** `TASK DONE: [exact task name]`
- **If spec is unclear, output:** `SPEC GAP: [description]` and stop.
- **If you see an issue, output:** `ISSUE: [description]` with reasoning.
