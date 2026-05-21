# Sprint 8 — Settings + Polish
> Phase 1 MVP | Est. Week 9–10 | 9 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, non-negotiables
2. **TRACKER.md** (root) — Sprint progress
3. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §11 (Side Menu), §18 (Planned One-offs), §19 (Settings) — **primary authority**
   - `oovy-ray-data-model-spec.md` §6 (settings schema)
   - `oovy-ray-forecast-engine-spec.md` §8.3 (exchange rate)
4. **Existing components:** All prior sprint components

---

## Sprint Goal

Complete the app. Build Settings with all sections (target date, comparison date, account order, account management, exchange rate). Add the side menu for navigation. Build Planned One-offs list. First-launch setup flow. Archive and colour picker for accounts. This is the polish sprint — after this, the app is feature-complete.

---

## Task 1 — Settings Page Shell + Navigation

**Build the Settings page with all section stubs and wire it into navigation.**

### What to Build

File: `/app/settings/page.tsx` — Settings page

### Sections (per UX spec §19)

```
┌──────────────────────────────────────┐
│ ‹ Back    Settings                    │
│                                      │
│ FORECAST                             │
│ ┌──────────────────────────────────┐ │
│ │ Summary Target Date   15 Jun ›  │ │
│ │ Budget Comparison       Today ›  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ACCOUNTS                             │
│ ┌──────────────────────────────────┐ │
│ │ Account Order                ›  │ │  ← Drag-to-reorder
│ │ Manage Accounts              ›  │ │  ← List of accounts
│ └──────────────────────────────────┘ │
│                                      │
│ EXCHANGE RATE                        │
│ ┌──────────────────────────────────┐ │
│ │ 1 GBP = 2.22 NZD               │ │
│ │ Auto-fetch          [OFF ●]     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ DATA                                 │
│ ┌──────────────────────────────────┐ │
│ │ Planned One-offs             ›  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Sign Out                        │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Page Structure

Each section is a group of related settings rows. Sections separated by section headers (12px, weight 600, uppercase, muted, padding). Rows are grouped in rounded containers with subtle borders.

### Navigation

- Accessible from Side Menu → Settings (Task 8)
- Direct route: `/settings`
- Each row navigates to a sub-page or opens a picker/modal
- Sign Out at bottom: calls `supabase.auth.signOut()`, redirects to `/login`

### Section Stubs (for this task — detailed in later tasks)

| Section | Tapping Does |
|---------|-------------|
| Summary Target Date | Opens date picker (Task 5) |
| Budget Comparison | Opens date picker (Task 6) |
| Account Order | Opens drag-to-reorder page (Task 2) |
| Manage Accounts | Opens account list (Task 3) |
| Exchange Rate | Inline edit + auto-fetch toggle (Task 4) |
| Planned One-offs | Opens list page (Task 7) |
| Sign Out | Signs out → `/login` |

### Styling

- Light mode: white background, frosted sections
- Section headers: 12px, weight 600, uppercase, letter-spacing 0.08em, muted
- Rows: 52px height, 16px horizontal padding, bottom border 1px subtle
- Row labels left, current value + chevron right
- Labels: 16px, weight 500
- Values: 16px, weight 400, muted
- Chevron: `›` 14px, very muted

### Acceptance Criteria

- [ ] Settings page renders at `/settings`
- [ ] All sections visible: Forecast, Accounts, Exchange Rate, Data, Sign Out
- [ ] Each row navigates to sub-page or opens picker
- [ ] Sign Out signs user out and redirects to `/login`
- [ ] Back button returns to previous page
- [ ] Settings accessible from side menu (once built in Task 8)
- [ ] Build passes

**Output:** `TASK DONE: Settings screen (all sections)`

---

## Task 2 — Account Order Drag-to-Reorder

**Build the drag-to-reorder interface for account display order.**

### What to Build

File: `/app/settings/account-order/page.tsx` — Account order page

### Layout

```
┌──────────────────────────────────────┐
│ ‹ Back    Account Order               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ≡  Monzo General              ≡  │ │  ← Drag handle both sides
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ≡  Monzo Spending             ≡  │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ≡  Monzo Bills                ≡  │ │
│ └──────────────────────────────────┘ │
│ ...                                  │
│                                      │
│ GBP ─────────────────────────────    │  ← Currency divider
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ≡  Olivia Revolut             ≡  │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ≡  NZ Savings                 ≡  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Implementation

Use a lightweight drag-and-drop library or implement with HTML5 drag and drop API:

**Option A (recommended):** `@dnd-kit/core` + `@dnd-kit/sortable` — lightweight, accessible, works with React.

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableAccountRow({ account }: { account: Account }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: account.id })
  
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center justify-between px-4 h-[52px] border-b border-black/5 bg-white"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        ≡
      </div>
      <span className="flex-1 px-3 text-sm font-medium">{account.name}</span>
      <span className="text-xs text-black/30">{account.currency} · {account.type}</span>
    </div>
  )
}
```

### Save Logic

On drag end, update all affected accounts' `display_order` values:

```typescript
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return
  
  const oldIndex = accounts.findIndex(a => a.id === active.id)
  const newIndex = accounts.findIndex(a => a.id === over.id)
  
  const reordered = arrayMove(accounts, oldIndex, newIndex)
  
  // Update display_order for all affected accounts
  const updates = reordered.map((account, index) => ({
    id: account.id,
    display_order: index + 1,
  }))
  
  // Batch update
  for (const update of updates) {
    await supabase
      .from('accounts')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
  }
  
  setAccounts(reordered)
}
```

### Currency Grouping

Accounts are grouped by currency: GBP first, then NZD. A subtle divider line separates them. Tracking accounts can be placed anywhere — user controls the order.

### Archiving

Archived accounts are hidden from this list (and from the card stack and review flow). To archive an account, the user goes to Manage Accounts (Task 3).

### Acceptance Criteria

- [ ] Drag handle visible on each account row (≡ on both sides, or just left)
- [ ] Drag to reorder works with smooth animation
- [ ] Drop updates display_order in Supabase
- [ ] Order persists across page reloads
- [ ] GBP accounts grouped first, NZD second (or by user's custom order)
- [ ] Archived accounts not shown
- [ ] Exchange rate auto-fetch toggle disables/enables the fetch
- [ ] Build passes

**Output:** `TASK DONE: Account order drag-to-reorder`

---

## Task 3 — Per-Account Management + Colour Picker

**Build the account management page with rename, colour picker, toggles, and archive.**

### What to Build

File: `/app/settings/accounts/page.tsx` — Account management list
File: `/app/settings/accounts/[id]/page.tsx` — Per-account settings

### Account List

```
┌──────────────────────────────────────┐
│ ‹ Back    Manage Accounts             │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Monzo General                  › │ │  ← Tap to edit
│ │ GBP · Current                    │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Monzo Spending                 › │ │
│ │ GBP · Current                    │ │
│ └──────────────────────────────────┘ │
│ ...                                  │
└──────────────────────────────────────┘
```

### Per-Account Settings Page

```
┌──────────────────────────────────────┐
│ ‹ Back    Monzo General               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Name                            │ │
│ │ [Monzo General                 ›]│ │  ← Editable
│ └──────────────────────────────────┘ │
│                                      │
│ COLOUR                               │
│ ┌──────────────────────────────────┐ │
│ │ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │ │
│ │ │  │ │  │ │  │ │  │ │  │ │  │  │ │  ← 6 preset colour swatches
│ │ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │ │
│ │                                  │ │
│ │ Custom: [#1a1a2e] → [#0f3460]   │ │  ← Two colour inputs
│ └──────────────────────────────────┘ │
│                                      │
│ VISIBILITY                           │
│ ┌──────────────────────────────────┐ │
│ │ Include in Cash Balance [ON ●]  │ │
│ │ Include in Review       [ON ●]  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Archive Account                  │ │  ← Destructive, red text
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Colour Picker

Six preset gradient pairs as swatches, plus custom colour inputs:

```typescript
const PRESET_GRADIENTS = [
  { from: '#1a1a2e', to: '#0f3460', name: 'Deep Navy' },
  { from: '#2d1b69', to: '#11998e', name: 'Purple Teal' },
  { from: '#0d4f2f', to: '#1a8a4a', name: 'Forest' },
  { from: '#4a1942', to: '#c74b50', name: 'Burgundy' },
  { from: '#1a237e', to: '#283593', name: 'Indigo' },
  { from: '#1b4332', to: '#2d6a4f', name: 'Deep Teal' },
  { from: '#3d1c4d', to: '#7b2d8e', name: 'Plum' },
  { from: '#4a3520', to: '#8b6914', name: 'Bronze' },
]
```

Two `<input type="color">` for custom gradient start/end. Default to the current colours.

### Toggles

- **Include in Cash Balance:** Controls `include_in_cash_balance` on the account
  - CURRENT/SAVINGS/CREDIT/DEBT: always ON (toggle disabled)
  - TRACKING: user-controllable
- **Include in Review:** Controls `include_in_review`
  - CURRENT/SAVINGS/CREDIT/DEBT: always ON (toggle disabled)
  - TRACKING: user-controllable

### Archive

- "Archive Account" button at the bottom
- If balance > £0: confirmation dialog: "This account has a balance of £X. Archive anyway?"
- Sets `is_archived = true`
- Archived accounts: hidden from card stack, grid, review flow, account pickers
- Cannot be undone from this screen (future: unarchive in Settings)

### Rename

- Tap the name field → inline edit
- Max 50 characters
- Empty not allowed
- Save on blur or Enter

### Acceptance Criteria

- [ ] Account list shows all non-archived, non-system accounts
- [ ] Tap account → per-account settings page
- [ ] Name editable inline
- [ ] 8 preset gradient swatches, tap to select
- [ ] Custom colour inputs for gradient from/to
- [ ] Toggles disabled for non-TRACKING account types
- [ ] Toggles user-controllable for TRACKING
- [ ] Archive button with balance > 0 confirmation
- [ ] Changes persist to Supabase and reflect immediately in UI
- [ ] Build passes

**Output:** `TASK DONE: Per-account colour picker`

---

## Task 4 — Exchange Rate Settings

**Build the exchange rate section with manual input and auto-fetch toggle.**

### What to Build

File: `/app/settings/exchange-rate/page.tsx` — Exchange rate settings
File: `/app/api/exchange-rate/route.ts` — API route for auto-fetch

### Layout

```
┌──────────────────────────────────────┐
│ ‹ Back    Exchange Rate               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 1 GBP =                          │ │
│ │ [2.22] NZD                       │ │  ← Manual input
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Auto-fetch daily    [OFF ●]      │ │
│ │ Uses frankfurter.app free API    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Last updated: 20 May 2026, 09:41     │
│                                      │
│          [ Save Rate ]               │
└──────────────────────────────────────┘
```

### Manual Rate Input

- Number input, 6 decimal places allowed
- Default: 2.220000
- Displayed everywhere as "1 GBP = X NZD"
- Save button persists to `settings.exchange_rate_gbp_nzd`

### Auto-Fetch

API: `https://api.frankfurter.app/latest?from=GBP&to=NZD`

```typescript
// /app/api/exchange-rate/route.ts
export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=NZD')
    if (!res.ok) throw new Error('Fetch failed')
    const data = await res.json()
    const rate = data.rates.NZD
    
    // Update settings table
    const supabase = createSupabaseServerClient()
    await supabase
      .from('settings')
      .update({ 
        exchange_rate_gbp_nzd: rate,
        exchange_rate_updated_at: new Date().toISOString(),
      })
      .eq('id', settingsId)
    
    return Response.json({ rate })
  } catch {
    // Fail silently — use last stored rate
    return Response.json({ error: 'Fetch failed, using stored rate' }, { status: 200 })
  }
}
```

### Auto-Fetch Schedule

- If `exchange_rate_auto_fetch = true`: fetch on app open (client-side on mount)
- Fetch at most once per day (check `exchange_rate_updated_at` before fetching)
- If fetch fails: use last stored rate, no error shown to user
- Rate is stored as `DECIMAL(10,6)` — e.g., 2.220000

### Integration

- Rate displayed in iPad bottom bar
- Used for GBP ↔ NZD conversion on home screen totals
- Available via Zustand settings store for all components

### Acceptance Criteria

- [ ] Manual rate input with 6 decimal precision
- [ ] Auto-fetch toggle with description text
- [ ] Frankfurter API route fetches and returns rate
- [ ] Fetch updates settings table with new rate + timestamp
- [ ] Fetch failure falls back silently to last stored rate
- [ ] "Last updated" timestamp displayed
- [ ] Save button persists manual rate
- [ ] Auto-fetch respects daily limit (no repeat fetches)
- [ ] Build passes

**Output:** `TASK DONE: Exchange rate (manual + auto-fetch from frankfurter.app)`

---

## Task 5 — Summary Target Date Picker

**Implement the Summary Target Date setting that drives the Review Summary projections.**

### What to Build

Add to `/app/settings/page.tsx` — Wire the Summary Target Date row

### Behaviour

- Tapping "Summary Target Date" opens a date picker
- Date is stored in `settings.summary_target_date`
- Used by Sprint 5 Review Summary to project Budget forward
- If not set: Review Summary prompts user to set it before showing projections
- No default — user must explicitly set it

### Date Picker Constraints

- Min: today (can't set a past target — projection is always forward)
- Max: 5 years from today
- Clear button: set to null (no target date)

```typescript
function handleSetTargetDate(date: Date | null) {
  await supabase
    .from('settings')
    .update({ summary_target_date: date ? format(date, 'yyyy-MM-dd') : null })
    .eq('id', settingsId)
}
```

### Display

- When set: "15 June 2026" in settings row
- When null: "Not set" in muted text

### Integration

The Review Summary (Sprint 5) reads this date to show "Projected at 15 June 2026" and calculate forward Budget values. If null, it shows "Set a target date in Settings to see projections."

### Acceptance Criteria

- [ ] Tapping opens date picker
- [ ] Min date: today, max date: 5 years forward
- [ ] Selected date persists to settings table
- [ ] Clear/reset to null possible
- [ ] Display shows date or "Not set"
- [ ] Review Summary responds to this setting
- [ ] Build passes

**Output:** `TASK DONE: Summary Target Date picker`

---

## Task 6 — Budget Comparison Date Setting

**Implement the Budget Comparison Date setting.**

### What to Build

Add to `/app/settings/page.tsx` — Wire the Budget Comparison Date row

### Behaviour

Controls which date's Budget is shown on account cards and the home screen header:

- **Default: Today** (rolling) — Budget always calculated for today
- **Custom date:** User picks a fixed date — Budget calculated for that date

### How It Works

```typescript
// In home page and card detail — determine the comparison date
function getComparisonDate(settings: Settings): Date {
  if (settings.budget_comparison_date) {
    return new Date(settings.budget_comparison_date)
  }
  return new Date()  // Today
}

// Then: calculateBudget(account, comparisonDate)
```

When the comparison date is today (null in DB), the Budget shown is "what does the plan say right now?" When it's a custom date, it's "what will the plan say on that date?"

### Picker

- Tapping row opens a picker with two options:
  - "Today (rolling)" — sets `budget_comparison_date` to null
  - "Custom date" — opens date picker
- If custom is selected: date picker appears (min: opening date, max: 18 months forward)
- Selected date saved to `settings.budget_comparison_date`

### Display

- When null: "Today" in settings row
- When set: "15 June 2026"

### Effect on UI

- Home screen Budget total uses this date
- Account card "Expected today" becomes "Expected on [date]" when custom
- Variance is always Actual – Budget at comparison date
- Grid cells are unaffected (grid always shows day-by-day, not a single comparison date)

### Acceptance Criteria

- [ ] Tapping opens picker with "Today" and "Custom" options
- [ ] "Today" sets comparison_date to null (rolling)
- [ ] "Custom" opens date picker with valid range
- [ ] Selected date persists to settings table
- [ ] Home screen Budget + Variance reflect the comparison date
- [ ] Card detail "Expected on [date]" updates when custom date set
- [ ] Build passes

**Output:** `TASK DONE: Budget Comparison Date setting`

---

## Task 7 — Planned One-Offs

**Build the Planned One-offs list page with add and delete.**

### What to Build

File: `/app/planned/page.tsx` — Planned One-offs page

### Layout (per UX spec §18)

```
┌──────────────────────────────────────┐
│ ‹ Back    Planned One-offs        [+] │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Student Loan Payment             │ │
│ │ £3,000.00 · 15 Jun 2026          │ │
│ │ Monzo Student Loan → External    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Holiday Deposit                   │ │
│ │ £800.00 · 1 Jul 2026             │ │
│ │ Monzo Savings → External         │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [ Empty state if none ]              │
└──────────────────────────────────────┘
```

### What Is a Planned One-Off?

A single future transaction with type `ONE_OFF`. It's a regular transaction in the `transactions` table — the only difference is it has `type = 'ONE_OFF'` and a future `transaction_date`.

### Data Fetching

```typescript
const { data: oneOffs } = await supabase
  .from('transactions')
  .select('*')
  .eq('type', 'ONE_OFF')
  .gte('transaction_date', format(new Date(), 'yyyy-MM-dd'))  // Future only
  .order('transaction_date')
```

Past one-offs are not shown in this list (they're in the account timeline as history).

### Add One-Off

- [+] button navigates to `/add?type=one_off` (reuse Add Transaction from Sprint 4)
- The Add Transaction page already supports future dates — just set `type` to `ONE_OFF`
- The key: the `date` field is future, so it auto-classifies as ONE_OFF

### Delete

- Swipe left on item → "Delete" button
- Or: tap item → edit panel with delete option
- Delete removes the transaction row
- Budget recalculates, removing the one-off from the projection

### Empty State

```
No planned one-offs
Tap [+] to add a future transaction
```

### Styling

Same card style as Recurring Transactions list (Sprint 6):
- Cards: border-radius 18px, white background, padding 16px 20px
- Name: 16px weight 600
- Amount + date: 14px weight 500
- From → To: 13px muted

### Acceptance Criteria

- [ ] Page renders at `/planned`
- [ ] Lists all future ONE_OFF transactions
- [ ] Each item shows: name, amount, date, from → to accounts
- [ ] [+] opens Add Transaction (reuses Sprint 4)
- [ ] Delete removes transaction and triggers recalculation
- [ ] Empty state shown when none
- [ ] Past one-offs excluded from list
- [ ] Build passes

**Output:** `TASK DONE: Planned One-offs (list + add + delete)`

---

## Task 8 — Side Menu (iPhone + iPad)

**Build the floating side menu accessible from [⋯] on both iPhone and iPad.**

### What to Build

File: `/components/ui/SideMenu.tsx` — Side menu component
Modify: Home page and iPad grid — Wire [⋯] button

### Layout (per UX spec §11)

```
                         ┌──────────────────┐
                         │ Recurring         │
                         │ Transactions    › │
                         ├──────────────────┤
                         │ Planned           │
                         │ One-offs        › │
                         ├──────────────────┤
                         │ Weekly Review   › │
                         ├──────────────────┤
                         │ Settings          │
                         └──────────────────┘
```

### Behaviour

- Tap [⋯] → menu appears as a floating card, top-right corner
- Background: frosted glass overlay dims the content behind
- Menu is a compact card — does NOT cover the full screen
- Tap outside the menu → dismiss
- Tap a menu item → navigate and dismiss

### Menu Items

| Item | Route |
|------|-------|
| Recurring Transactions | `/recurring` (Sprint 6) |
| Planned One-offs | `/planned` (Task 7) |
| Weekly Review | `/review` (Sprint 5) |
| Settings | `/settings` (Task 1) |

### Component

```tsx
interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  if (!isOpen) return null
  
  const router = useRouter()
  
  const items = [
    { label: 'Recurring Transactions',   route: '/recurring' },
    { label: 'Planned One-offs',         route: '/planned' },
    { label: 'Weekly Review',            route: '/review' },
    { label: 'Settings',                 route: '/settings' },
  ]
  
  function handleNavigate(route: string) {
    router.push(route)
    onClose()
  }
  
  return (
    <>
      {/* Backdrop — tap to dismiss */}
      <div 
        className="fixed inset-0 bg-black/10 z-40"
        onClick={onClose}
      />
      
      {/* Menu panel — top right */}
      <div className="
        fixed top-[54px] right-4 z-50 w-[62%]
        bg-white/95 backdrop-blur-xl
        rounded-[20px] border border-black/10
        shadow-lg
        py-2
      ">
        {items.map((item, i) => (
          <button
            key={item.route}
            onClick={() => handleNavigate(item.route)}
            className={`
              w-full text-left px-4 py-3.5 text-[16px] font-medium
              flex justify-between items-center
              ${i < items.length - 1 ? 'border-b border-black/5' : ''}
              ${i === items.length - 1 ? 'text-black/45 text-[15px]' : 'text-black'}
            `}
          >
            {item.label}
            {i < items.length - 1 && <span className="text-black/20 text-[13px]">›</span>}
          </>
        ))}
      </div>
    </>
  )
}
```

### Styling (Light Mode)

- Menu panel: white at 95% opacity with backdrop-blur-xl
- Border: 1px solid black at 10% opacity
- Shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)
- Menu items: 16px weight 500, bottom border separator
- Last item (Settings): slightly muted, smaller
- Chevrons: `›` right-aligned, very muted
- Text only — no icons, no emoji (per spec §11.4)

### Integration Points

- **iPhone Home:** [⋯] in top bar → open menu
- **iPad Grid:** [⋯] in top bar → open menu
- **Card Detail:** [⋯] → different menu (card options: edit colour, account details — stubbed or working)

### Animation

Optional: subtle fade + scale animation on open:
```css
.menu-enter {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
.menu-enter-active {
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: opacity 150ms, transform 150ms;
}
```

### Acceptance Criteria

- [ ] [⋯] button opens side menu on both iPhone home and iPad grid
- [ ] Menu floats top-right, does not full-screen
- [ ] Content behind visible through semi-transparent backdrop
- [ ] Four menu items: Recurring, Planned One-offs, Weekly Review, Settings
- [ ] Tap item → navigate + dismiss menu
- [ ] Tap backdrop → dismiss menu
- [ ] Text only, no icons, no emoji
- [ ] Works on both iPhone and iPad layouts
- [ ] Build passes

**Output:** `TASK DONE: Side menu (iPhone + iPad)`

---

## Task 9 — First Launch Setup Flow

**Build the setup flow that guides the user on first launch.**

### What to Build

File: `/app/setup/page.tsx` — First launch setup page
Modify: `/app/layout.tsx` — Check if setup is needed

### When It Triggers

On first launch, when the user has just logged in but:
- Settings row exists but `summary_target_date` is null
- No transactions exist (except seed data)
- The user hasn't completed setup

Check: `settings.summary_target_date IS NULL AND (SELECT COUNT(*) FROM transactions WHERE type != 'OPENING') = 0`

If true: redirect to `/setup` instead of `/`.

### Flow (3 steps)

```
STEP 1: Welcome
┌──────────────────────────────────────┐
│                                      │
│  Oovy & Ray's Money                  │
│                                      │
│  Your cashflow forecasting tool.     │
│  Forward-looking. Manual. No bank    │
│  feeds. No auto-reconciliation.      │
│                                      │
│  Let's set up your forecast.         │
│                                      │
│          [ Get Started → ]           │
└──────────────────────────────────────┘

STEP 2: Set Target Date
┌──────────────────────────────────────┐
│                                      │
│  When are you planning toward?       │
│                                      │
│  Pick a date in the future. Your     │
│  Budget will project forward to      │
│  this date.                          │
│                                      │
│  [15 June 2026                  ›]   │
│                                      │
│          [ Continue → ]              │
│  [ Skip for now ]                    │
└──────────────────────────────────────┘

STEP 3: Verify Exchange Rate
┌──────────────────────────────────────┐
│                                      │
│  Exchange Rate                       │
│                                      │
│  The current rate is:                │
│                                      │
│  1 GBP = 2.22 NZD                    │
│                                      │
│  [ Update Rate ]                     │
│  [ Auto-fetch daily  [OFF ●] ]       │
│                                      │
│          [ Looks Good → ]            │
└──────────────────────────────────────┘
```

### Completion

After the flow:
1. Target date saved (or left null if skipped)
2. Exchange rate confirmed or updated
3. Store a flag `has_completed_setup = true` in localStorage (or a `setup_completed` boolean in settings)

Next time the app loads: skip setup, go straight to home.

### Re-triggering

- The setup flow only runs once
- If skipped, user can set target date + exchange rate later in Settings
- If the user wants to run it again: clear localStorage flag

### Layout Component Logic

```typescript
// /app/layout.tsx — or a client wrapper
// Check localStorage for hasCompletedSetup
// If false AND settings.summary_target_date is null: redirect to /setup
// Otherwise: show home

// This check should happen after auth, before rendering main content
```

### Styling

- Centred, minimal layout
- Large app wordmark at top
- Step indicator dots at bottom (● ○ ○)
- Forward-only navigation (no back button)
- Clean whitespace, calm tone
- Light mode: white background, dark text

### Acceptance Criteria

- [ ] Setup flow triggers on first launch (after login)
- [ ] Three steps: Welcome, Target Date, Exchange Rate
- [ ] Target Date can be set or skipped
- [ ] Exchange Rate shown with option to update
- [ ] Completing flow saves settings + sets localStorage flag
- [ ] Setup does not re-trigger on subsequent launches
- [ ] Redirect to home after completion
- [ ] Settings page allows changing everything that was set in setup
- [ ] Build passes

**Output:** `TASK DONE: First launch setup flow`

---

## Sprint 8 Definition of Done

All 9 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] Settings page renders with all sections
- [ ] Summary Target Date: date picker, persists to settings
- [ ] Budget Comparison Date: Today/Custom picker, affects home + cards
- [ ] Account Order: drag-to-reorder, persists display_order
- [ ] Account Management: rename, colour picker (presets + custom), toggles, archive
- [ ] Exchange Rate: manual input + auto-fetch toggle + frankfurter API route
- [ ] Planned One-offs: list, add (reuse Sprint 4), delete
- [ ] Side Menu: floating card, 4 items, text-only, works on both layouts
- [ ] First Launch Setup: 3-step flow, runs once, skippable
- [ ] All routes accessible: `/settings`, `/settings/accounts`, `/settings/account-order`, `/settings/exchange-rate`, `/planned`, `/setup`
- [ ] All navigation wired: side menu → all destinations, settings → sub-pages, back buttons everywhere
- [ ] TypeScript strict: zero errors

---

## Notes for Claude

- **This is the polish sprint.** The app should feel complete after this. Focus on making things feel finished — smooth transitions, empty states, confirmation dialogs, sensible defaults.
- **Reuse aggressively.** The side menu reuses existing routes (Sprint 5 review, Sprint 6 recurring, Sprint 4 add transaction). Planned One-offs reuses the Add Transaction page. Don't rebuild things that already work.
- **Settings persistence:** Most settings changes should be immediate — save on change, not on "Save" button. Exchange rate manual input is the exception (has a Save button because it's a precise number).
- **Colour picker:** Two `<input type="color">` fields for gradient from/to, plus preset swatches. Simple and native. Don't over-engineer.
- **First launch flow:** localStorage flag prevents re-triggering. Simple and works. No need to add a column to the settings table.
- **Archive confirmation:** If the account balance is non-zero, warn the user. If balance is zero, archive immediately.
- **Side menu:** Floats top-right. Content visible behind. Text only. Same component works on both layouts — just different [⋯] button positions.
- **When done with each task, output:** `TASK DONE: [exact task name]`.
- **If spec is unclear, output:** `SPEC GAP: [description]` and stop.
- **If you see an issue, output:** `ISSUE: [description]` with reasoning.
