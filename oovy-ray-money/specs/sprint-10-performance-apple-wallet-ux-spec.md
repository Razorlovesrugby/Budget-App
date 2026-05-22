# Sprint 10 — Performance + Apple Wallet UX
> Phase 1 MVP | Est. Week 12–13 | 8 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Developer bible, non-negotiables
2. **TRACKER.md** (root) — Sprint progress
3. **Spec docs** in `/specs/`:
   - `oovy-ray-ux-flow-spec-v2.md` §6 (iPhone Home Screen) — Apple Wallet card stack behaviour
   - `oovy-ray-forecast-engine-spec.md` §4–5 (Budget formula, grid calculation)
   - `oovy-ray-data-model-spec.md` (all data types)
4. **Existing code:**
   - `/app/page.tsx` — Home page (server component, re-fetches everything)
   - `/app/layout.tsx` — Root layout (viewport config)
   - `/app/accounts/[id]/page.tsx` — Card detail page (server fetch + client render)
   - `/components/accounts/AccountStack.tsx` — Card stack (client component)
   - `/components/accounts/AccountCard.tsx` — Single card
   - `/components/accounts/AccountDetailClient.tsx` — Detail page client
   - `/components/transactions/TransactionTimeline.tsx` — Timeline
   - `/lib/forecast/engine.ts` — Budget + grid calculation engine
   - `/lib/forecast/recurring.ts` — Occurrence generator (expensive day-by-day loop)
   - `/lib/supabase/middleware.ts` — Auth middleware (getUser on every request)

---

## Sprint Goal

Make the app feel instant — sub-200ms interactions on every tap. No 3-second delays anywhere. Add Apple Wallet-style UX: no pinch-to-zoom, sticky header, overscroll past the last card.

---

## Task 1 — Viewport + Apple Wallet UX Guardrails

**Lock down the viewport, make the header sticky, and add overscroll past last card.**

### What to Build

#### 1a. Viewport — no pinch-to-zoom

File: `/app/layout.tsx`

Replace the existing viewport export with:

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
}
```

Also add a `<meta name="viewport">` tag in the `<head>` as a belt-and-suspenders approach (some iOS versions ignore the Next.js viewport export):

```tsx
// In RootLayout, before <body>:
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
</head>
```

#### 1b. Sticky header — pinned to top like Apple Wallet

File: `/app/page.tsx`

The three lines currently scroll with the card stack. Change the structure so the header (status bar spacer + title bar + Cash Balance block) is fixed at the top:

```tsx
// BEFORE (current): everything in one scrollable column
<main className="min-h-screen bg-[#f2f2f7] flex flex-col overflow-hidden">
  <div className="h-[54px] shrink-0" />
  <div className="flex items-center justify-between px-6 mb-2 shrink-0">...</div>
  <div className="px-6 pb-3 shrink-0">...</div>
  <div className="flex-1 min-h-0"><AccountStack .../></div>
</main>

// AFTER: split into sticky header + scrollable body
<main className="min-h-screen bg-[#f2f2f7] flex flex-col overflow-hidden">
  {/* Sticky header */}
  <div className="shrink-0 sticky top-0 z-10 bg-[#f2f2f7]">
    <div className="h-[54px]" />
    <div className="flex items-center justify-between px-6 mb-2">...</div>
    <div className="px-6 pb-3">...</div>
  </div>
  {/* Scrollable card stack */}
  <div className="flex-1 min-h-0"><AccountStack .../></div>
</main>
```

Do the same for the card detail page in `/app/accounts/[id]/page.tsx` and `/components/accounts/AccountDetailClient.tsx` — the header with back/cal/+/⋯ buttons should be sticky.

#### 1c. Overscroll past last card

File: `/components/accounts/AccountStack.tsx`

Add extra bottom padding so the user can scroll the last card up past the viewport. Apple Wallet lets you scroll well past the last card so it sits mid-screen or higher:

```tsx
// In the scrollable container
<div
  className="h-full overflow-y-auto overflow-x-hidden px-6"
  style={{
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: '200px',  // Extra space past last card
  }}
>
```

The `paddingBottom: '200px'` gives roughly 2.5 card heights of scrollable empty space past the last card. Also change `overscrollBehavior: 'none'` to `'contain'` so the rubber-banding stays within the card stack area and doesn't bounce the sticky header.

#### 1d. Add `touch-action: manipulation` to all interactive elements

File: `/app/globals.css` (or add to existing CSS)

```css
/* Eliminate 300ms tap delay on iOS */
html {
  touch-action: manipulation;
}
```

### Acceptance Criteria

- [ ] Pinch-to-zoom does nothing on any page (iPhone + iPad)
- [ ] Header (title + Cash Balance + Budget/Variance) stays pinned when scrolling cards
- [ ] Card detail header (back + cal + + + ⋯) stays pinned when scrolling timeline
- [ ] User can scroll well past the last card (200px empty space at bottom)
- [ ] Sticky header does not bounce/jitter during overscroll rubber-banding
- [ ] Taps feel instant — no 300ms delay

---

## Task 2 — Client-Side Data Layer (React Query + Zustand)

**Build a client-side cache so data fetches once and survives across navigations.**

### What to Build

Install dependencies:

```bash
npm install @tanstack/react-query zustand
```

#### 2a. React Query provider

File: `/components/providers/QueryProvider.tsx`

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes — data is fresh
        gcTime: 30 * 60 * 1000,    // 30 minutes — keep in memory
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

Wrap the app in `/app/layout.tsx`:

```tsx
import QueryProvider from '@/components/providers/QueryProvider'

// In RootLayout:
<body className={figtree.className}>
  <QueryProvider>
    {children}
  </QueryProvider>
</body>
```

#### 2b. Data fetching hooks

File: `/lib/hooks/use-app-data.ts`

Create a single hook that fetches ALL app data (accounts, settings, transactions, schedules, skips, overrides) using React Query. This replaces the 5+ separate Supabase calls in every page:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, Settings } from '@/types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .eq('is_system', false)
        .order('display_order')
        .returns<Account[]>()
      return data ?? []
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('settings')
        .select('*')
        .single<Settings>()
      return data ?? null
    },
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .returns<Transaction[]>()
      return data ?? []
    },
  })
}

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('recurring_schedules')
        .select('*')
        .eq('is_active', true)
        .returns<RecurringSchedule[]>()
      return data ?? []
    },
  })
}

// ... similar for skips, overrides
```

File: `/lib/hooks/use-forecast.ts`

Hook that memoizes the forecast engine result:

```ts
'use client'

import { useMemo } from 'react'
import { toDecimal, fromDecimal } from '@/lib/utils/money'
import { calculateAllBudgets } from '@/lib/forecast/engine'
import { parseDate } from '@/lib/utils/dates'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, Settings } from '@/types'

interface UseForecastInput {
  accounts: Account[]
  settings: Settings | null
  transactions: Transaction[]
  schedules: RecurringSchedule[]
  skips: RecurringSkip[]
  overrides: RecurringOverride[]
}

export function useForecast({ accounts, settings, transactions, schedules, skips, overrides }: UseForecastInput) {
  const comparisonDate = useMemo(() => {
    if (settings?.budget_comparison_date) return parseDate(settings.budget_comparison_date)
    return new Date()
  }, [settings?.budget_comparison_date])

  const allBudgets = useMemo(() => {
    if (!accounts.length) return new Map<string, ReturnType<typeof toDecimal>>()
    return calculateAllBudgets(accounts, comparisonDate, transactions, schedules, skips, overrides)
  }, [accounts, comparisonDate, transactions, schedules, skips, overrides])

  // Compute totals
  const { cashBalanceTotal, budgetTotal, variance } = useMemo(() => {
    // ... same logic from page.tsx lines 57-125, using the memoized allBudgets
  }, [accounts, allBudgets, settings?.exchange_rate_gbp_nzd])

  return { allBudgets, cashBalanceTotal, budgetTotal, variance, comparisonDate }
}
```

#### 2c. Invalidate cache after mutations

Every place that writes data (add transaction, edit transaction, add recurring, etc.) must invalidate the React Query cache:

```ts
import { useQueryClient } from '@tanstack/react-query'

// After a successful mutation:
const queryClient = useQueryClient()
queryClient.invalidateQueries({ queryKey: ['accounts'] })
queryClient.invalidateQueries({ queryKey: ['transactions'] })
queryClient.invalidateQueries({ queryKey: ['schedules'] })
// etc.
```

Update these files to invalidate after successful write:
- `/app/add/AddTransactionClient.tsx`
- `/app/recurring/add/AddRecurringClient.tsx`
- `/app/recurring/[id]/edit/page.tsx` (edit/delete recurring)
- Any future mutation in Sprint 7/8

### Acceptance Criteria

- [ ] React Query provider wraps the entire app
- [ ] Data fetches once on first load, survives all in-app navigations (staleTime: 5min)
- [ ] Navigating home → card detail → back home = 0 new Supabase fetches (data cached)
- [ ] Adding a transaction invalidates cache and refetches only changed queries
- [ ] Forecast engine result is memoized — doesn't recompute unless inputs change
- [ ] No loading spinners on cached data (React Query serves stale data instantly)

---

## Task 3 — Convert Home Page to Client Component

**Rewrite the home page as a client component that uses React Query hooks instead of server fetches.**

### What to Build

File: `/app/page.tsx`

Replace the async server component with a `'use client'` component. Strip all Supabase server fetches. Use the hooks from Task 2:

```tsx
'use client'

import { useAccounts, useSettings, useTransactions, useSchedules, useSkips, useOverrides } from '@/lib/hooks/use-app-data'
import { useForecast } from '@/lib/hooks/use-forecast'
import AmountDisplay from '@/components/ui/AmountDisplay'
import AccountStack from '@/components/accounts/AccountStack'
import Link from 'next/link'
import { fromDecimal } from '@/lib/utils/money'

export default function HomePage() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: settings } = useSettings()
  const { data: transactions = [] } = useTransactions()
  const { data: schedules = [] } = useSchedules()
  const { data: skips = [] } = useSkips()
  const { data: overrides = [] } = useOverrides()

  const { allBudgets, cashBalanceTotal, budgetTotal, variance } = useForecast({
    accounts, settings, transactions, schedules, skips, overrides,
  })

  // Build actual/budget maps for card stack
  const actualBalances = new Map<string, number>()
  const budgetBalances = new Map<string, number>()
  const lastUpdatedDates = new Map<string, string>()

  for (const acc of accounts) {
    actualBalances.set(acc.id, acc.opening_balance)
    const budget = allBudgets.get(acc.id)
    budgetBalances.set(acc.id, budget ? fromDecimal(budget) : acc.opening_balance)
    lastUpdatedDates.set(acc.id, acc.opening_date)
  }

  // Loading state — show skeleton while first fetch
  if (accountsLoading && accounts.length === 0) {
    return (
      <main className="min-h-screen bg-[#f2f2f7]">
        <div className="h-[54px]" />
        <div className="px-6">
          <div className="h-8 w-48 bg-black/5 rounded animate-pulse mb-4" />
          <div className="h-10 w-36 bg-black/5 rounded animate-pulse" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f2f2f7] flex flex-col overflow-hidden">
      {/* Sticky header (Task 1) */}
      <div className="shrink-0 sticky top-0 z-10 bg-[#f2f2f7]">
        <div className="h-[54px]" />
        <div className="flex items-center justify-between px-6 mb-2">
          <h1 className="text-[28px] font-bold tracking-[-0.8px] text-[#1c1c1e] leading-tight">
            Oovy & Ray&apos;s Money
          </h1>
          <div className="flex gap-2">
            <Link href="/add" className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg font-medium hover:bg-black/10 transition-colors">+</Link>
            <button className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg hover:bg-black/10 transition-colors">⋯</button>
          </div>
        </div>
        <div className="px-6 pb-3">
          <p className="text-[11px] font-medium text-black/25 uppercase tracking-wide">Cash Balance</p>
          <AmountDisplay amount={fromDecimal(cashBalanceTotal)} currency="GBP" variant="plain" size="xl" />
          <div className="flex gap-6 mt-1">
            <div>
              <span className="text-[15px] text-black/45 mr-1">Budget</span>
              <AmountDisplay amount={fromDecimal(budgetTotal)} currency="GBP" variant="plain" size="md" />
            </div>
            <div>
              <span className="text-[15px] text-black/45 mr-1">Variance</span>
              <AmountDisplay amount={fromDecimal(variance)} currency="GBP" variant="variance" size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable card stack with overscroll */}
      <div className="flex-1 min-h-0">
        <AccountStack
          accounts={accounts}
          actualBalances={actualBalances}
          budgetBalances={budgetBalances}
          lastUpdatedDates={lastUpdatedDates}
        />
      </div>
    </main>
  )
}
```

**IMPORTANT:** Remove the server-side auth check (`createSupabaseServerClient`, `getUser`, `redirect`). Auth is already handled by middleware. The page is now a client component behind the auth wall.

### Acceptance Criteria

- [ ] Home page is `'use client'` — no server Supabase calls
- [ ] First load still shows skeleton while React Query fetches
- [ ] Navigation to/from home page is instant (cached data, no server roundtrip)
- [ ] Auth still works (middleware protects the route)
- [ ] Sticky header + overscroll work correctly (no scroll jank)

---

## Task 4 — Memoize All Components

**Wrap every component in React.memo and every calculation in useMemo/useCallback to prevent unnecessary re-renders.**

### What to Build

#### 4a. AccountCard

File: `/components/accounts/AccountCard.tsx`

```tsx
import { memo, useCallback } from 'react'

const AccountCard = memo(function AccountCard({ account, actualBalance, budgetBalance, lastUpdatedDate }: AccountCardProps) {
  const router = useRouter()

  const dActual = useMemo(() => toDecimal(actualBalance), [actualBalance])
  const dBudget = useMemo(() => toDecimal(budgetBalance), [budgetBalance])

  const formattedDate = useMemo(() => {
    if (!lastUpdatedDate) return ''
    return new Date(lastUpdatedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }, [lastUpdatedDate])

  const handlePress = useCallback(() => {
    router.push(`/accounts/${account.id}`)
  }, [router, account.id])

  return (
    <button onClick={handlePress} ...>
      {/* ... same JSX ... */}
    </button>
  )
})

export default AccountCard
```

#### 4b. AccountStack

File: `/components/accounts/AccountStack.tsx`

```tsx
import { memo } from 'react'

const AccountStack = memo(function AccountStack({ accounts, actualBalances, budgetBalances, lastUpdatedDates }: AccountStackProps) {
  // ... same logic, wrapping in memo
})

export default AccountStack
```

**CRITICAL:** `Map` objects passed as props will cause memo to fail (new reference every render). Convert to plain objects or arrays:

```tsx
// Change props from Map to Record/array:
interface AccountStackProps {
  accounts: Account[]
  actualBalances: Record<string, number>
  budgetBalances: Record<string, number>
  lastUpdatedDates: Record<string, string>
}

// Build records in page.tsx instead of Maps:
const actualBalances: Record<string, number> = {}
for (const acc of accounts) {
  actualBalances[acc.id] = acc.opening_balance
}
```

Use `useMemo` in page.tsx to stabilize these records:

```tsx
const actualBalances = useMemo(() => {
  const map: Record<string, number> = {}
  for (const acc of accounts) map[acc.id] = acc.opening_balance
  return map
}, [accounts])
```

Memo will now work because `Record<string, number>` is referentially stable when `accounts` hasn't changed.

#### 4c. AmountDisplay

File: `/components/ui/AmountDisplay.tsx`

Already fairly simple, but wrap in `memo`:

```tsx
const AmountDisplay = memo(function AmountDisplay({ amount, currency, variant = 'plain', size = 'md' }: AmountDisplayProps) {
  // ... existing code
})

export default AmountDisplay
```

#### 4d. TransactionTimeline

File: `/components/transactions/TransactionTimeline.tsx`

Wrap in `memo`, useMemo for computed lists.

#### 4e. All other components

Audit and wrap in `memo`:
- `/components/transactions/TransactionRow.tsx`
- `/components/transactions/RecurringListItem.tsx`
- `/components/transactions/RecurringList.tsx`
- `/components/transactions/RecurringForm.tsx`
- `/components/accounts/AccountPicker.tsx`
- `/components/review/*` (all review components)

### Acceptance Criteria

- [ ] AccountCard wrapped in `memo` + uses `useMemo` for decimal conversions
- [ ] AccountStack wrapped in `memo` with stabilized Record props (not Map)
- [ ] AmountDisplay wrapped in `memo`
- [ ] TransactionTimeline wrapped in `memo`
- [ ] All calculations in page.tsx wrapped in `useMemo`
- [ ] React DevTools Profiler shows 0 unnecessary re-renders on card stack

---

## Task 5 — Middleware Optimization

**Reduce auth overhead from ~200-400ms to near-zero for cached sessions.**

### What to Build

File: `/lib/supabase/middleware.ts`

Current problem: `supabase.auth.getUser()` hits the Supabase API on every request. With a valid session cookie, this is unnecessary.

```ts
// BEFORE (current):
const { data: { user } } = await supabase.auth.getUser()

// AFTER — use getUser with try/catch to avoid the API call when possible:
import { createServerClient } from '@supabase/ssr'

// getUser() with cookie parsing instead of API call
const { data: { user } } = await supabase.auth.getUser()

// If session cookie is fresh (less than 1 hour old), skip the API call
// by checking cookies directly first:
const sessionToken = request.cookies.get('sb-access-token')?.value
if (!sessionToken) {
  // No session cookie at all — redirect immediately, no API call
  if (!isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}
// Session cookie exists — trust it for routing, let page-level auth validate
```

Actually, the best optimization is to NOT call `getUser()` in middleware at all. Instead, parse the session cookie to check if a session exists:

```ts
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicPath = pathname === '/login' || pathname.startsWith('/auth/')

  // Quick check: does a session cookie exist?
  const hasSession = request.cookies.has('sb-access-token') || request.cookies.has('sb-refresh-token')

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Still create the Supabase client for cookie refresh, but don't await getUser
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session cookie if needed (this is a lightweight cookie operation)
  await supabase.auth.getSession()

  return supabaseResponse
}
```

This eliminates the ~200-400ms `getUser()` API call on every request. The page itself validates auth via the React Query hooks (which use the browser client).

**IMPORTANT:** The home page (now a client component) no longer has server-side auth. This is OK because:
1. Middleware already blocks unauthenticated users
2. React Query hooks use the browser client, which reads the session from cookies
3. Supabase Row-Level Security (RLS) protects data at the database level

### Acceptance Criteria

- [ ] Middleware does NOT call `supabase.auth.getUser()` on every request
- [ ] Middleware uses cookie existence check (near-zero cost) for route protection
- [ ] `supabase.auth.getSession()` still refreshes the cookie (lightweight)
- [ ] Unauthenticated users still redirected to /login
- [ ] Authenticated users on /login still redirected to /
- [ ] RLS still protects data at DB level

---

## Task 6 — Prefetching + Link Optimization

**Prefetch data on hover/link so navigations feel teleport-fast.**

### What to Build

#### 6a. Next.js Link prefetch

Next.js `<Link>` already prefetches by default in production. Verify:
- All internal navigation uses `<Link>` (not `router.push()`)
- Prefetch is enabled (it's the default)

Where possible, replace `router.push()` with `<Link>`. The AccountCard currently uses `router.push()` — this can't easily become a `<Link>` because it's a `<button>`, but we can use `router.prefetch()`:

File: `/components/accounts/AccountCard.tsx`

```tsx
const handlePress = useCallback(() => {
  router.push(`/accounts/${account.id}`)
}, [router, account.id])

// Prefetch on hover/mount
useEffect(() => {
  router.prefetch(`/accounts/${account.id}`)
}, [router, account.id])
```

#### 6b. Prefetch card detail data

Add a `router.prefetch()` call for each card on the home page so detail pages load instantly:

File: `/app/page.tsx` (client version)

```tsx
// In AccountStack or a wrapper
useEffect(() => {
  for (const account of accounts) {
    router.prefetch(`/accounts/${account.id}`)
  }
}, [accounts, router])
```

### Acceptance Criteria

- [ ] All internal links use `<Link>` with default prefetch
- [ ] AccountCard prefetches detail page route on mount
- [ ] Navigations between pages feel instant (data already cached + route prefetched)
- [ ] No waterfall loading on card detail — data from React Query cache

---

## Task 7 — Transaction Mutations with Optimistic Updates

**Make add/edit/delete feel instant with optimistic UI updates.**

### What to Build

Update the mutation pages to use React Query's `useMutation` with optimistic updates:

File: `/app/add/AddTransactionClient.tsx`

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const addTransaction = useMutation({
  mutationFn: async (tx: NewTransaction) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from('transactions').insert(tx)
    if (error) throw error
  },
  onMutate: async (newTx) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['transactions'] })
    // Snapshot previous value
    const previous = queryClient.getQueryData(['transactions'])
    // Optimistically update
    queryClient.setQueryData(['transactions'], (old: Transaction[] = []) => [...old, { ...newTx, id: 'temp' }])
    return { previous }
  },
  onError: (_err, _newTx, context) => {
    // Roll back
    queryClient.setQueryData(['transactions'], context?.previous)
  },
  onSettled: () => {
    // Refetch to get server truth
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  },
})
```

Apply the same pattern to:
- Edit transaction (if implemented)
- Delete transaction (if implemented)
- Add/edit/delete recurring in Sprint 6 pages

### Acceptance Criteria

- [ ] Adding a transaction dismisses instantly (optimistic)
- [ ] Card stack updates immediately (no loading spinner)
- [ ] On error, UI rolls back to previous state
- [ ] Background refetch reconciles with server truth

---

## Task 8 — Performance Measurement + Verification

**Prove the app is fast with Lighthouse and manual timing.**

### What to Build

#### 8a. Add performance marks

File: `/app/page.tsx`

Add console.time marks to verify:

```tsx
useEffect(() => {
  if (accounts.length > 0) {
    console.timeEnd('home-page-ready')
  }
}, [accounts])

// On first render, start the timer
if (accountsLoading && accounts.length === 0) {
  console.time('home-page-ready')
}
```

#### 8b. Lighthouse audit

Run `npm run build && npm run start` and audit with Chrome DevTools Lighthouse:
- Target: Performance score > 90
- Target: First Contentful Paint < 1.0s
- Target: Time to Interactive < 1.5s
- Target: Total Blocking Time < 100ms

#### 8c. Manual timing

After deployment, tap through the app on iPhone. Every tap (home → card, card → home, home → add, add → home) must feel instant — no perceived delay.

### Acceptance Criteria

- [ ] Lighthouse Performance score > 90
- [ ] FCP < 1.0s
- [ ] TTI < 1.5s
- [ ] TBT < 100ms
- [ ] Every navigation feels instant on iPhone (sub-200ms perceived)
- [ ] `console.timeEnd('home-page-ready')` shows < 500ms on first load, < 50ms on cached navigations
- [ ] `npm run build` succeeds with 0 errors

---

## Sprint 10 Definition of Done

All 8 tasks complete. Verifiable by:

- [ ] `npm run build` succeeds
- [ ] `npm run dev` — app loads, header is sticky, can't pinch-zoom, can scroll past last card
- [ ] Navigate home → card detail → home → add → home — each transition is instant
- [ ] React DevTools Profiler shows minimal re-renders
- [ ] Lighthouse Performance > 90
- [ ] No 3-second delays anywhere in the app
- [ ] Auth still works (login → home, logout → login)

---

## Notes for Claude

### Pitfalls

1. **Do NOT remove the `'use server'` auth in middleware entirely** — the app must still be protected. The optimization is to check cookies instead of calling the Supabase API.

2. **Map → Record conversion is critical for memo** — if you forget to change `Map<string, number>` to `Record<string, number>`, `React.memo` will never work because Maps create new references.

3. **Don't confuse `staleTime` with `gcTime`** — `staleTime: 5min` means React Query serves cached data without refetching for 5 minutes. `gcTime: 30min` means it keeps data in memory for 30 minutes after last use.

4. **The forecast engine is expensive but memoized** — with `useMemo`, it only recalculates when accounts/transactions/schedules change. On cached navigations (no data change), the engine runs zero times.

5. **Do NOT convert ALL server components to client** — only the home page and pages that do heavy data fetching. Settings page, recurring list page, and other simple pages can stay server-rendered.

6. **React Query queries share cache across pages** — `useAccounts()` on the home page and `useAccounts()` on the detail page share the same cache. Don't create duplicate query keys.

7. **`overscrollBehavior: 'contain'` not `'none'`** — `'none'` disables all overscroll including the rubber-band effect. `'contain'` keeps rubber-banding within the scrollable area without bouncing parent elements (header).

### Order of tasks

Execute tasks in order: 1 (viewport/sticky/overscroll) → 2 (React Query layer) → 3 (convert home page) → 4 (memoize everything) → 5 (middleware) → 6 (prefetch) → 7 (optimistic mutations) → 8 (verify).

Tasks 2 and 3 are the heavy lift. Tasks 4 and 5 are refinements. Tasks 6 and 7 are polish. Task 8 is verification.
