# Oovy & Ray’s Money — UX Flow Spec

**Version:** 2.0 (Full Rewrite)
**Phase:** 1 — MVP
**Last Updated:** May 2026
**Status:** Approved for Development
**Supersedes:** UX Flow Spec v1.0

-----

## Table of Contents

1. [Product Philosophy](#1-product-philosophy)
1. [Design Language](#2-design-language)
1. [Information Architecture](#3-information-architecture)
1. [Account Model Summary](#4-account-model-summary)
1. [The Three Values](#5-the-three-values)
1. [iPhone — Home Screen](#6-iphone--home-screen)
1. [iPhone — Card Detail View](#7-iphone--card-detail-view)
1. [iPhone — Add Transaction](#8-iphone--add-transaction)
1. [iPhone — Weekly Review](#9-iphone--weekly-review)
1. [iPhone — Review Summary](#10-iphone--review-summary)
1. [iPhone — Side Menu](#11-iphone--side-menu)
1. [iPad — Main Cockpit Grid](#12-ipad--main-cockpit-grid)
1. [iPad — Add Transaction (Grid Entry)](#13-ipad--add-transaction-grid-entry)
1. [iPad — Add Transaction (Side Menu Entry)](#14-ipad--add-transaction-side-menu-entry)
1. [iPad — Transaction Detail Panel](#15-ipad--transaction-detail-panel)
1. [iPad — Add Account](#16-ipad--add-account)
1. [Shared — Recurring Transactions](#17-shared--recurring-transactions)
1. [Shared — Planned One-offs](#18-shared--planned-one-offs)
1. [Settings](#19-settings)
1. [Display Conventions](#20-display-conventions)
1. [Edge Cases & Guards](#21-edge-cases--guards)
1. [Deferred to Phase 2](#22-deferred-to-phase-2)

-----

## 1. Product Philosophy

### 1.1 The Core Principle

> **Oovy & Ray’s Money is a forward-looking cashflow forecasting tool. It models a planned financial future — the Budget. It never automatically reconciles actual vs. Budget. The Budget is always manually controlled.**

### 1.2 The Three Rules

1. The **Budget** is a pure mathematical projection from opening balances + all scheduled transactions. It only changes when the user explicitly adds, edits, or deletes a transaction.
1. The **Weekly Review** is a comparison tool only — it captures actual balances and shows variance against the Budget. It never modifies the Budget.
1. If the user wants to bring the Budget in line with reality, they manually add an **overspend adjustment transaction**. This is always an explicit, deliberate user action.

### 1.3 Device Philosophy

|Device|Primary Role                                            |
|------|--------------------------------------------------------|
|iPhone|Transaction input + quick balance checks + weekly review|
|iPad  |Full cockpit — the living spreadsheet replacement       |

### 1.4 What This App Is Not

- Not a spending tracker — no categories, no merchant names
- Not a reconciliation engine — no auto-adjustment
- Not a bank feed app — fully manual, always
- No good/bad signals — no colour-coded amounts, no alerts

-----

## 2. Design Language

### 2.1 Visual Direction

- **Mode:** Light mode — frosted/translucent base (iPadOS-native feel)
- **Background:** Soft frosted white with layered depth and blur
- **Cards:** Bold, vivid user-defined gradient per account — punchy against light background
- **Typography:** Clean, high-contrast — tabular numerals for all financial figures
- **Inspiration:** Apple Wallet extended — stacked cards, smooth gestures, calm confidence
- **No colour-coded status** — amounts are never coloured red/green/amber

### 2.2 Per-Card Colours

- Every account has a user-defined gradient (colour from + colour to)
- Set in Settings → Accounts → [Account] → Colour
- Default palette assigned at account creation
- Colour follows the card everywhere: home stack, iPad column header, card detail

### 2.3 Amount Display Convention

|Scenario                           |Format           |Example       |
|-----------------------------------|-----------------|--------------|
|Debit (money leaving account)      |Bracketed        |`(£200.00)`   |
|Credit (money entering account)    |Plain            |`£4,120.00`   |
|Positive variance (ahead of Budget)|Plus prefix      |`+£260.00`    |
|Negative variance (behind Budget)  |Bracketed        |`(£260.00)`   |
|Zero                               |Plain zero       |`£0.00`       |
|NZD amounts                        |NZ$ prefix always|`NZ$10,000.00`|

### 2.4 CR/DR Convention

- In transaction detail panels: explicit **DR** / **CR** labels
- DR = money leaving the From account
- CR = money entering the To account
- Direction is always relative to the account being viewed — never stored as a field

### 2.5 Transaction Names

- All transactions start **blank** — “Untitled” shown as placeholder
- Names are optional — never required for any operation
- User fills in names at their own pace

-----

## 3. Information Architecture

### 3.1 iPhone Navigation

```
Home Screen
├── [Card tap] → Card Detail View
│   ├── [📅] → Jump to date (scrolls timeline)
│   ├── [+]  → Add Transaction (From pre-filled)
│   └── [⋯]  → Card options
├── [+] top right → Add Transaction (blank)
└── [⋯] top right → Side Menu (floats top right)
    ├── Recurring Transactions
    ├── Planned One-offs
    ├── Weekly Review
    └── Settings
```

### 3.2 iPad Navigation

```
Cockpit Grid
├── [Cell tap — future date, has transaction] → Transaction Detail Panel
├── [Cell tap — future date, empty]           → Add Transaction (context pre-filled)
├── [Cell tap — past date]                    → View only panel
├── [+ in header row]                         → Add Account Panel
├── [+ in top bar]                            → Add Transaction (blank)
├── [⋯ in top bar]                            → Side Menu (floats top right)
│   ├── Recurring Transactions
│   ├── Planned One-offs
│   ├── Weekly Review
│   └── Settings
├── [Currency filter]  → Show/hide GBP or NZD columns
└── [📅 Jump to date]  → Scrolls grid to date
```

-----

## 4. Account Model Summary

|Type    |Review|Cash Balance|Notes                                         |
|--------|------|------------|----------------------------------------------|
|CURRENT |✓     |✓           |Day-to-day accounts                           |
|SAVINGS |✓     |✓           |Savings pots                                  |
|CREDIT  |✓     |✓           |Credit cards                                  |
|DEBT    |✓     |✓           |Money owed to shared pot                      |
|TRACKING|✗     |Toggle      |Purpose accounts — student loan, investments  |
|EXTERNAL|✗     |✗           |Virtual — money in/out of system. Never shown.|

**Production accounts (15 total):** See Data Model & Accounts Spec v1.0

-----

## 5. The Three Values

Every account has three values at any point in time:

```
Budget        What the plan says the balance should be
Actual        Last manually entered real-world balance
Variance      Actual minus Budget
```

**Variance display:**

```
Actual > Budget  →  +£260.00    ahead of plan
Actual < Budget  →  (£260.00)   behind plan
Actual = Budget  →  £0.00       exactly on plan
```

No colour. No judgement. Purely informational.

**Where each value appears:**

|Screen                 |Budget         |Actual                |Variance           |
|-----------------------|---------------|----------------------|-------------------|
|Home header            |✓              |✓ (Cash Balance)      |✓                  |
|Account card           |✓              |✓                     |✓                  |
|Card detail header     |✓              |✓                     |✓                  |
|iPad grid cells        |✓ (Budget only)|—                     |—                  |
|iPad bottom bar        |✓              |✓                     |✓                  |
|Weekly review flashcard|✓              |✓ (entered live)      |✓ (calculated live)|
|Review summary         |✓ (projected)  |✓ (post-review actual)|—                  |

-----

## 6. iPhone — Home Screen

### 6.1 Layout

```
┌─────────────────────────────────────┐
│  Oovy & Ray's Money          [+][⋯] │  ← Full name, never truncated
│                                     │
│  Cash Balance                       │
│  £11,502.00                         │  ← Sum of all actual balances (GBP equiv)
│                                     │
│  Budget    £11,762.00               │  ← Sum of all Budget balances at comparison date
│  Variance    (£260.00)              │  ← Cash Balance minus Budget
│                                     │
│ ┌───────────────────────────────┐   │
│ │ Monzo General      £2,340.00  │   │  ← Account name TL, Actual TR
│ │ Budget:  £2,600.00            │   │
│ │ Variance:  (£260.00)          │   │
│ │ Updated: 17 May               │   │
│ ├───────────────────────────────┤   │
│ │ Monzo Spending         £0.00  │   │  ← Cards stack, Apple Wallet style
│ │ Budget:    £200.00            │   │
│ │ Variance:  (£200.00)          │   │
│ │ Updated: 17 May               │   │
│ ├───────────────────────────────┤   │
│ │ Monzo Bills           £52.00  │   │
│ │ ...                           │   │
└─────────────────────────────────────┘
```

### 6.2 Header Values

- **Cash Balance** — sum of all actual balances, NZD converted to GBP at current rate
- **Budget** — sum of all Budget balances at the comparison date (default: today, configurable in Settings)
- **Variance** — Cash Balance minus Budget. `+` prefix if positive, brackets if negative

### 6.3 Card Layout (per card)

- **Top left:** Account name
- **Top right:** Actual balance (last entered)
- **Row 2:** Budget at comparison date
- **Row 3:** Variance
- **Row 4:** “Updated: [date]” — date of last actual entry
- **Card colour:** User-defined gradient (vivid, bold)

### 6.4 Card Stack Behaviour

- Overlapping stack, Apple Wallet style
- Vertical scroll only — no horizontal
- GBP accounts first, then NZD (user-configurable order in Settings)
- Tracking accounts shown at bottom of stack
- Archived accounts hidden

### 6.5 Interactions

- **Tap card** → Card Detail View
- **Tap [+]** → Add Transaction (all fields blank)
- **Tap [⋯]** → Side Menu (floats top right, home visible behind)

### 6.6 Acceptance Criteria

- [ ] Full app name “Oovy & Ray’s Money” always visible, never truncated
- [ ] Cash Balance reflects actual balances only — never Budget
- [ ] Budget and Variance update when comparison date changes in Settings
- [ ] Cards ordered per Settings → Account Order (GBP default first)
- [ ] No colour coding on any amount
- [ ] Tracking accounts appear in stack but excluded from aggregate totals if toggle is OFF

-----

## 7. iPhone — Card Detail View

### 7.1 Layout

```
┌─────────────────────────────────────┐
│ ‹ Back                  [📅][+][⋯]  │  ← Three buttons top right
│                                     │
│ ┌───────────────────────────────┐   │
│ │ Monzo General                 │   │
│ │ £2,340.00                     │   │  ← Actual (large, prominent)
│ │ Budget:    £2,600.00          │   │
│ │ Variance:    (£260.00)        │   │
│ │ Updated: 17 May               │   │
│ └───────────────────────────────┘   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  13 May  → Monzo Spending           │
│                        (£200.00)    │  ← DR: bracketed
│  15 May  → Monzo Bills              │
│                        (£178.34)    │
│  17 May  ← Salary                   │
│                        £4,120.00    │  ← CR: plain
│  ────────── Today · 20 May ─────── │  ← Today marker, centred
│  25 May  → Monzo Spending           │
│                        (£200.00)    │  ← Future: same style
│  30 May  → Monzo Bills              │
│                        (£178.34)    │
│  1 Jun   → Monzo Rent               │
│                      (£2,050.00)    │
│  14 Jun  ← Salary                   │
│                        £3,879.00    │
└─────────────────────────────────────┘
```

### 7.2 Card Header

- **Top:** Account name
- **Large number:** Actual balance (last entered)
- **Budget:** Budget at comparison date
- **Variance:** Actual minus Budget
- **Updated:** Date of last actual entry

### 7.3 Timeline Behaviour

- Opens scrolled to **today** by default — today marker centred
- Scroll **up** = past transactions (history)
- Scroll **down** = future forecast (Budget projections)
- Single vertical scroll only — no horizontal
- No scroll bounce (`overscroll-behavior: none`)
- Past and future entries: same visual style — date tells the story
- Transaction row: date on left, account name, amount right-aligned
- DR = bracketed `(£200.00)` · CR = plain `£4,120.00`
- Recurring future transactions shown at their scheduled dates

### 7.4 [📅] Jump to Date

- Tap → date picker appears
- Select any date → timeline scrolls and snaps to that date
- Selected date centred like the Today marker
- Card header updates to show Budget balance on that date
- Purpose: “what will my balance be on [date]?”

### 7.5 [+] Button

- Context-aware: opens Add Transaction with **From account pre-filled** as this account

### 7.6 [⋯] Button

- Card options: Edit card colour, View account details

### 7.7 Acceptance Criteria

- [ ] Timeline renders minimum 18 months forward from today
- [ ] Today marker auto-scrolled into view on open
- [ ] Jump to date snaps timeline and updates header Budget value
- [ ] Past transactions: tap to view detail only (read-only on iPhone)
- [ ] Future transactions: tap to view detail
- [ ] Debit amounts always bracketed, credits always plain
- [ ] No colour distinction between past and future entries

-----

## 8. iPhone — Add Transaction

### 8.1 Entry Points

|Entry Point    |From Pre-filled|To Pre-filled|
|---------------|---------------|-------------|
|[+] Home screen|—              |—            |
|[+] Card detail|This account   |—            |

### 8.2 Same-Currency Layout

```
┌─────────────────────────────────────┐
│ Add Transaction               Cancel │
│                                      │
│  £200.00_                            │  ← Amount, large, cursor, first focus
│                                      │
│ ┌────────────────────────────────┐   │
│ │ From    Monzo General        › │   │  ← Pre-filled if from card
│ │ To      Monzo Spending       › │   │
│ └────────────────────────────────┘   │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Date    Today, 20 May 2026   › │   │
│ └────────────────────────────────┘   │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Note    Optional             › │   │
│ └────────────────────────────────┘   │
│                                      │
│        [ Add Transaction ]           │  ← Disabled until amount + accounts set
└──────────────────────────────────────┘
```

### 8.3 Cross-Currency Layout

Triggered automatically when From and To accounts are in **different currencies:**

```
│  Amount Out   £450.00_               │  ← GBP leaving From account
│  Amount In    NZ$950.00_             │  ← NZD entering To account
```

- Both amounts entered manually — no auto-conversion
- App never calculates or stores implied rate
- Exchange rate setting is not used here

### 8.4 Account Picker

- Grouped scrollable list: GBP accounts first, then NZD
- Currently selected account highlighted
- External account never shown in picker
- Archived accounts never shown

### 8.5 Date Rules

- Defaults to **today**
- Can be backdated — minimum: today (no restriction for ad-hoc transfers)
- Future dates allowed — creates a planned one-off
- Date format: “Today, 20 May 2026” / “19 May 2026” / “25 May 2026”

### 8.6 Dismissal (context-aware)

- Entered from Home → returns to Home
- Entered from Card Detail → returns to Card Detail

### 8.7 Acceptance Criteria

- [ ] Amount field focused immediately on open (keyboard up)
- [ ] Cross-currency detection automatic on account selection
- [ ] Submit button disabled until amount > 0 AND both accounts selected
- [ ] Note field optional — never blocks submission
- [ ] Forecast recalculates immediately on submission
- [ ] Context-aware dismissal works correctly

-----

## 9. iPhone — Weekly Review

### 9.1 Entry Point

Side Menu → Weekly Review

### 9.2 Step 1 — Date Confirmation

```
┌─────────────────────────────────────┐
│ Weekly Review                        │
│                                      │
│  Review Date                         │
│  Today, 20 May 2026                  │
│                                      │
│  [ Change Date ]                     │  ← Opens date picker
│                                      │
│  Last review: 13 May 2026            │
│                                      │
│         [ Continue → ]               │
└──────────────────────────────────────┘
```

**Date rules:**

- Defaults to today
- Can backdate — minimum date is the **last completed review date + 1 day**
- Cannot backdate to or before the last review date
- Cannot select a future date

### 9.3 Step 2 — Account Flashcard

```
┌─────────────────────────────────────┐
│ Weekly Review                   3/12 │  ← Progress (excludes Tracking accounts)
│                                      │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │  MONZO SAVINGS                   │ │
│ │                                  │ │
│ │  Budget today                    │ │
│ │  £3,500.00                       │ │  ← Budget for review date
│ │                                  │ │
│ │  Last actual · 13 May            │ │
│ │  £3,368.33 ────────              │ │  ← Struck through
│ │                                  │ │
│ │  Current Balance                 │ │
│ │  £3,720.00_                      │ │  ← Large input, cursor, focused
│ │                                  │ │
│ │  Variance                        │ │
│ │  +£220.00                        │ │  ← Live: updates as user types
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│   [ Skip ]          [ Next → ]       │
└──────────────────────────────────────┘
```

### 9.4 Flashcard Rules

- Accounts in user-defined order (Settings → Account Order)
- Default order: GBP first, then NZD
- **Tracking accounts excluded entirely** — never appear
- **Budget today** = Budget formula result for the review date
- **Last actual** = most recent actual balance entry, shown struck-through
- **Variance** = live calculation as user types: `entered amount - Budget`
- Tap **Skip** → account retains last actual balance, advances to next
- Tap **Next** → saves entered balance as new actual, advances to next
- No back navigation — forward only
- Keyboard “Next”/“Done” advances to next account

### 9.5 Review Does NOT

- Modify the Budget in any way
- Create any transactions
- Auto-adjust any future forecasts

### 9.6 Overspend Adjustment

If the user wants to bring the Budget in line with the actual after reviewing:

1. Complete the review
1. Navigate to the relevant account card
1. Tap [+] → Add Transaction
1. From: [account] → To: External
1. Amount: the variance amount
1. This is a Manual Adjustment — it debits the Budget, closing the gap

This is always explicit and deliberate. Never automatic.

### 9.7 Acceptance Criteria

- [ ] Progress counter visible throughout (X of Y — Y excludes Tracking)
- [ ] Budget for review date shown on each card
- [ ] Previous actual shown struck-through
- [ ] Variance calculates live as user types
- [ ] Skip retains previous actual, no new entry saved
- [ ] Tracking accounts never appear
- [ ] Review date guard enforced (cannot backdate to/before last review)
- [ ] Budget unchanged after review completes

-----

## 10. iPhone — Review Summary

### 10.1 Layout

```
┌─────────────────────────────────────┐
│  ✓  Review Complete                  │
│  Projected at 15 June 2026           │  ← Settings → Summary Target Date
│                                      │
│  SAVINGS ACCOUNTS                    │
│                                      │
│  Monzo Savings                       │
│  £3,720  →  £4,520                   │  ← Actual (post-review) → Budget at target
│                                      │
│  Rent Deposit                        │
│  £1,746  →  £1,746                   │
│                                      │
│  NZ Savings                          │
│  NZ$10,000  →  NZ$11,400             │
│                                      │
│  ─────────────────────────────────   │
│  CASH BALANCE                        │
│                                      │
│  Total GBP                           │
│  £11,502  →  £13,100                 │
│                                      │
│  Total NZD                           │
│  NZ$25,560  →  NZ$29,100             │
│                                      │
│             [ Done ]                 │
└──────────────────────────────────────┘
```

### 10.2 Summary Rules

- **Target date** sourced from Settings → Summary Target Date (user must set)
- **Left value** = actual balance entered during this review
- **Right value** = Budget formula projected to target date from current state
- Shows: all SAVINGS accounts + aggregate Cash Balance totals (GBP + NZD)
- NZD savings shown in NZD — not converted
- Tap **Done** → returns to Home, all forecasts recalculated

### 10.3 Acceptance Criteria

- [ ] If Summary Target Date not set in Settings — prompt user to set it before showing summary
- [ ] Projection uses Budget formula — not actual trajectory
- [ ] Only SAVINGS type accounts shown in savings section
- [ ] Both GBP and NZD totals shown
- [ ] Done returns to Home

-----

## 11. iPhone — Side Menu

### 11.1 Trigger

Tap **[⋯]** top right on Home screen

### 11.2 Appearance

Floating rounded card, top-right corner. Home screen cards visible behind frosted overlay. Does not cover full screen.

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

### 11.3 Menu Items

|Item                  |Destination                                           |
|----------------------|------------------------------------------------------|
|Recurring Transactions|Full list of recurring schedules — add / edit / delete|
|Planned One-offs      |List of future one-off transactions — add / delete    |
|Weekly Review         |Begins review flow (Step 1 — date confirmation)       |
|Settings              |App settings                                          |

### 11.4 Acceptance Criteria

- [ ] Menu floats top right — does not full-screen
- [ ] Home visible behind frosted overlay
- [ ] Tap outside menu = dismiss
- [ ] Text only — no icons, no emoji

-----

## 12. iPad — Main Cockpit Grid

### 12.1 Purpose

The full day-by-day rolling Budget forecast across all accounts. The living replacement for the Excel spreadsheet. Every cell shows the Budget balance for that account on that date.

### 12.2 Layout (Landscape)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Oovy & Ray's Money  [GBP✓][NZD✓][All]  [📅 Jump to date]  £11,502  (£260)  [+][⋯] │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┤
│  Date    │  Monzo   │  Monzo   │  Monzo   │  Monzo   │  Rent    │  [+]  │ ← Frozen
│          │ General  │ Spending │  Bills   │ Savings  │ Deposit  │       │   header
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│ Mon 12   │  £2,800  │      £0  │    £52   │  £3,368  │  £1,746  │       │
│ Tue 13   │ (£2,600) │    £200  │    £52   │  £3,368  │  £1,746  │       │
│ Wed 14   │  £2,600  │    £200  │    £52   │  £3,368  │  £1,746  │       │
│ Thu 15   │ (£2,422) │    £200  │   £230   │  £3,368  │  £1,746  │       │
╠══════════════════════════ TODAY · 20 MAY ═══════════════════════════════╣ ← Highlighted
│ Tue 20   │  £5,934  │    £200  │   £230   │  £3,368  │  £1,746  │       │
│ Wed 21   │  £5,934  │    £200  │   £230   │  £3,368  │  £1,746  │       │
│ Mon 26   │ (£5,534) │    £200  │   £230   │  £3,368  │  £1,746  │       │
│ Fri 30   │ (£5,206) │    £200  │   (£52)  │ (£2,868) │  £1,746  │       │
│ Sun 1Jun │ (£3,056) │    £200  │    £52   │  £2,868  │  £1,746  │       │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────┤
│ Cash Balance: £11,502  │  Budget: £11,762  │  Variance: (£260)  │ Rate: 1 GBP = 2.22 NZD │ Last review: 17 May │
└──────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Grid Structure

- **Frozen left column:** Date (Day + Date + Month)
- **Frozen top row:** Account names + currency/type badge + [+] add account
- **Frozen bottom bar:** Cash Balance · Budget · Variance · Exchange rate · Last review date
- **Scrollable body:** Vertical (dates) + Horizontal (accounts) — independent axes
- **No bounce** on either axis (`overscroll-behavior: none`)
- Opens scrolled to **today’s row** by default
- Only rows with transactions shown — quiet/empty days shown as thin spacer rows

### 12.4 Today Row

- Subtly highlighted background
- “TODAY” label visible in date cell
- All cells in today row rendered at full brightness
- Acts as the visual anchor when the grid opens

### 12.5 Cell Values

- Every cell shows the **Budget** balance for that account on that date
- Debits shown as `(£200.00)` — brackets
- Credits shown as `£4,120.00` — plain
- Cells with a transaction on that day: small left-edge indicator bar (presence only, no colour meaning)
- Zero balances: `£0.00` at reduced opacity

### 12.6 Currency Filter (top bar)

Three states — **GBP** / **NZD** / **All:**

- GBP and NZD can both be active simultaneously (filter, not replace)
- Toggling NZD off hides all NZD columns
- Toggling GBP off hides all GBP columns
- All = show everything
- Cannot turn both off simultaneously — guard prevents all-off state

### 12.7 Jump to Date

- Tap **[📅 Jump to date]** in top bar → inline date input activates
- Enter/select date → grid scrolls to that row, highlights it temporarily
- Date cell shows brief highlight animation then returns to normal

### 12.8 Cell Tap Behaviour

|Cell Type                    |Action                                    |
|-----------------------------|------------------------------------------|
|Future date — has transaction|Opens Transaction Detail Panel            |
|Future date — empty          |Opens Add Transaction (context pre-filled)|
|Today — has transaction      |Opens Transaction Detail Panel            |
|Today — empty                |Opens Add Transaction (context pre-filled)|
|Past date — any              |Opens view-only detail panel              |

### 12.9 Acceptance Criteria

- [ ] No scroll bounce on either axis
- [ ] Both axes scroll independently with both headers frozen
- [ ] Today row auto-scrolled into view on open
- [ ] Currency filter works independently — each toggleable
- [ ] Grid renders minimum 18 months forward from today
- [ ] [+] always visible as last column in header
- [ ] Bottom bar always visible — never scrolls away
- [ ] Cell tap routes correctly based on date and content

-----

## 13. iPad — Add Transaction (Grid Entry)

### 13.1 Trigger

Tap an **empty future cell** in the cockpit grid

### 13.2 Behaviour

- Context-aware: **Account pre-filled** from the column tapped, **Date pre-filled** from the row tapped
- Panel slides in from right — grid remains visible at reduced width
- User sees immediately which account and date they’re adding to

### 13.3 Panel Layout

```
┌────────────────────────────────┐
│ Add Transaction            [✕] │
│────────────────────────────────│
│                                │
│  £0.00_                        │  ← Amount, large, first focus
│                                │
│ From Account                   │
│ [Monzo General ✓             ›]│  ← Pre-filled from column
│                                │
│ To Account                     │
│ [Select account              ›]│  ← User picks
│                                │
│ Date                           │
│ [26 May 2026 ✓               ›]│  ← Pre-filled from row
│                                │
│ Type                           │
│ [DR ✓]  [CR]                   │  ← DR default
│                                │
│ Recurring                      │
│ [toggle OFF]                   │
│ Make this a recurring schedule │
│                                │
│ Name (optional)                │
│ [Untitled                    ›]│
│                                │
│ Note (optional)                │
│ [                            ›]│
│                                │
│ [    Add Transaction    ]      │  ← Disabled until amount set
└────────────────────────────────┘
```

### 13.4 Recurring Toggle

If user turns **Recurring ON:**

```
│ Frequency                      │
│ [Weekly][Fortnightly]          │
│ [Monthly ✓][Quarterly]         │
│ [Biannual]                     │
│                                │
│ Day of month                   │
│ [26th ✓                      ›]│  ← Pre-filled from date
│                                │
│ Weekday only                   │
│ [toggle OFF]                   │
│ Move to Friday if on weekend   │
│                                │
│ Apply from                     │
│ [26 May 2026                 ›]│
```

### 13.5 Cross-Currency

If To account is in different currency than From:

```
│ Amount Out   £450.00_          │
│ Amount In    NZ$_              │  ← Second field appears
```

### 13.6 Acceptance Criteria

- [ ] Account and date pre-filled from tapped cell
- [ ] Panel slides in without covering grid entirely
- [ ] DR selected by default
- [ ] Recurring toggle expands cleanly with frequency options
- [ ] Cross-currency second amount field appears automatically
- [ ] Save triggers immediate grid recalculation
- [ ] Grid updates visible behind panel without closing it

-----

## 14. iPad — Add Transaction (Side Menu Entry)

### 14.1 Trigger

Side Menu → (within Recurring Transactions or Planned One-offs) → [+]
OR
Top bar [+] button

### 14.2 Behaviour

- **Clean slate** — no pre-filled account or date
- Full panel, centred on screen or slides from right
- Used for setting up new recurring schedules or planned one-offs from scratch

### 14.3 Panel Layout

Same fields as Section 13.3 but with no pre-filled values:

```
┌────────────────────────────────┐
│ Add Transaction            [✕] │
│────────────────────────────────│
│  £0.00_                        │
│                                │
│ From Account                   │
│ [Select account              ›]│  ← Blank
│                                │
│ To Account                     │
│ [Select account              ›]│  ← Blank
│                                │
│ Date                           │
│ [Today, 20 May 2026          ›]│  ← Defaults to today
│                                │
│ Type        [DR ✓]  [CR]       │
│                                │
│ Recurring   [toggle OFF]       │
│                                │
│ Name (optional)  [Untitled   ›]│
│ Note (optional)  [           ›]│
│                                │
│ [    Add Transaction    ]      │
└────────────────────────────────┘
```

### 14.4 Acceptance Criteria

- [ ] All fields blank/defaulted on open
- [ ] Date defaults to today
- [ ] Same recurring toggle and cross-currency behaviour as grid entry
- [ ] Save triggers grid recalculation immediately

-----

## 15. iPad — Transaction Detail Panel

### 15.1 Trigger

Tap any cell that **has a transaction** in the cockpit grid

### 15.2 Layout

```
┌────────────────────────────────┐
│ Transaction                [✕] │
│────────────────────────────────│
│ Name                           │
│ [Untitled                    ›]│  ← Editable, blank default
│                                │
│ Type          Amount           │
│ [DR ✓][CR]    [(£178.34)     ›]│  ← DR/CR selector + bracketed if DR
│                                │
│ Date                           │
│ [30 May 2026                 ›]│
│                                │
│ From Account                   │
│ [Monzo General               ›]│
│                                │
│ To Account                     │
│ [Monzo Bills                 ›]│
│                                │
│ Recurring          [toggle ON] │
│ Repeats on a schedule          │
│                                │
│ Frequency                      │
│ [Weekly][Fortnightly]          │
│ [Monthly ✓][Quarterly]         │
│ [Biannual]                     │
│                                │
│ Weekday only       [toggle OFF]│
│                                │
│ [   Delete   ]    [   Save   ] │
└────────────────────────────────┘
```

### 15.3 CR/DR Convention in Panel

- **DR selected:** Amount shown as `(£178.34)` — bracketed
- **CR selected:** Amount shown as `£178.34` — plain
- User can switch DR/CR — amount formatting updates live

### 15.4 Save Behaviour

- Saves immediately
- Grid recalculates all affected rows instantly
- Panel stays open after save (allows further edits)
- Grid visible updating behind panel

### 15.5 Delete Behaviour

For a **one-off transaction:**

- Confirmation: “Delete this transaction?”
- Confirm → removed, grid recalculates

For a **recurring transaction:**

- Confirmation dialog:
  
  ```
  Delete recurring transaction?
  
  [ This occurrence only ]
  [ All future occurrences from [date] ]
  [ Entire series including history ]
  ```
- Each option shows what it affects before confirming
- Grid recalculates immediately on confirm

### 15.6 Past Transaction Panel

Tapping a past date cell opens a **view-only** version:

- All fields shown but not editable
- No Save button — only Close
- Delete available with confirmation

### 15.7 Acceptance Criteria

- [ ] DR/CR selector updates amount display live
- [ ] Recurring delete offers three scopes with clear descriptions
- [ ] Save triggers immediate grid recalculation
- [ ] Panel stays open after save
- [ ] Past transactions are view-only (no edit)
- [ ] Empty name always shows “Untitled” placeholder

-----

## 16. iPad — Add Account

### 16.1 Trigger

Tap **[+]** at the end of the frozen header row in the cockpit grid

### 16.2 Panel Layout

```
┌────────────────────────────────┐
│ New Account                [✕] │
│────────────────────────────────│
│ Account Name                   │
│ [e.g. Holiday Fund           ›]│  ← Required
│                                │
│ Currency                       │
│ [GBP £ ✓]   [NZD $]            │
│                                │
│ Account Type                   │
│ [Current ✓][Savings]           │
│ [Credit   ][Tracking]          │
│                                │
│ Include in Cash Balance        │
│ [toggle ON ✓]                  │
│ Counts toward total            │
│                                │
│ Include in Weekly Review       │
│ [toggle ON ✓]                  │
│ Appears in weekly review       │
│                                │
│ Card Colour                    │
│ [████████████████████]         │  ← Gradient picker (from → to)
│                                │
│      [ Create Account ]        │
└────────────────────────────────┘
```

### 16.3 Type Defaults

|Type Selected|Cash Balance|Weekly Review|
|-------------|------------|-------------|
|Current      |ON          |ON           |
|Savings      |ON          |ON           |
|Credit       |ON          |ON           |
|Tracking     |OFF         |OFF          |

Toggles auto-set when type is selected. User can override.

### 16.4 Post-Creation

- New column appears at far right of grid (before [+])
- Opening balance: £0.00 (user enters via weekly review or card tap)
- Column order adjustable in Settings → Account Order

### 16.5 Acceptance Criteria

- [ ] Name required — Create button disabled without it
- [ ] Currency required — no default
- [ ] Type selection auto-sets toggles
- [ ] New column appears immediately after creation
- [ ] Colour picker functional — gradient preview visible

-----

## 17. Shared — Recurring Transactions

### 17.1 Access

- Side Menu → Recurring Transactions (iPhone + iPad)
- Tap recurring transaction cell in grid → Transaction Detail Panel (iPad)

### 17.2 List View

```
Recurring Transactions              [+]

Rent
£1,800.00 · Monthly · 1st
Monzo General → External
Next: 1 Jun 2026

Weekly Spending
£200.00 · Weekly · Monday
Monzo General → Monzo Spending
Next: 26 May 2026

YouTube
£22.99 · Monthly · 15th
Monzo General → External
Next: 15 Jun 2026

...
```

Each item shows: Name (or “Untitled”) · Amount · Frequency · Day anchor · From → To · Next occurrence

### 17.3 Editing

- Tap item → Transaction Detail Panel (same as Section 15.2)
- Edit scope options: This occurrence / All future from [date] / Entire series
- Effective date prompt for “All future” edits

### 17.4 Frequencies

|Frequency  |Day Anchor                  |
|-----------|----------------------------|
|Weekly     |Day of week (Mon–Sun)       |
|Fortnightly|Start date, every 14 days   |
|Monthly    |Day of month (1–31)         |
|Quarterly  |Day of month, every 3 months|
|Biannual   |Day of month, every 6 months|

### 17.5 Weekend Rule

Each recurring has a **Weekday only** toggle:

- **OFF (default):** Falls on scheduled date regardless of day of week
- **ON:** If scheduled date is Saturday or Sunday → move to **Friday before**. Never move to Monday. Bank holidays treated same as weekends.

-----

## 18. Shared — Planned One-offs

### 18.1 Access

Side Menu → Planned One-offs

### 18.2 What It Is

A single future transaction with a specific date. Created for known upcoming expenses that aren’t recurring. Deleted when done.

### 18.3 List View

```
Planned One-offs                    [+]

Student Loan Payment
£3,000.00 · 15 Jun 2026
Monzo Student Loan → External

Holiday Deposit
£800.00 · 1 Jul 2026
Monzo Savings → External

...
```

### 18.4 Lifecycle

1. Created → appears in Budget forecast on its date
1. Date passes → visible in history
1. User marks done or deletes → removed
1. Can bulk-clear all past/completed one-offs

### 18.5 Acceptance Criteria

- [ ] One-offs appear in Budget forecast on their date
- [ ] Deleting removes from forecast immediately
- [ ] No recurring options — one-offs are always single-date

-----

## 19. Settings

### 19.1 Sections

**Summary Target Date**

- Single date picker
- Used for Review Summary forward projection
- No default — user must set on first use
- Prompt shown if not set when Review Summary is reached

**Budget Comparison Date**

- Default: Today (rolling)
- Option: Custom fixed date
- Controls the “Budget” figure shown on cards and home screen
- Does not affect the forecast — display only

**Account Order**

- Drag-to-reorder list of all accounts
- Order applies to: Home card stack + Review flashcard sequence
- Default: GBP accounts first, then NZD

**Account Management**
Per account:

- Rename
- Change colour/gradient
- Toggle: Include in Cash Balance
- Toggle: Include in Weekly Review
- Archive (with confirmation if balance > 0)

**Exchange Rate**

- Current rate: 1 GBP = [X] NZD
- Manual input or auto-fetch toggle
- Auto-fetch: frankfurter.app free API, fetched daily on app open
- Falls back to last stored rate if fetch fails
- Rate displayed in: iPad bottom bar, iPhone home screen

-----

## 20. Display Conventions

### 20.1 Amounts

|Type             |Format         |Example       |
|-----------------|---------------|--------------|
|Debit (money out)|Bracketed      |`(£200.00)`   |
|Credit (money in)|Plain          |`£4,120.00`   |
|Positive variance|Plus prefix    |`+£260.00`    |
|Negative variance|Bracketed      |`(£260.00)`   |
|Zero             |Plain          |`£0.00`       |
|NZD              |NZ$ prefix     |`NZ$10,000.00`|
|Large amounts    |Comma separator|`£1,800.00`   |

### 20.2 Transaction Labels (Detail Panels)

|Concept                   |Label      |
|--------------------------|-----------|
|Money leaving From account|DR         |
|Money entering To account |CR         |
|Debit amount              |`(£178.34)`|
|Credit amount             |`£178.34`  |

### 20.3 Dates

|Context         |Format              |
|----------------|--------------------|
|Card “Updated”  |`17 May`            |
|Transaction list|`17 May`            |
|Review date     |`Today, 20 May 2026`|
|Settings dates  |`15 June 2026`      |
|iPad grid       |`Mon 20` / `Tue 21` |

### 20.4 Placeholders

|Field           |Placeholder        |
|----------------|-------------------|
|Transaction name|`Untitled`         |
|Note field      |`Optional`         |
|Amount          |`£0.00` with cursor|

-----

## 21. Edge Cases & Guards

|Scenario                                           |Behaviour                                                          |
|---------------------------------------------------|-------------------------------------------------------------------|
|Backdate review to/before last review date         |Date picker restricts — minimum is last review date + 1 day        |
|Two reviews on same date                           |Not permitted — date unique constraint enforced                    |
|Skip all accounts in review                        |Allowed — review completes, no actuals updated, summary still shows|
|Summary Target Date not set                        |User prompted to set it before summary screen shows                |
|Add transaction with no From or To                 |Submit disabled until both selected                                |
|Add transaction — amount zero                      |Submit disabled                                                    |
|Cross-currency — one amount left blank             |Submit disabled until both amounts entered                         |
|Delete recurring — entire series                   |Three-scope confirmation required                                  |
|Archive account with balance > £0                  |Warning shown: “This account has a balance of £X. Archive anyway?” |
|Archive account referenced by recurring transaction|Recurring paused — user notified to update accounts                |
|Currency filter — both GBP and NZD turned off      |Guard prevents — at least one must remain active                   |
|Exchange rate auto-fetch fails                     |Falls back to last stored rate silently                            |
|Exchange rate not set (first launch)               |Default 2.220000 used — user prompted to verify                    |
|Jump to date — date before opening date            |Not permitted                                                      |
|Account name left blank when creating              |Create button disabled                                             |
|Recurring on 31st in 30-day month                  |Uses last day of month (30th)                                      |
|Recurring on 29th Feb in non-leap year             |Uses 28th Feb                                                      |
|Weekday-only recurring — Friday is bank holiday    |Move to Thursday before                                            |

-----

## 22. Deferred to Phase 2

|Feature                           |Notes                                     |
|----------------------------------|------------------------------------------|
|Mortgage / liability tracking     |NZ mortgage balance and repayment         |
|Property asset value              |NZ house market value                     |
|Student loan full balance tracking|Phase 1: Tracking account only            |
|Investment market value           |Phase 1: Principal tracking only          |
|Savings → Investments split       |Single savings type in Phase 1            |
|Multi-user / shared access        |Single user in Phase 1                    |
|Automated bank feeds              |Manual-first — feeds optional in Phase 2  |
|Push notifications                |No alerts in Phase 1                      |
|React Native mobile app           |Responsive web PWA in Phase 1             |
|Export / reporting                |No CSV export or PDF in Phase 1           |
|Dark mode                         |Light mode only in Phase 1                |
|Auto-reconciliation               |Explicitly never — against core philosophy|
|Net worth tracking (liabilities)  |Phase 1 is cash balance only              |

-----

*End of UX Flow Spec v2.0*
*Cross-reference: Data Model & Accounts Spec v1.0 · Forecast Calculation Engine Spec v1.0*
*Next: Technical Stack & Architecture Spec*