# Oovy & Ray’s Money — Migration & Development Phases Spec

**Version:** 1.0
**Phase:** 1 — MVP
**Last Updated:** May 2026
**Status:** Approved for Development

-----

## Part A — Migration Spec

### A.1 Migration Scope

**In scope — automated seed script:**

- EXTERNAL system account (one record)
- 15 user accounts (zero balances)
- Settings row (default exchange rate)

**Out of scope — manual user entry post-launch:**

- Account opening balances (user enters via weekly review on first use)
- All recurring transaction schedules (user sets up manually in app)
- All historical transactions (user enters manually as needed)
- Planned one-offs (user creates as needed)

> **Rationale:** The UK Budget CSV contains the full source of truth for balances and recurring transactions. Rather than risk a complex migration introducing errors, the user will manually enter current balances on first use and set up recurring schedules from their knowledge of the CSV. The CSV remains available as a reference document throughout.

-----

### A.2 Seed Script Specification

**File:** `/scripts/seed-accounts.ts`
**Run:** Once at initial deployment — `npm run seed:accounts`
**Idempotent:** Yes — checks for existing records before inserting

#### A.2.1 Step 1 — Create EXTERNAL Account

```sql
INSERT INTO accounts (
  id, name, type, currency,
  include_in_cash_balance, include_in_review,
  opening_balance, opening_date,
  display_order, is_system, is_archived
) VALUES (
  '00000000-0000-0000-0000-000000000001',  -- fixed UUID
  'External',
  'EXTERNAL',
  'GBP',
  false, false,
  0.00, CURRENT_DATE,
  999, true, false
)
ON CONFLICT (id) DO NOTHING;
```

#### A.2.2 Step 2 — Create 15 User Accounts

|# |Name                 |Type    |Currency|CB|Review|Default Color From|Default Color To|Order|
|--|---------------------|--------|--------|--|------|------------------|----------------|-----|
|1 |Monzo General        |CURRENT |GBP     |✓ |✓     |#1a1a2e           |#0f3460         |1    |
|2 |Monzo Spending       |CURRENT |GBP     |✓ |✓     |#2d1b69           |#11998e         |2    |
|3 |Monzo Bills          |CURRENT |GBP     |✓ |✓     |#1a1a1a           |#2d2d2d         |3    |
|4 |Monzo Rent + Expenses|CURRENT |GBP     |✓ |✓     |#4a1942           |#c74b50         |4    |
|5 |Monzo Savings        |SAVINGS |GBP     |✓ |✓     |#0d4f2f           |#1a8a4a         |5    |
|6 |Rent Deposit         |SAVINGS |GBP     |✓ |✓     |#1b4332           |#40916c         |6    |
|7 |Monzo NZ House       |CURRENT |GBP     |✓ |✓     |#1a237e           |#283593         |7    |
|8 |Monzo Student Loan   |TRACKING|GBP     |✓ |✗     |#3e2723           |#6d4c41         |8    |
|9 |Ray Revolut          |CURRENT |GBP     |✓ |✓     |#1a237e           |#4527a0         |9    |
|10|Olivia Revolut       |CURRENT |NZD     |✓ |✓     |#004d40           |#00695c         |10   |
|11|NZ Savings           |SAVINGS |NZD     |✓ |✓     |#1b5e20           |#2e7d32         |11   |
|12|NZ Credit Card       |CREDIT  |NZD     |✓ |✓     |#b71c1c           |#c62828         |12   |
|13|NZ House             |CURRENT |NZD     |✓ |✓     |#37474f           |#546e7a         |13   |
|14|Olivia Owed          |DEBT    |GBP     |✓ |✓     |#e65100           |#bf360c         |14   |
|15|Ray Owed             |DEBT    |GBP     |✓ |✓     |#880e4f           |#ad1457         |15   |

All accounts seeded with:

- `opening_balance = 0.00`
- `opening_date = CURRENT_DATE` (date of first launch)
- `is_archived = false`
- `is_system = false`

#### A.2.3 Step 3 — Create Settings Row

```sql
INSERT INTO settings (
  exchange_rate_gbp_nzd,
  exchange_rate_auto_fetch,
  summary_target_date,
  budget_comparison_date
) VALUES (
  2.220000,   -- default rate — user to verify on first launch
  false,      -- manual by default
  NULL,       -- user must set
  NULL        -- defaults to today
)
ON CONFLICT DO NOTHING;
```

-----

### A.3 First Launch User Checklist

On first app open, prompt the user to complete setup:

**Step 1 — Verify Exchange Rate**

```
Welcome to Oovy & Ray's Money

Exchange Rate
1 GBP = 2.22 NZD

This is the default rate. Please update
it to the current rate.

[ Update Rate ]    [ Use Default ]
```

**Step 2 — Set Summary Target Date**

```
Summary Target Date

This is the date used to project your
savings balance after each weekly review.

[ Pick a Date ]
```

**Step 3 — Enter Account Balances**

```
Your accounts are ready.

To get started, complete your first
Weekly Review to enter current balances
for each account.

[ Start Weekly Review ]    [ Do Later ]
```

-----

### A.4 Post-Setup Manual Tasks (User)

After first launch, the user completes the following manually using the UK Budget CSV as reference:

|Task                                  |Where in App                      |Reference in CSV            |
|--------------------------------------|----------------------------------|----------------------------|
|Enter current balance for each account|Weekly Review or tap card         |Config section rows 16-31   |
|Set up all recurring transactions     |Side Menu → Recurring Transactions|Header rows frequency/amount|
|Enter any planned one-offs            |Side Menu → Planned One-offs      |User knowledge              |
|Verify exchange rate                  |Settings → Exchange Rate          |Current market rate         |
|Set Summary Target Date               |Settings → Summary Target Date    |User preference             |
|Set Account Order                     |Settings → Account Order          |User preference             |

-----

## Part B — Development Phases Spec

### B.1 Phase 1 — MVP (Current)

**Goal:** Replace the Excel spreadsheet entirely. All core workflows functional.

#### Sprint 1 — Foundation (Week 1-2)

- [ ] Supabase project setup (schema, RLS, auth)
- [ ] Next.js project scaffold (TypeScript, Tailwind, folder structure)
- [ ] Seed script — accounts + settings
- [ ] Core TypeScript types defined
- [ ] Supabase client configured (server + client)
- [ ] Auth flow — login page (single user)

#### Sprint 2 — Forecast Engine (Week 2-3)

- [ ] `decimal.js` integration and money utilities
- [ ] `date-fns` date utilities
- [ ] Recurring occurrence generator
- [ ] Weekday-only rule implementation
- [ ] Effective amount resolver (version history)
- [ ] Core Budget calculation function
- [ ] Full grid calculation function
- [ ] Unit tests for all calculation functions
- [ ] Edge case handling (month-end, leap year, bank holidays)

#### Sprint 3 — iPhone Home + Cards (Week 3-4)

- [ ] Account card component (gradient, three values)
- [ ] Apple Wallet card stack (overlap scroll)
- [ ] Home screen header (Cash Balance, Budget, Variance)
- [ ] Card detail view
- [ ] Transaction timeline (vertical scroll, today marker)
- [ ] Jump to date functionality
- [ ] [+] and [⋯] buttons and routing

#### Sprint 4 — Add Transaction (Week 4-5)

- [ ] Add Transaction panel (same-currency)
- [ ] Cross-currency detection and dual amount fields
- [ ] Account picker (grouped GBP/NZD)
- [ ] Date picker (with backdating rules)
- [ ] Context-aware pre-fill (from card vs. from home)
- [ ] Context-aware dismissal
- [ ] Forecast recalculation on submit

#### Sprint 5 — Weekly Review (Week 5-6)

- [ ] Review date confirmation screen
- [ ] Review flashcard component
- [ ] Live variance calculation
- [ ] Skip / Next logic
- [ ] Review completion and storage
- [ ] Review summary screen
- [ ] Summary Target Date projection

#### Sprint 6 — Recurring Transactions (Week 6-7)

- [ ] Recurring transactions list (side menu)
- [ ] Add recurring form (with frequency options)
- [ ] Edit recurring (three scopes: this / future / all)
- [ ] Delete recurring (three scopes)
- [ ] Effective date prompt for future edits
- [ ] Weekday-only toggle
- [ ] Recurring transactions in timeline

#### Sprint 7 — iPad Cockpit Grid (Week 7-9)

- [ ] Grid layout (frozen headers, frozen date column, frozen bottom bar)
- [ ] Virtual row rendering (`@tanstack/react-virtual`)
- [ ] No-bounce scroll on both axes
- [ ] Today row highlight
- [ ] Cell tap routing (empty vs. has transaction vs. past)
- [ ] Currency filter (GBP / NZD / All)
- [ ] Jump to date in grid
- [ ] Add Transaction panel (grid entry — context pre-filled)
- [ ] Add Transaction panel (side menu entry — blank)
- [ ] Transaction Detail Panel (edit/delete)
- [ ] Add Account panel
- [ ] Grid recalculation on any change

#### Sprint 8 — Settings + Polish (Week 9-10)

- [ ] Settings screen (all sections)
- [ ] Account order drag-to-reorder
- [ ] Per-account colour picker
- [ ] Exchange rate (manual + auto-fetch)
- [ ] Summary Target Date picker
- [ ] Budget Comparison Date setting
- [ ] Planned One-offs (list + add + delete)
- [ ] Side menu (iPhone + iPad)
- [ ] First launch setup flow

#### Sprint 9 — QA + Launch (Week 10-11)

- [ ] End-to-end testing of all flows
- [ ] Budget calculation accuracy verification (against CSV)
- [ ] Cross-currency transfer testing
- [ ] Decimal arithmetic edge case testing
- [ ] Mobile Safari testing (iPhone + iPad)
- [ ] Performance testing (grid render, recalculation speed)
- [ ] PWA manifest (`manifest.json`, icons)
- [ ] Vercel deployment
- [ ] Production seed script run

-----

### B.2 Phase 2 — Post-MVP (Future)

Prioritised backlog for after Phase 1 is stable:

|Priority|Feature                                  |Complexity            |
|--------|-----------------------------------------|----------------------|
|High    |Mortgage / liability tracking            |Medium                |
|High    |Student loan full balance                |Low                   |
|High    |React Native app (iOS)                   |High                  |
|Medium  |Investment account with market value     |Medium                |
|Medium  |Net worth tracking (assets - liabilities)|Medium                |
|Medium  |Property value tracking                  |Low                   |
|Medium  |Push notifications (review reminders)    |Medium                |
|Medium  |Savings → Investments split              |Low                   |
|Low     |Dark mode                                |Low                   |
|Low     |CSV export / reporting                   |Medium                |
|Low     |Multi-user / shared access               |High                  |
|Low     |Automated bank feeds                     |High                  |
|Never   |Auto-reconciliation                      |— (against philosophy)|

-----

### B.3 Definition of Done (Phase 1)

The app is complete when:

1. **All 15 accounts** created and visible on home screen and iPad grid
1. **Budget formula** produces identical results to the Excel spreadsheet for all accounts and dates
1. **Weekly Review** captures actual balances and shows correct variance against Budget — without modifying the Budget
1. **Recurring transactions** generate correct occurrences across all frequencies with correct weekend handling
1. **Cross-currency transfers** correctly update both GBP and NZD accounts
1. **iPad grid** loads within 500ms, scrolls without bounce, recalculates instantly after any change
1. **iPhone flows** work end-to-end: add transaction → review → summary → back to home
1. **No float arithmetic errors** — all monetary calculations verified to 2 decimal places
1. **Single user auth** working on production Vercel deployment
1. **Exchange rate** auto-fetch working or manual fallback in place

-----

*End of Migration & Development Phases Spec v1.0*
*This completes the Phase 1 MVP specification suite.*

-----

## Full Spec Document Index

|Document                           |Version|Status    |
|-----------------------------------|-------|----------|
|UX Flow Spec                       |v2.0   |✅ Complete|
|Forecast Calculation Engine Spec   |v1.0   |✅ Complete|
|Data Model & Accounts Spec         |v1.0   |✅ Complete|
|Technical Stack & Architecture Spec|v1.0   |✅ Complete|
|Migration & Development Phases Spec|v1.0   |✅ Complete|