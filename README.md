# Oovy & Ray's Money

A multi-currency household budgeting app (GBP and NZD) built around a forecast engine: it projects future balances from recurring transactions and compares each week's plan against what actually happened.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Supabase (Postgres, Auth, RLS) · TanStack Query · Zustand · decimal.js · Tailwind · Vitest

## What it does

- Multi-currency accounts with a stored exchange rate (GBP £ and NZD NZ$)
- Forecast engine that projects balances from recurring rules, with weekday-only handling and month-end edge cases
- Recurring transactions with per-occurrence overrides and skips
- Weekly review comparing forecast against actual
- iPhone home view and an iPad grid layout
- Household-level accounts, with a single shared login

## Design decisions

- **Exact money maths.** All amounts use `decimal.js`. No floating point arithmetic anywhere in the forecast path.
- **Pure forecast engine.** `lib/forecast` has no I/O, so the date and recurrence logic is unit tested in isolation.
- **Row level security** on every table in Supabase.
- **Spec-driven delivery.** Each sprint was written up as a spec before implementation. See `oovy-ray-money/specs/` and `oovy-ray-money/TRACKER.md`.

## Repository layout

```
oovy-ray-money/   the application
  app/            routes (Next.js App Router)
  components/     UI components
  lib/forecast/   forecast engine and its tests
  lib/db/         data access
  supabase/       schema and migrations
  specs/          sprint specs
  scripts/        schema and seed scripts
docs/design/      UX mock-ups
```

## Getting started

Requires Node 18.17+ and a Supabase project.

```bash
cd oovy-ray-money
cp .env.example .env.local     # fill in your Supabase values
npm install
npm run dev
```

Schema is in `oovy-ray-money/supabase/schema.sql`, with incremental changes in `supabase/migrations/`. `npm run seed:accounts` seeds the default accounts and settings.

`scripts/create-schema.js` and `scripts/run-schema.js` connect straight to Postgres and read `DATABASE_URL` from the environment. Never commit credentials.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the unit tests (Vitest) |
| `npm run lint` | ESLint |

## Status

MVP feature-complete across 12 sprints. Active development has paused.
