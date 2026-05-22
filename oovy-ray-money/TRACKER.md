# Oovy & Ray — Live Project Tracker
> Owned by DeepSeek Tracker Agent. Claude reads this. DeepSeek writes this.

Last Updated: 2026-05-22
Active Sprint: None — MVP Complete 🎉
Sprint Progress: 8/8 tasks
Spec Status: Implemented

---

## Sprint 1 — Foundation (Week 1–2)
- [x] Supabase project setup (schema, RLS, auth) — completed 2026-05-20
- [x] Next.js project scaffold (TypeScript, Tailwind, folder structure) — completed 2026-05-20
- [x] Seed script — accounts + settings — completed 2026-05-20
- [x] Core TypeScript types defined — completed 2026-05-20
- [x] Supabase client configured (server + client) — completed 2026-05-20
- [x] Auth flow — login page (single user) — completed 2026-05-20

## Sprint 2 — Forecast Engine (Week 2–3)
- [x] decimal.js integration and money utilities
- [x] date-fns date utilities
- [x] Recurring occurrence generator
- [x] Weekday-only rule implementation
- [x] Effective amount resolver (version history)
- [x] Core Budget calculation function
- [x] Full grid calculation function
- [x] Unit tests for all calculation functions
- [x] Edge case handling (month-end, leap year, weekend rules)

## Sprint 3 — iPhone Home + Cards (Week 3–4)
- [x] Account card component (gradient, three values)
- [x] Apple Wallet card stack (overlap scroll)
- [x] Home screen header (Cash Balance, Budget, Variance)
- [x] Card detail view
- [x] Transaction timeline (vertical scroll, today marker)
- [x] Jump to date functionality
- [x] [+] and [⋯] buttons and routing

## Sprint 4 — Add Transaction (Week 4–5)
- [x] Add Transaction panel (same-currency)
- [x] Cross-currency detection and dual amount fields
- [x] Account picker (grouped GBP/NZD)
- [x] Date picker (with backdating rules)
- [x] Context-aware pre-fill (from card vs. from home)
- [x] Context-aware dismissal
- [x] Forecast recalculation on submit

## Sprint 5 — Weekly Review (Week 5–6)
- [x] Review date confirmation screen
- [x] Review flashcard component
- [x] Live variance calculation
- [x] Skip / Next logic
- [x] Review completion and storage
- [x] Review summary screen
- [x] Summary Target Date projection

## Sprint 6 — Recurring Transactions (Week 6–7)
- [x] Recurring transactions list (side menu)
- [x] Add recurring form (with all frequency options)
- [x] Edit recurring (three scopes: this / future / all)
- [x] Delete recurring (three scopes)
- [x] Effective date prompt for future edits
- [x] Weekday-only toggle
- [x] Recurring transactions shown in timeline

## Sprint 7 — iPad Cockpit Grid (Week 7–9)
- [x] Grid layout (frozen headers, frozen date column, frozen bottom bar)
- [x] Virtual row rendering (@tanstack/react-virtual)
- [x] No-bounce scroll on both axes
- [x] Today row highlight
- [x] Cell tap routing (empty / has transaction / past)
- [x] Currency filter (GBP / NZD / All)
- [x] Jump to date in grid
- [x] Add Transaction panel (grid entry — context pre-filled)
- [x] Transaction Detail Panel (edit/delete)
- [x] Add Account panel
- [x] Grid recalculation on any change

## Sprint 8 — Settings + Polish (Week 9–10)
- [x] Settings screen (all sections)
- [x] Account order drag-to-reorder
- [x] Per-account colour picker
- [x] Exchange rate (manual + auto-fetch from frankfurter.app)
- [x] Summary Target Date picker
- [x] Budget Comparison Date setting
- [x] Planned One-offs (list + add + delete)
- [x] Side menu (iPhone + iPad)
- [x] First launch setup flow

## Sprint 9 — QA + Launch (Skipped — manual checklist)
- [~] End-to-end flow testing
- [~] Budget calculation accuracy vs Excel spreadsheet
- [~] Cross-currency transfer testing
- [~] Decimal arithmetic edge case testing
- [~] Mobile Safari testing (iPhone + iPad)
- [~] Performance testing (grid render < 500ms)
- [~] PWA manifest.json + icons
- [~] Vercel deployment
- [~] Production seed script run

## Sprint 10 — Performance + Apple Wallet UX (Week 12–13)
- [x] Viewport + Apple Wallet UX guardrails (no pinch-zoom, sticky header, overscroll)
- [x] Client-side data layer (React Query + Zustand hooks)
- [x] Convert home page to client component with cached data
- [x] Memoize all components (React.memo, useMemo, useCallback)
- [x] Middleware optimization (cookie check instead of getUser)
- [x] Prefetching + Link optimization
- [x] Optimistic mutations (instant add/edit/delete)
- [x] Performance measurement + verification (Lighthouse > 90)

---

## Blockers
_None yet_

## Spec Gaps Log
| Date | Description | Resolution | Status |
|------|-------------|------------|--------|
| 2026-05-21 | Sprint 6 review: 10 flaws found (weekday_only contradiction, missing TimelineEntry type, dangling FK) | 9 fixed in spec v2. Migration 001 run for FK ON DELETE SET NULL. | Resolved |

## Completed Sprints
- **Sprint 1 — Foundation** — completed 2026-05-20 (6/6 tasks)
  - Supabase schema, Next.js scaffold, TypeScript types, Supabase clients, seed script (16 accounts + settings), auth login page
- **Sprint 2 — Forecast Engine** — completed 2026-05-21 (9/9 tasks)
  - decimal.js money utils, date-fns date utils, recurring occurrence generator, weekday-only + bank holiday rules, effective amount resolver, core Budget + grid calculations, unit tests, edge cases
- **Sprint 3 — iPhone Home + Cards** — completed 2026-05-21 (7/7 tasks)
  - Home screen header (Cash Balance, Budget, Variance), AmountDisplay component, AccountCard gradient component, Apple Wallet card stack (overlap scroll), Card detail view with expanded gradient card, Transaction timeline (past + future with today marker), Jump to date functionality, Figtree font + iOS light mode
- **Sprint 4 — Add Transaction** — completed 2026-05-21 (6/6 tasks)
  - Add Transaction panel, cross-currency, account picker, date picker, context pre-fill, forecast recalculation
- **Sprint 8 — Settings + Polish** — completed 2026-05-22 (9/9 tasks)
  - Settings page, account drag-to-reorder, colour picker, exchange rate (manual + frankfurter.app auto-fetch), summary target date, budget comparison date, planned one-offs, side menu, first-launch setup flow
- **Sprint 7 — iPad Cockpit Grid** — completed 2026-05-27 (11/11 tasks)
  - Responsive layout switch (iPhone < 744px ≤ iPad grid), frozen grid structure (header/date column/bottom bar), virtual rendering (@tanstack/react-virtual ~25 DOM rows), no-bounce dual-axis scroll, today row highlight, cell tap routing (past read-only, future add/edit), currency filter (GBP/NZD/All), jump-to-date, slide-in panels (Add Transaction with recurring toggle, Transaction Detail with edit scopes, Add Account), grid recalculation on any change

- **Sprint 10 — Performance + Apple Wallet UX** — completed 2026-05-22 (8/8 tasks)
  - Viewport guardrails, React Query + Zustand data layer, client-side home page, React.memo/useMemo/useCallback, middleware optimization, prefetching, optimistic mutations, Lighthouse > 90

- **Sprint 6 — Recurring Transactions** — completed 2026-05-21 (7/7 tasks)
  - List page with next occurrence display, add form (all 5 frequencies), edit/delete (3 scopes each), weekday-only toggle, timeline integration
- **Sprint 5 — Weekly Review** — completed 2026-05-21 (7/7 tasks)
  - Review date confirmation, flashcard component with live variance, flow controller, review persistence to Supabase, review summary with savings projections, summary target date projection
