# Sprint 7 — iPad Cockpit Grid
> Phase 1 MVP | Est. Week 7–9 | 11 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, non-negotiables
2. **TRACKER.md** (root) — Sprint progress
3. **UX Mockups** — Visual reference (dark mode — translate to light):
   - `/Users/raymckenzie/Documents/Claude/Projects/budget-app/mock ups/oovy-ray-ipad-v2.html`
4. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §12–16 — **primary authority**
   - `oovy-ray-technical-stack-spec.md` §2.2 (responsive breakpoints), §4 (forecast engine), §6 (performance)
   - `oovy-ray-forecast-engine-spec.md` §10.3 (grid display rules)
5. **Existing components:** `/lib/forecast/engine.ts` (Sprint 2), `/components/ui/AmountDisplay.tsx`, `/components/ui/DatePicker.tsx`

---

## Sprint Goal

Build the full iPad cockpit grid — the living spreadsheet replacement. The grid shows every account's Budget balance day-by-day across a rolling 18-month window. Frozen headers, frozen date column, frozen bottom bar. Independent vertical and horizontal scroll with zero bounce. Virtual rendering for performance. Cell tap routing (empty → add transaction, has transaction → detail panel). Currency filter, jump to date, add account panel, and transaction detail panel.

---

## Responsive Breakpoint

The grid replaces the iPhone card stack at viewports ≥ 744px (iPad mini portrait and up).

```
< 744px   →  iPhone layout (Sprints 3–6)
>= 744px  →  iPad cockpit grid (this sprint)
>= 1024px →  iPad landscape (more columns visible)
```

Set in `tailwind.config.ts`:
```js
screens: {
  'md': '744px',
  'lg': '1024px',
}
```

---

## Task 1 — Responsive Layout Switch

**Implement the responsive switch between iPhone and iPad layouts.**

### What to Build

Modify: `/app/page.tsx` — Add responsive branching
File: `/app/grid/page.tsx` — iPad grid page (or co-located in page.tsx)

### Approach

Two layouts, one page:

```tsx
// /app/page.tsx — Client Component for responsive branching
'use client'

export default function HomePage() {
  const isIPad = useMediaQuery('(min-width: 744px)')
  
  if (isIPad) return <CockpitGrid />
  return <IPhoneHome />  // Existing Sprint 3 layout
}
```

Alternatively, use CSS to show/hide:
```tsx
<div className="md:hidden">
  <IPhoneHome />
</div>
<div className="hidden md:block">
  <CockpitGrid />
</div>
```

The CSS approach is preferred — avoids hydration mismatch with useMediaQuery. Both layouts render, one is hidden by CSS. This also means the grid is always warm (data fetching happens on server).

### Data Sharing

Both layouts need the same data: accounts, settings, exchange rate. Fetch once in the server component, pass to both:

```tsx
// page.tsx Server Component
export default async function Page() {
  const accounts = await fetchAccounts()
  const settings = await fetchSettings()
  
  return (
    <>
      <div className="md:hidden">
        <IPhoneHome accounts={accounts} settings={settings} />
      </div>
      <div className="hidden md:block">
        <CockpitGrid accounts={accounts} settings={settings} />
      </div>
    </>
  )
}
```

### Meta Viewport

Ensure the viewport meta tag allows scaling on iPad:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### Acceptance Criteria

- [ ] iPhone layout shown at < 744px
- [ ] iPad cockpit grid shown at ≥ 744px
- [ ] Resize browser window: layout swaps at 744px breakpoint
- [ ] Data fetched once on server, passed to both layouts
- [ ] No hydration mismatch
- [ ] iPad mini (744px) gets grid layout
- [ ] Build passes

**Output:** `TASK DONE: Responsive layout switch (iPhone ↔ iPad)`

---

## Task 2 — Grid Layout + Frozen Structure

**Build the grid shell with frozen headers, date column, and bottom bar.**

### What to Build

File: `/components/grid/CockpitGrid.tsx` — Main grid component
File: `/components/grid/GridHeader.tsx` — Frozen top header row
File: `/components/grid/GridDateColumn.tsx` — Frozen left date column
File: `/components/grid/GridBottomBar.tsx` — Frozen bottom bar

### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: App name | Currency filter | Jump to date | Totals │  ← Fixed
├──────────┬──────────┬──────────┬──────────┬──────────┬──────┤
│  Date    │ Monzo    │ Monzo    │ Monzo    │ Monzo    │ [+]  │  ← Frozen header
│          │ General  │ Spending │ Bills    │ Savings  │      │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────┤
│ Mon 12   │  £2,800  │      £0  │    £52   │  £3,368  │      │  ← Frozen date col
│ Tue 13   │ (£2,600) │    £200  │    £52   │  £3,368  │      │     Scrollable
│ Wed 14   │  £2,600  │    £200  │    £52   │  £3,368  │      │     body
│ ═══════════════════════ TODAY · 20 MAY ════════════════════ │  ← Today row
│ Tue 20   │  £5,934  │    £200  │   £230   │  £3,368  │      │
│ Wed 21   │  £5,934  │    £200  │   £230   │  £3,368  │      │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────┤
│ GBP Total: £11,502 │ NZD Total: NZ$25,560 │ Rate: 2.22 │ ... │  ← Frozen bottom bar
└──────────────────────────────────────────────────────────────┘
```

### Dimension Constants

From the mockup CSS variables:
```typescript
const GRID = {
  HEADER_HEIGHT: 52,        // px — frozen header row
  ROW_HEIGHT: 38,           // px — each date row
  DATE_COL_WIDTH: 110,      // px — frozen date column
  ACCOUNT_COL_WIDTH: 148,   // px — each account column
  ADD_COL_WIDTH: 48,        // px — [+] add account column
  BOTTOM_BAR_HEIGHT: 40,    // px — frozen bottom bar
}
```

### CockpitGrid Shell

```tsx
// /components/grid/CockpitGrid.tsx
export function CockpitGrid({ accounts, settings }: CockpitGridProps) {
  return (
    <div className="h-screen flex flex-col bg-[#f2f2f7]">
      {/* Top Bar — Task 2 */}
      <GridTopBar accounts={accounts} settings={settings} />
      
      {/* Grid area: header + body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Frozen header row — Task 2 */}
        <GridHeader accounts={visibleAccounts} />
        
        {/* Scrollable body — Task 3 */}
        <GridBody 
          accounts={visibleAccounts}
          dateRange={dateRange}
          gridData={gridData}
        />
      </div>
      
      {/* Frozen bottom bar — Task 2 */}
      <GridBottomBar totals={totals} settings={settings} />
    </div>
  )
}
```

### GridTopBar

```
┌──────────────────────────────────────────────────────────────┐
│ Oovy & Ray's Money  [GBP][NZD][All]  [📅 Jump]  £11,502  [+] [⋯] │
└──────────────────────────────────────────────────────────────┘
```

- App name: 16px, weight 700, no truncation
- Currency filter tabs: rendered, wired in Task 6
- Jump to date: rendered, wired in Task 7
- Cash Balance display: GBP and NZD totals side by side, small labels above
- [+]: Add transaction (blank), [⋯]: Side menu (stubbed)

Height: 52px. Background: slightly darker than body. Bottom border.

### GridHeader (Frozen)

```
│  Date    │ Monzo    │ Monzo    │ Monzo    │ Monzo    │ [+]  │
│          │ General  │ Spending │ Bills    │ Savings  │      │
```

- Date column (110px): "Date" label, centred/muted
- Account columns (148px each): account name (11px, weight 600) + currency/type badge (9px, muted)
- [+] column (48px): add account button, centred "+" (18px, muted, brightens on hover)
- Header account columns use the account's gradient as a subtle top border or background tint
- Header is `position: sticky; top: 0; z-index: 30;` within the scroll container

### Date Cell (frozen column, one per row)

```
│ Mon 12   │
│ Tue 13   │
│ Wed 14   │
```

- Day: 10px, weight 500, uppercase, muted (e.g. "Mon")
- Date: 12px, weight 600 (e.g. "12")
- Month: 10px, weight 500, muted (e.g. "May")
- Today row: "TODAY" pill (9px, white text, subtle dark background, border-radius 4px)
- Width: 110px fixed
- Border-right separates from data columns

### GridBottomBar (Frozen)

```
│ GBP Total: £11,502 │ NZD Total: NZ$25,560 │ Rate: 1 GBP = 2.22 NZD │ Last review: 17 May │
```

- Height: 40px
- Background: slightly darker, top border
- Sections separated by 1px vertical dividers
- Labels: 10px, weight 600, uppercase, muted
- Values: 13px, weight 600
- Right side: last review date + forecast range

### Styling (Light Mode)

Convert from the dark mockup:
- Grid background: white or very light (#fafafa)
- Row borders: 1px, very subtle (rgba(0,0,0,0.04))
- Today row background: rgba(0,0,0,0.03) with slightly stronger top/bottom border
- Text: #1c1c1e primary, muted: rgba(0,0,0,0.45), tertiary: rgba(0,0,0,0.25)
- Headers/bottom bar: rgba(255,255,255,0.95) with backdrop-blur (frosted)
- All numeric values: tabular-nums, right-aligned in data cells

### Acceptance Criteria

- [ ] Grid shell renders with top bar, header, body, bottom bar
- [ ] Frozen header row: account names + currency badges + [+] button
- [ ] Frozen date column: day, date, month for each row
- [ ] Frozen bottom bar: GBP total, NZD total, exchange rate
- [ ] Dimensions match mockup: row 38px, date col 110px, account col 148px
- [ ] Light mode colours: white body, subtle borders, frosted headers
- [ ] Font: Figtree, tabular-nums for all amounts
- [ ] Build passes

**Output:** `TASK DONE: Grid layout (frozen headers, frozen date column, frozen bottom bar)`

---

## Task 3 — Virtual Row Rendering

**Implement virtual scrolling for the grid body using @tanstack/react-virtual.**

### What to Build

File: `/components/grid/GridBody.tsx` — Virtual scroll body
File: `/components/grid/GridRow.tsx` — Single row component
File: `/components/grid/GridCell.tsx` — Single cell component

### Why Virtual Rendering

The grid renders ~550 rows (18 months) × 15 accounts = ~8,250 cells. Without virtualisation, this many DOM nodes will cause performance issues. @tanstack/react-virtual only renders the rows visible in the viewport plus a small overscan buffer.

### Implementation

```tsx
// /components/grid/GridBody.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function GridBody({ accounts, dateRange, gridData }: GridBodyProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: dateRange.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => GRID.ROW_HEIGHT,  // 38px
    overscan: 10,  // Render 10 rows above/below viewport
  })
  
  return (
    <div 
      ref={parentRef}
      className="flex-1 overflow-auto"
      style={{ overscrollBehavior: 'none' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const date = dateRange[virtualRow.index]
          const isToday = isSameDay(date, new Date())
          
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <GridRow
                date={date}
                accounts={accounts}
                balances={gridData.balances}
                isToday={isToday}
                onCellTap={handleCellTap}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### GridRow Component

```tsx
interface GridRowProps {
  date: Date
  accounts: Account[]
  balances: Map<string, Map<string, number>>  // accountId → dateISO → balance
  isToday: boolean
  onCellTap: (accountId: string, date: Date, hasTransaction: boolean) => void
}

export function GridRow({ date, accounts, balances, isToday, onCellTap }: GridRowProps) {
  const dateISO = format(date, 'yyyy-MM-dd')
  
  return (
    <div className={`flex border-b border-black/5 ${isToday ? 'bg-black/[0.03] border-black/10' : ''}`}>
      {/* Frozen date cell */}
      <GridDateCell date={date} isToday={isToday} />
      
      {/* Scrollable account cells */}
      <div className="flex overflow-x-hidden flex-1">
        {accounts.map(account => {
          const balance = balances.get(account.id)?.get(dateISO) ?? account.opening_balance
          const hasTransaction = checkHasTransaction(account.id, dateISO) // from gridData metadata
          
          return (
            <GridCell
              key={account.id}
              balance={balance}
              currency={account.currency}
              hasTransaction={hasTransaction}
              isToday={isToday}
              onClick={() => onCellTap(account.id, date, !!hasTransaction)}
            />
          )
        })}
        
        {/* Add column spacer */}
        <div style={{ width: GRID.ADD_COL_WIDTH, flexShrink: 0 }} />
      </div>
    </div>
  )
}
```

### GridCell Component

```tsx
interface GridCellProps {
  balance: number
  currency: Currency
  hasTransaction: boolean
  isToday: boolean
  onClick: () => void
}

export function GridCell({ balance, currency, hasTransaction, isToday, onClick }: GridCellProps) {
  const isZero = balance === 0
  const isNegative = balance < 0
  
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center justify-end px-3 cursor-pointer relative
        border-r border-black/[0.04]
        ${isToday ? 'text-black font-semibold' : ''}
      `}
      style={{ 
        width: GRID.ACCOUNT_COL_WIDTH, 
        minWidth: GRID.ACCOUNT_COL_WIDTH,
        height: GRID.ROW_HEIGHT,
      }}
    >
      {/* Transaction indicator bar — left edge */}
      {hasTransaction && (
        <div 
          className="absolute left-2 w-[3px] h-4 rounded-sm bg-black/15"
        />
      )}
      
      {/* Amount */}
      <span className={`
        text-xs font-medium tracking-tight tabular-nums
        ${isZero ? 'text-black/25' : 'text-black/75'}
      `}>
        {formatCellAmount(balance, currency)}
      </span>
    </div>
  )
}
```

### Cell Amount Formatting

```typescript
function formatCellAmount(balance: number, currency: Currency): string {
  const d = toDecimal(balance)
  const prefix = currency === 'GBP' ? '£' : 'NZ$'
  
  if (d.isZero()) return `${prefix}0`
  if (d.isNegative()) {
    // Debit: bracket notation
    const abs = d.abs()
    return `(${prefix}${abs.toDecimalPlaces(0).toString()})`
  }
  return `${prefix}${d.toDecimalPlaces(0).toString()}`
}
```

Note: Grid cells show amounts at 0 decimal places for compactness. Not £2,800.00 — just £2,800. This matches the mockup.

### Today Row

- Background: `rgba(0,0,0,0.03)` with slightly stronger top/bottom border
- Date cell: "Today" pill visible, date number at full weight/colour
- All cells: amounts at full opacity and slightly bolder weight
- Optional: subtle highlight animation on initial open

### Scroll Behaviour

- `overscroll-behavior: none` on both axes — no bounce
- `-webkit-overflow-scrolling: auto` — disable momentum/bounce on iOS
- Vertical scroll: scroll body independently
- Horizontal scroll: account columns scroll independently within each row
- Both axes scrollable simultaneously (not locked to one axis at a time)

### Performance

- Virtualised rows: only ~20-30 DOM rows rendered at any time (vs 550)
- Pre-compute `gridData.balances` once (from Sprint 2 getGrid) — no per-cell calculation
- Tabular-nums for consistent column widths
- Avoid re-renders: memoize GridCell, use React.memo

### Acceptance Criteria

- [ ] Grid renders with virtual scrolling — not all 550 rows in DOM
- [ ] Scrolls vertically through date range
- [ ] Scrolls horizontally through accounts
- [ ] Today row highlighted
- [ ] Transaction indicator bars visible on cells with transactions
- [ ] Zero balances shown at reduced opacity
- [ ] Debit amounts shown in brackets
- [ ] No scroll bounce on either axis
- [ ] Both axes scroll independently
- [ ] Performance: < 500ms initial render, smooth 60fps scroll
- [ ] Build passes

**Output:** `TASK DONE: Virtual row rendering (@tanstack/react-virtual)`

---

## Task 4 — Today Row + Cell Tap Routing

**Implement today row highlight and cell tap behaviour.**

### What to Build

Modify: `/components/grid/GridBody.tsx` — Auto-scroll to today + tap handling

### Auto-Scroll to Today

On initial load, the grid scrolls vertically so today's row is visible (ideally centred):

```typescript
useEffect(() => {
  const todayIndex = dateRange.findIndex(d => isSameDay(d, new Date()))
  if (todayIndex >= 0 && parentRef.current) {
    virtualizer.scrollToIndex(todayIndex, { align: 'center' })
  }
}, [])  // Run once on mount
```

### Today Row Styling

```
╠══════════════════════ TODAY · 20 MAY ═══════════════════════╣
│ Tue 20 TODAY │  £5,934  │    £200  │   £230   │  £3,368  │
╚═════════════════════════════════════════════════════════════╝
```

- Row background: subtle tint (rgba(0,0,0,0.03))
- Top and bottom border: slightly stronger than normal row borders
- "TODAY" pill in date cell: dark background, white text, small, uppercase
- All cell values rendered at full weight/opacity (not muted like other rows)

### Cell Tap Routing

Per UX spec §12.8:

```typescript
function handleCellTap(accountId: string, date: Date, hasTransaction: boolean) {
  const isPast = isBefore(date, startOfDay(new Date()))
  const isToday = isSameDay(date, new Date())
  const isFuture = isAfter(date, startOfDay(new Date()))
  
  if (isPast) {
    // Past date — any: View only panel
    openTransactionDetail(accountId, date, { readOnly: true })
  } else if (hasTransaction) {
    // Today or future — has transaction: Transaction Detail Panel
    openTransactionDetail(accountId, date, { readOnly: false })
  } else {
    // Today or future — empty: Add Transaction (context pre-filled)
    openAddTransaction(accountId, date)
  }
}
```

### Tap Behaviour Details

| Cell Type | Action | Panel |
|-----------|--------|-------|
| Past date (any) | View only | Transaction Detail (read-only) |
| Today — has tx | View + edit | Transaction Detail (editable) |
| Today — empty | Create new | Add Transaction (pre-filled) |
| Future — has tx | View + edit | Transaction Detail (editable) |
| Future — empty | Create new | Add Transaction (pre-filled) |

Context pre-fill for Add Transaction from grid:
- From account: the account whose column was tapped
- Date: the date whose row was tapped
- Navigate to `/add?fromAccountId={id}&date={dateISO}&returnTo=/grid`

### Acceptance Criteria

- [ ] Grid opens scrolled to today's row (centred)
- [ ] Today row visually distinct: background tint, TODAY pill, full-weight amounts
- [ ] Tap past date cell → read-only detail panel
- [ ] Tap today/future cell with transaction → editable detail panel
- [ ] Tap today/future empty cell → Add Transaction pre-filled with account + date
- [ ] Cell tap feedback: subtle highlight flash or brief scale
- [ ] Panels slide in from right (Task 8–9)
- [ ] Build passes

**Output:** `TASK DONE: Today row highlight + cell tap routing`

---

## Task 5 — No-Bounce Scroll on Both Axes

**Ensure the grid has zero scroll bounce on both vertical and horizontal axes.**

### What to Build

Apply CSS to the grid body and row scroll containers:

```css
.grid-body {
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: none;           /* No bounce on vertical */
  -webkit-overflow-scrolling: auto;    /* Disable iOS momentum bounce */
}

.row-scroll {
  overflow-x: auto;
  overscroll-behavior-x: none;         /* No bounce on horizontal */
  -webkit-overflow-scrolling: auto;
  
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;               /* Firefox */
  -ms-overflow-style: none;            /* IE/Edge */
}
.row-scroll::-webkit-scrollbar {
  display: none;                       /* Chrome/Safari */
}
```

### Synchronised Horizontal Scroll

All rows must scroll horizontally together. If row 5 scrolls right by 200px, row 20 must also be at 200px. Implementation:

```typescript
// Single horizontal scroll position, shared across all virtual rows
const [scrollLeft, setScrollLeft] = useState(0)

// Each row's .row-scroll div syncs to this value
<div className="row-scroll" style={{ transform: `translateX(-${scrollLeft}px)` }}>
```

Actually, the simpler approach: use a single outer horizontal scroll container that wraps all rows. The header row and data rows are inside the same horizontally-scrollable container:

```
┌─────────────────────────────────────────────┐
│ [Frozen date col] [── Horizontal scroll ──] │ ← Single scroll container
│                  │ Acc1  │ Acc2  │ Acc3  │   │
│                  │ £100  │ £200  │ £300  │   │   ← All rows scroll together
│                  │ £150  │ £250  │ £350  │   │
└─────────────────────────────────────────────┘
```

The frozen date column sits outside the horizontal scroll. The header row sits above the vertical scroll. The bottom bar is fixed below.

**Layout structure:**
```
<div class="grid-container">
  <div class="grid-header">  ← Sticky top
    <div class="frozen-date-header" />  ← 110px fixed, outside horizontal scroll
    <div class="scrollable-header">     ← Horizontally scrollable
      <div class="account-header" /> × N
      <div class="add-header" />
    </div>
  </div>
  
  <div class="grid-body">  ← Vertically scrollable
    <div class="frozen-date-column">    ← 110px fixed, outside horizontal scroll
      <div class="date-cell" /> × N     ← These DO scroll vertically with the body
    </div>
    <div class="scrollable-body">       ← Both horizontally + vertically scrollable
      <div class="grid-row">            ← Virtual rows here
        <div class="data-cell" /> × N
      </div>
    </div>
  </div>
</div>
```

The key insight: the frozen date column scrolls vertically but not horizontally. The data area scrolls both ways. When the user scrolls horizontally in the data area, the header row's scroll position must sync.

### Scroll Sync

```typescript
const bodyScrollRef = useRef<HTMLDivElement>(null)
const headerScrollRef = useRef<HTMLDivElement>(null)

// Sync header horizontal scroll with body
useEffect(() => {
  const body = bodyScrollRef.current
  const header = headerScrollRef.current
  if (!body || !header) return
  
  const handleScroll = () => {
    header.scrollLeft = body.scrollLeft
  }
  
  body.addEventListener('scroll', handleScroll)
  return () => body.removeEventListener('scroll', handleScroll)
}, [])
```

### Acceptance Criteria

- [ ] Vertical scroll: no bounce, no rubber-band effect
- [ ] Horizontal scroll: no bounce, no rubber-band effect
- [ ] Frozen date column stays fixed during horizontal scroll
- [ ] Frozen header row stays fixed during vertical scroll
- [ ] Header horizontal scroll syncs with body horizontal scroll
- [ ] Both axes independently scrollable
- [ ] iOS Safari: no overscroll behaviour
- [ ] Build passes

**Output:** `TASK DONE: No-bounce scroll on both axes`

---

## Task 6 — Currency Filter

**Build the GBP / NZD / All currency filter in the top bar.**

### What to Build

File: `/components/grid/CurrencyFilter.tsx`

### Layout (from mockup)

```
Show  [GBP] [NZD] [All]
```

Three pill buttons in the top bar. Both GBP and NZD are active by default. The user can toggle them independently.

### Behaviour

Per UX spec §12.6:

| State | GBP columns | NZD columns |
|-------|-------------|-------------|
| Both active | Visible | Visible |
| GBP only | Visible | Hidden |
| NZD only | Hidden | Visible |
| All | Visible (same as both) | Visible |

**Guard:** Cannot turn both off simultaneously. If the user taps the last active tab, ignore the tap.

### Component

```tsx
interface CurrencyFilterProps {
  activeCurrencies: Set<Currency>     // Which currencies are shown
  onToggle: (currency: Currency) => void
}

export function CurrencyFilter({ activeCurrencies, onToggle }: CurrencyFilterProps) {
  const gbpActive = activeCurrencies.has('GBP')
  const nzdActive = activeCurrencies.has('NZD')
  const allActive = gbpActive && nzdActive
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30">
        Show
      </span>
      <div className="flex gap-0.5 bg-black/5 rounded-[10px] p-0.5">
        <button 
          onClick={() => onToggle('GBP')}
          className={`px-3.5 py-1 rounded-lg text-[13px] font-semibold transition
            ${gbpActive ? 'bg-black/10 text-black' : 'text-black/40'}`}
        >
          GBP
        </button>
        <button 
          onClick={() => onToggle('NZD')}
          className={`px-3.5 py-1 rounded-lg text-[13px] font-semibold transition
            ${nzdActive ? 'bg-black/10 text-black' : 'text-black/40'}`}
        >
          NZD
        </button>
        <button 
          onClick={() => { /* Activate both */ }}
          className={`px-3.5 py-1 rounded-lg text-[13px] font-semibold transition
            ${allActive ? 'bg-black/10 text-black' : 'text-black/40'}`}
        >
          All
        </button>
      </div>
    </div>
  )
}
```

### Effect on Grid

When a currency is toggled off:
- All accounts with that currency are hidden from the grid (columns removed)
- Grid recalculates column widths — total width changes
- Cash Balance totals in bottom bar update to reflect only visible currencies
- The [+] add account column is always visible regardless of filter

### Acceptance Criteria

- [ ] GBP, NZD, All tabs rendered in top bar
- [ ] Tapping GBP toggles GBP columns on/off
- [ ] Tapping NZD toggles NZD columns on/off
- [ ] Tapping All activates both
- [ ] Cannot turn both off — last active tab tap is ignored
- [ ] Active tabs have highlighted background
- [ ] Grid updates column visibility immediately
- [ ] Bottom bar totals update to reflect visible currencies only
- [ ] Build passes

**Output:** `TASK DONE: Currency filter (GBP / NZD / All)`

---

## Task 7 — Jump to Date in Grid

**Implement the jump-to-date feature that scrolls the grid to any date.**

### What to Build

Add to `/components/grid/CockpitGrid.tsx` — Jump to date input in top bar

### Layout (from mockup)

```
[📅 Jump to date]   ← Inline input in top bar
```

Tapping activates an inline date input. User types or selects a date → grid scrolls to that row.

### Behaviour

1. User clicks "Jump to date" in top bar
2. Input field activates, date picker opens (reuse `/components/ui/DatePicker.tsx`)
3. User selects a date
4. Grid scrolls vertically to centre that date's row
5. Row gets a brief highlight animation (2 second pulse, then fades)
6. Date input closes

```typescript
function handleJumpToDate(date: Date) {
  const targetIndex = dateRange.findIndex(d => isSameDay(d, date))
  if (targetIndex >= 0) {
    virtualizer.scrollToIndex(targetIndex, { align: 'center' })
    setHighlightedDate(date)
    setTimeout(() => setHighlightedDate(null), 2000)  // Clear highlight after 2s
  }
}
```

### Date Range

The picker min/max should match the grid's date range:
- Min: opening date (1 Aug 2024)
- Max: 18 months from today

### Highlight Animation

When a date is jumped to, the target row gets a brief background pulse:

```css
@keyframes date-highlight {
  0%   { background: rgba(0,0,0,0.08); }
  100% { background: transparent; }
}

.grid-row.highlighted {
  animation: date-highlight 2s ease-out;
}
```

### Acceptance Criteria

- [ ] "Jump to date" input in top bar
- [ ] Clicking opens date picker with correct min/max bounds
- [ ] Selecting a date scrolls grid to that row (centred)
- [ ] Target row briefly highlights (2s animation)
- [ ] Works for past dates (historical)
- [ ] Works for future dates (projected)
- [ ] Date picker matches grid's date range (opening date → 18 months forward)
- [ ] Build passes

**Output:** `TASK DONE: Jump to date in grid`

---

## Task 8 — Add Transaction Panel (Grid Entry)

**Build the slide-in Add Transaction panel for grid cell taps.**

### What to Build

File: `/components/transactions/GridAddTransactionPanel.tsx`

### Trigger

Tap an empty cell (today or future date) → panel slides in from the right. Account and date are pre-filled from the tapped column and row.

### Panel Layout (from mockup + UX spec §13)

```
┌──────────────────────────────────────┐
│ Add Transaction                  [✕] │
│──────────────────────────────────────│
│                                      │
│  £0.00_                              │  ← Amount, large, auto-focus
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ From   Monzo General           › │ │  ← Pre-filled from column
│ │ To     Select account          › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Date   26 May 2026             › │ │  ← Pre-filled from row
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Type   [DR ✓]  [CR]             │ │  ← DR default
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Recurring            [OFF ●]     │ │  ← Toggle
│ └──────────────────────────────────┘ │
│                                      │
│  [If recurring ON: frequency chips, │
│   day picker, weekday toggle...]    │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Name   Optional                › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Note   Optional                › │ │
│ └──────────────────────────────────┘ │
│                                      │
│          [ Add Transaction ]         │
└──────────────────────────────────────┘
```

### Panel Width

360px (from mockup). Slides in from the right edge. Grid remains visible behind at reduced width.

### Recurring Toggle

This is a key differentiator from the iPhone Add Transaction (Sprint 4). The grid entry panel includes a "Make this a recurring schedule" toggle. When ON, it expands to show:
- Frequency chips (Weekly, Fortnightly, Monthly, Quarterly, Biannual)
- Day of week / day of month picker (contextual)
- Weekday only toggle
- Apply from date (defaults to the cell's date)

This creates both a stored transaction AND a recurring schedule in one action. The logic:
1. Insert the transaction into `transactions` table
2. If recurring toggle ON: also insert into `recurring_schedules` table
3. Link the transaction's `recurring_id` to the new schedule

### Reuse Existing Components

- Account picker: reuse from Sprint 4 (`/components/accounts/AccountPicker.tsx`)
- Date picker: reuse (`/components/ui/DatePicker.tsx`)
- Recurring form logic: reuse `/lib/db/recurring.ts` from Sprint 6
- Amount input: same pattern as Sprint 4 Add Transaction

### Styling (Light Mode)

- Panel background: white with subtle shadow (not dark like the mockup)
- Panel border-radius: 20px (left side only, or all sides)
- Shadow: 0 24px 80px rgba(0,0,0,0.15)
- Fields: light grey background (rgba(0,0,0,0.04)), rounded 10px
- Type chips: DR/CR pill buttons
- Recurring toggle: similar to mockup but light mode
- Submit button: dark background, white text

### Post-Submit

- Transaction inserted into Supabase
- If recurring: schedule created
- Grid recalculates immediately (use forecast store invalidation from Sprint 4)
- Panel closes, grid shows updated values
- Cell that was tapped now shows the new transaction indicator

### Acceptance Criteria

- [ ] Panel slides in from right on empty cell tap
- [ ] From account pre-filled from tapped column
- [ ] Date pre-filled from tapped row
- [ ] DR selected by default
- [ ] Recurring toggle expands to show frequency + day + weekday options
- [ ] Cross-currency detected when To account has different currency
- [ ] Submit creates transaction (and schedule if recurring)
- [ ] Grid recalculates after submit, panel closes
- [ ] Tapped cell now shows transaction indicator
- [ ] Panel closes on ✕ without saving
- [ ] Build passes

**Output:** `TASK DONE: Add Transaction panel (grid entry — context pre-filled)`

---

## Task 9 — Transaction Detail Panel

**Build the slide-in detail panel for viewing and editing transactions from the grid.**

### What to Build

File: `/components/transactions/TransactionDetailPanel.tsx`

### Trigger

Tap a cell that has a transaction (past, today, or future) → detail panel slides in.

### Panel Layout (from mockup)

```
┌──────────────────────────────────────┐
│ Transaction                      [✕] │
│──────────────────────────────────────│
│                                      │
│  Name                                │
│  [Untitled                         ›]│
│                                      │
│  Type          Amount                │
│  [DR ✓][CR]    (£178.34)          › │
│                                      │
│  Date                                │
│  [30 May 2026                      ›]│
│                                      │
│  From Account                        │
│  [Monzo General                    ›]│
│                                      │
│  To Account                          │
│  [Monzo Bills                      ›]│
│                                      │
│  ── If recurring ──                  │
│  [Recurring ON]  ← toggle           │
│  Frequency: [Monthly ✓]              │
│  Edit scope: ○ This ○ Future ○ All  │
│                                      │
│  [Delete]              [Save]        │
└──────────────────────────────────────┘
```

### Read-Only vs Editable

- **Past date:** Read-only. No fields editable. Delete button hidden. Reason: historical integrity.
- **Today or future:** Editable. All fields changeable. Save persists changes.

### Recurring Transaction Detail

If the transaction has a `recurring_id`:

1. Show the schedule info: name, amount, frequency, next occurrence
2. Show the **three edit scopes** (from Sprint 6):
   - This occurrence only
   - All future from [date]
   - Entire series
3. Editing fields changes behaviour based on scope:
   - "This occurrence": creates an override
   - "All future": appends to effective_changes
   - "Entire series": updates the schedule row

### Delete Button

- Past date: hidden
- Today/future non-recurring: "Delete" deletes the transaction row
- Today/future recurring: "Delete" shows three-scope confirmation (from Sprint 6)
- Destructive styling: red-tinted background on delete button

### Persistence

- Update transaction row on save
- If recurring scope 1: create override
- If recurring scope 2: update effective_changes
- If recurring scope 3: update schedule
- Trigger grid recalculation after save/delete

### Styling

Same panel style as Add Transaction (360px, slides from right, white background, light mode).

### Acceptance Criteria

- [ ] Panel slides in on cell tap (cell with transaction)
- [ ] Transaction details displayed: name, type, amount, date, accounts
- [ ] Past date: read-only, no delete
- [ ] Today/future: editable, save + delete buttons
- [ ] Recurring transactions: three edit scopes visible
- [ ] Delete with three-scope confirmation for recurring
- [ ] Save persists changes and triggers grid recalculation
- [ ] Panel closes on ✕ or after save
- [ ] Build passes

**Output:** `TASK DONE: Transaction Detail Panel (edit/delete)`

---

## Task 10 — Add Account Panel

**Build the Add Account panel triggered from the [+] in the grid header.**

### What to Build

File: `/components/accounts/AddAccountPanel.tsx`

### Trigger

Tap the [+] button in the last column of the frozen header row → panel slides in.

### Panel Layout (from mockup)

```
┌──────────────────────────────────────┐
│ New Account                      [✕] │
│──────────────────────────────────────│
│                                      │
│  Account Name                        │
│  [e.g. Holiday Fund                ›]│
│                                      │
│  Currency                            │
│  [GBP £ ✓]  [NZD $]                 │
│                                      │
│  Account Type                        │
│  [Current ✓][Savings][Credit]        │
│  [Tracking][Debt]                    │
│                                      │
│  ────────────────────────────────    │
│                                      │
│  Include in Cash Balance   [ON ●]    │
│  Counts toward total                 │
│                                      │
│  Include in Review         [ON ●]    │
│  Appears in weekly review            │
│                                      │
│          [ Create Account ]          │
└──────────────────────────────────────┘
```

### Validation

- Name: required, non-empty
- Currency: required (default GBP)
- Account type: required (default CURRENT)
- Type rules:
  - CURRENT/SAVINGS/CREDIT/DEBT: cash balance + review always ON (toggles disabled)
  - TRACKING: both toggles user-controllable (default ON for cash balance, OFF for review)
  - EXTERNAL: not selectable (system-only)

### Persistence

```typescript
async function createAccount(data: NewAccountForm): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  
  // Determine next display_order
  const { data: last } = await supabase
    .from('accounts')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .single()
  
  const nextOrder = (last?.display_order ?? 0) + 1
  
  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      name: data.name,
      type: data.type,
      currency: data.currency,
      include_in_cash_balance: data.includeInCashBalance,
      include_in_review: data.includeInReview,
      display_order: nextOrder,
      opening_balance: 0,
      opening_date: '2024-08-01',
      color_from: generateDefaultColor(nextOrder),  // Default gradient
      color_to: generateDefaultColor(nextOrder + 5),
    })
    .select('id')
    .single()
  
  if (error) throw error
  return account.id
}
```

### Default Colour Assignment

Cycle through a palette of default gradients for new accounts:
```typescript
const DEFAULT_GRADIENTS = [
  { from: '#1a1a2e', to: '#0f3460' },  // Deep navy
  { from: '#2d1b69', to: '#11998e' },  // Purple → teal
  { from: '#0d4f2f', to: '#1a8a4a' },  // Forest green
  { from: '#4a1942', to: '#c74b50' },  // Burgundy → coral
  { from: '#1a237e', to: '#283593' },  // Indigo
  { from: '#1b4332', to: '#2d6a4f' },  // Deep teal
  { from: '#3d1c4d', to: '#7b2d8e' },  // Plum
  { from: '#4a3520', to: '#8b6914' },  // Bronze
]
```

### Post-Create

- Account appears immediately in the grid (new column)
- Grid recalculates (new account has zero transactions, so just opening_balance)
- Account also appears in the iPhone card stack
- Panel closes

### Styling

Panel width: 320px (narrower than transaction panels). Same slide-in-from-right animation, light mode.

### Acceptance Criteria

- [ ] [+] in grid header opens Add Account panel
- [ ] Form fields: name, currency (GBP/NZD chips), type (all 5 types as chips)
- [ ] Toggles disabled for CURRENT/SAVINGS/CREDIT/DEBT (always ON)
- [ ] Toggles user-controllable for TRACKING
- [ ] EXTERNAL not selectable
- [ ] Submit creates account with default gradient + next display_order
- [ ] New account appears in grid immediately
- [ ] Panel closes on create
- [ ] Build passes

**Output:** `TASK DONE: Add Account panel`

---

## Task 11 — Grid Recalculation + Integration

**Wire the grid to recalculate on any change and integrate all panels.**

### What to Build

No new files. Wire up state management and recalculation triggers.

### Forecast Store Integration

The grid subscribes to the forecast store (from Sprint 2/4):

```typescript
// CockpitGrid.tsx
const forecastVersion = useForecastStore(s => s.version)

// Recalculate grid data when version changes
const gridData = useMemo(() => {
  return getGrid(accounts, dateRange.start, dateRange.end, tx, schedules, skips, overrides)
}, [forecastVersion, accounts, dateRange])
```

### Recalculation Triggers

The grid recalculates after:
1. Add Transaction submitted (from grid panel or iPhone)
2. Edit Transaction saved (from detail panel)
3. Delete Transaction confirmed
4. Add Account created
5. Recurring schedule added/edited/deleted (any scope)
6. Currency filter changed
7. Exchange rate updated

Each trigger calls `forecastStore.invalidate([affectedAccountIds])` which bumps the version counter.

### Panel State Management

```typescript
type PanelState = 
  | { type: 'none' }
  | { type: 'addTransaction'; accountId: string; date: Date }
  | { type: 'transactionDetail'; transactionId: string; readOnly: boolean }
  | { type: 'addAccount' }

const [panel, setPanel] = useState<PanelState>({ type: 'none' })
```

Only one panel open at a time. Opening a new panel closes the current one.

### Integration Checklist

- [ ] Grid fetches data on mount (accounts, settings, exchange rate)
- [ ] Grid calculates initial balances using forecast engine
- [ ] Cell tap opens correct panel based on date + content
- [ ] Add Transaction panel pre-fills account + date from tapped cell
- [ ] Transaction Detail panel shows correct transaction data
- [ ] Add Account panel creates account → grid refreshes
- [ ] Currency filter toggles show/hide columns
- [ ] Jump to date scrolls grid to target row
- [ ] Any transaction change → grid recalculates within 200ms
- [ ] Panel close returns focus to grid
- [ ] Top bar [+][⋯] buttons functional (stubbed or working)
- [ ] Bottom bar totals update live
- [ ] `npm run build` exits 0
- [ ] TypeScript strict: zero errors

### Performance Verification

- Grid initial render: < 500ms (per spec §6.1)
- Full grid recalculation: < 200ms
- After transaction add: no visible loading — update feels instant
- Scroll: 60fps, no jank
- Virtual rows: only ~25 DOM rows for 550-row dataset

### Acceptance Criteria

- [ ] Grid recalculates after any add/edit/delete
- [ ] Panels open/close without grid flicker
- [ ] Bottom bar totals always correct
- [ ] Currency filter persists across recalculations
- [ ] Today row auto-updates at midnight (or on next page load)
- [ ] Full integration: tap cell → panel → save → grid updates
- [ ] Build passes

**Output:** `TASK DONE: Grid recalculation on any change`

---

## Sprint 7 Definition of Done

All 11 tasks complete. Verifiable by:

- [ ] `npm run build` exits with 0
- [ ] iPad layout triggers at ≥ 744px viewport width
- [ ] Grid renders with frozen headers, date column, and bottom bar
- [ ] Virtual scrolling: ~25 DOM rows for 550-row dataset
- [ ] Both axes scroll independently with zero bounce
- [ ] Today row highlighted with TODAY pill
- [ ] Cell tap routes correctly: empty → add tx, has tx → detail, past → read-only
- [ ] Currency filter toggles GBP/NZD columns independently
- [ ] Jump to date scrolls + highlights target row
- [ ] Add Transaction panel: pre-filled account + date, recurring toggle
- [ ] Transaction Detail panel: read-only for past, editable for today/future
- [ ] Add Account panel: name, currency, type, toggles
- [ ] Grid recalculates < 200ms after any change
- [ ] Panels slide in from right, grid remains visible
- [ ] All amounts: NZ$ prefix, debit brackets, no colour coding
- [ ] Light mode aesthetic matches mockup layout (translated from dark)
- [ ] Figtree font, tabular-nums throughout
- [ ] TypeScript strict: zero errors

---

## Notes for Claude

- **This is the biggest sprint.** 11 tasks. The grid is the app's crown jewel — the living spreadsheet replacement. Take your time with the layout and scroll behaviour.
- **Virtual scrolling is essential.** Without @tanstack/react-virtual, rendering 550 rows × 15 columns will tank performance. The virtualizer should be the first thing you wire after the layout shell.
- **Light mode translation:** The mockup is dark mode. Translate everything to light: white/off-white background, dark text, frosted glass headers, subtle borders. The structure and spacing are identical — just flip the colour values.
- **Scroll sync is tricky.** The frozen date column scrolls vertically with the body but not horizontally. The header row scrolls horizontally with the body but not vertically. This means two scroll containers that must stay in sync. The simplest approach: a single scrollable body area where the date column is `position: sticky; left: 0` and the header row is `position: sticky; top: 0`.
- **Sprint 2 dependency:** The grid needs `getGrid()` from the forecast engine. If Sprint 2 is not complete, render the grid with `opening_balance` in every cell as placeholder. The layout, scrolling, and panels all work — just the numbers won't reflect live Budget calculations yet.
- **Panels share DNA with iPhone components.** Reuse AccountPicker, DatePicker, AmountDisplay from earlier sprints. Don't rebuild them.
- **Cell amounts at 0 decimal places.** The mockup shows `£2,800` not `£2,800.00` in grid cells. This is intentional for density. Full decimal formatting stays on cards and detail views.
- **When done with each task, output:** `TASK DONE: [exact task name]`.
- **If spec is unclear, output:** `SPEC GAP: [description]` and stop.
- **If you see an issue, output:** `ISSUE: [description]` with reasoning.
