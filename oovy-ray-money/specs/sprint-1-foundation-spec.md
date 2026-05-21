# Sprint 1 — Foundation
> Phase 1 MVP | Est. Week 1–2 | 6 Tasks
> For: Claude Sonnet (Developer)
> From: DeepSeek (Tracker/Planner)

---

## Required Reading

Before starting any task, read these files in order:

1. **CLAUDE.md** (root) — Your developer bible. Model boundaries, reasoning protocol, all rules.
2. **TRACKER.md** (root) — Current sprint progress, task list.
3. **INTERACTION_LOG.md** (root) — Project context and decisions made so far.
4. **Spec docs** in `/specs/` (authority order):
   - `oovy-ray-forecast-engine-spec.md`
   - `oovy-ray-data-model-spec.md` ← **most referenced this sprint**
   - `oovy-ray-ux-flow-spec-v2.md`
   - `oovy-ray-technical-stack-spec.md`
   - `oovy-ray-migration-and-phases-spec.md`

---

## Sprint Goal

Lay the foundation: Supabase database, Next.js project, TypeScript types, seed script, and auth. After this sprint, the app has a working database with all accounts seeded and a login page.

> **Note: Task 1 is already complete.** DeepSeek ran the schema migration directly against the Supabase database. All 9 tables, 4 enums, 4 indexes, RLS policies, the `calculate_budget` function, and Realtime are live. Schema SQL saved at `/supabase/schema.sql` for reference.

---

## Task 1 — Supabase Project Setup ✅ (DONE BY DEEPSEEK)

Schema is live on `hmrsjyormmxqasuhaoae` project. Files referenced:
- `/supabase/schema.sql` — full DDL
- `/specs/oovy-ray-data-model-spec.md §8.1` — source of truth
- `.env.local` — contains credentials (URL, anon key, service role key)

**Create the full database schema in Supabase.**

### What to Build

1. Create a new Supabase project (user will provide URL + keys)
2. Run the complete SQL schema from `oovy-ray-data-model-spec.md §8.1` — all 9 tables, all enums, all indexes, all constraints
3. Enable Row Level Security on all tables (from §9.2)
4. Create the RLS policy `allow_all_authenticated` for all tables
5. Create the `calculate_budget` PostgreSQL function (from §9.4)
6. Enable Realtime on `transactions`, `reviews`, and `settings` tables

### Acceptance Criteria

- [ ] All 4 enums created: `account_type`, `currency`, `transaction_type`, `frequency`
- [ ] All 9 tables created: `accounts`, `recurring_schedules`, `recurring_skips`, `recurring_overrides`, `transactions`, `reviews`, `review_entries`, `settings`
- [ ] All constraints present (positive_amounts, different_accounts, UNIQUE keys, CHECK constraints)
- [ ] All indexes present (idx_tx_from_date, idx_tx_to_date, idx_tx_date, idx_tx_recurring)
- [ ] RLS enabled on all 8 tables
- [ ] `allow_all_authenticated` policy exists on each table
- [ ] `calculate_budget` function created in public schema
- [ ] Realtime enabled on transactions, reviews, settings

**Output:** Output: `TASK DONE: Supabase project setup (schema, RLS, auth)` when complete. Save the SQL migration file as `supabase/schema.sql`.

---

## Task 2 — Next.js Project Scaffold

**Initialize the Next.js project with all dependencies.**

### What to Build

1. `npx create-next-app@14 .` in the project root with TypeScript, App Router, TailwindCSS
2. Install all dependencies:
   - `@supabase/supabase-js` `@supabase/ssr`
   - `zustand`
   - `date-fns@3`
   - `decimal.js`
   - `recharts`
   - `@tanstack/react-virtual`
3. Create the folder structure from `oovy-ray-technical-stack-spec.md §2.1`:
   ```
   /app
     /layout.tsx
     /page.tsx
     /accounts/[id]/page.tsx
     /review/page.tsx
     /settings/page.tsx
     /api/
   /components
     /accounts/
     /transactions/
     /review/
     /grid/
     /ui/
   /lib
     /forecast/
     /db/
     /utils/
   /types
   /hooks
   /scripts
   /supabase/
   ```
4. Create `.env.local` from the `.env.example` template (leave placeholder values)
5. Configure `tsconfig.json` with path aliases:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```
6. Set TailwindCSS config for mobile-first breakpoints (from technical-stack-spec §2.2)

### Acceptance Criteria

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes without errors
- [ ] All folder directories exist (empty file stubs fine)
- [ ] Path aliases configured and working
- [ ] TypeScript strict mode enabled in tsconfig.json
- [ ] TailwindCSS producing output

**Output:** `TASK DONE: Next.js project scaffold (TypeScript, Tailwind, folder structure)`

---

## Task 3 — Core TypeScript Types Defined

**Create all TypeScript types matching the database schema.**

### What to Build

File: `/types/index.ts`

Create TypeScript types/interfaces for every database table. Match the exact column names and types from `oovy-ray-data-model-spec.md §8.1`.

```typescript
// Example structure:
export type AccountType = 'CURRENT' | 'SAVINGS' | 'CREDIT' | 'DEBT' | 'TRACKING' | 'EXTERNAL'
export type Currency = 'GBP' | 'NZD'
export type TransactionType = 'TRANSFER' | 'RECURRING_INSTANCE' | 'ONE_OFF' | 'ADJUSTMENT' | 'OPENING'
export type Frequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL'

export interface Account { /* all columns from accounts table */ }
export interface Transaction { /* all columns from transactions table */ }
export interface RecurringSchedule { /* all columns from recurring_schedules table */ }
export interface RecurringSkip { /* all columns from recurring_skips table */ }
export interface RecurringOverride { /* all columns from recurring_overrides table */ }
export interface Review { /* all columns from reviews table */ }
export interface ReviewEntry { /* all columns from review_entries table */ }
export interface Settings { /* all columns from settings table */ }
```

Also add:
- `NewAccount = Omit<Account, 'id' | 'created_at' | 'updated_at'>` (and similar for other tables)
- Forecast engine interfaces from technical-stack-spec §4.2: `DailyBalance`, `GridData`, `ForecastEngine`

### Acceptance Criteria

- [ ] Every table has a corresponding TypeScript interface
- [ ] All enum types defined as string unions
- [ ] All DECIMAL columns typed as `number` (DB → TS), with note that they must be wrapped in `new Decimal()` at calculation time
- [ ] Forecast engine interfaces exist
- [ ] `New*` types exist for insert operations

**Output:** `TASK DONE: Core TypeScript types defined`

---

## Task 4 — Supabase Client Configured

**Create server and client Supabase clients.**

### What to Build

Two files:

**`/lib/supabase/server.ts`** — Server-side client (Next.js Server Components, API routes, Server Actions)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**`/lib/supabase/client.ts`** — Client-side client (React components, hooks)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`/lib/supabase/middleware.ts`** — Auth middleware for session refresh

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Standard Supabase SSR middleware pattern
  // Refreshes session cookie on every request
}
```

### Acceptance Criteria

- [ ] Server client exports `createServerClient()` function
- [ ] Browser client exports `createBrowserClient()` function
- [ ] Middleware exists in `/lib/supabase/middleware.ts`
- [ ] Middleware applied in `/middleware.ts` (root)
- [ ] All use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars

**Output:** `TASK DONE: Supabase client configured (server + client)`

---

## Task 5 — Seed Script: Accounts + Settings

**Create the seed script that populates accounts and settings.**

### What to Build

File: `/scripts/seed-accounts.ts`

This script creates:
1. **EXTERNAL account** (fixed UUID `00000000-0000-0000-0000-000000000001`, `is_system: true`)
2. **15 user accounts** with data from `oovy-ray-migration-and-phases-spec.md §A.2.2` table. Accounts seeded with zero opening balance.
3. **Settings row** with default exchange rate 2.22, auto-fetch off, target date NULL

Script must be:
- Idempotent (checks for existing records before inserting — `ON CONFLICT DO NOTHING`)
- Runnable via `npm run seed:accounts` (add script to package.json)
- Use the Supabase admin client with `SUPABASE_SERVICE_ROLE_KEY`

Also add to `/scripts/package.json` entry:
```json
"scripts": {
  "seed:accounts": "tsx scripts/seed-accounts.ts"
}
```

### Acceptance Criteria

- [ ] External system account created with fixed UUID
- [ ] 15 accounts created with correct names, types, currencies, colours, display_order
- [ ] Settings row created with default values
- [ ] Running twice doesn't create duplicates (idempotent)
- [ ] `npm run seed:accounts` works end-to-end

**Output:** `TASK DONE: Seed script — accounts + settings`

---

## Task 6 — Auth Flow: Login Page

**Create the single-user auth login page.**

### What to Build

**`/app/login/page.tsx`** — Login page:
- Email/password form
- Supabase Auth sign-in
- Error state display
- Submit button with loading state

**`/app/auth/callback/route.ts`** — Auth callback route:
- Handles the Supabase OAuth redirect (standard SSR pattern)

**`/app/layout.tsx`** — Root layout:
- Check session on every page
- Redirect to `/login` if unauthenticated
- Redirect to `/` if authenticated on login page

**`/middleware.ts`** — Update to:
- Protect all routes except `/login` and `/auth/callback`
- Refresh session cookie on every request

### UX Requirements

- Clean form, single field pair (email + password)
- "Oovy & Ray's Money" as app title
- Error message shown inline on failed login
- User is a single known user — no registration flow needed (admin creates user in Supabase Dashboard)

### Acceptance Criteria

- [ ] `/login` page renders with email/password form
- [ ] Form submits to Supabase Auth sign-in
- [ ] Successful login redirects to home (`/`)
- [ ] Unauthenticated access to any protected route redirects to `/login`
- [ ] Session persists across page refreshes
- [ ] Logout possible (add sign-out button to home page placeholder)
- [ ] Auth callback route handles redirect properly

**Output:** `TASK DONE: Auth flow — login page (single user)`

---

## Sprint 1 Definition of Done

All 6 tasks complete. Verifiable by:
- [ ] `npm run build` exits with 0
- [ ] `npm run seed:accounts` exits with 0 (idempotent)
- [ ] Login page loads at `/login`
- [ ] Authenticated user sees home page at `/`
- [ ] Supabase database has all tables + EXTERNAL account + 15 user accounts + settings row

---

## Notes for Claude

- When done, you output `TASK DONE: [exact task name]` — DeepSeek reads this and updates TRACKER.md
- If spec is unclear, output `SPEC GAP: [description]` and stop
- If you see an issue, output `ISSUE: [description]` with reasoning
- Output signals after each completed task, not after the whole sprint
