# Oovy & Ray's Money — Settings & Manage Accounts Spec

**Version:** 1.0  
**Phase:** 1 — MVP  
**Last Updated:** May 2026  
**Status:** Ready for Development  
**Depends on:** UX Flow Spec v2.0, Data Model Spec v1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model Change](#2-data-model-change)
3. [Settings — iPhone](#3-settings--iphone)
4. [Settings — iPad](#4-settings--ipad)
5. [Manage Accounts Screen](#5-manage-accounts-screen)
6. [Account Edit Screen](#6-account-edit-screen)
7. [Hide from Home Screen](#7-hide-from-home-screen)
8. [Archive Account](#8-archive-account)
9. [Unarchive Account](#9-unarchive-account)
10. [Add New Account](#10-add-new-account)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. Overview

This spec covers two distinct but related features:

### 1.1 Settings Entry Points

| Device | How Settings Opens |
|---|---|
| iPhone | Full-screen navigation via ⋯ Side Menu → Settings |
| iPad | Right-side slide-in panel via ⋯ Side Menu → Settings. Cockpit grid remains visible behind. |

### 1.2 Settings Scope by Device

Settings content differs by device intentionally. iPad exposes only what is relevant to the cockpit grid view.

| Setting | iPhone | iPad |
|---|---|---|
| Summary Target Date | ✅ | ❌ |
| Budget Comparison Date | ✅ | ❌ |
| Account Order | ✅ | ✅ |
| Manage Accounts | ✅ | ❌ |
| Exchange Rate | ✅ | ❌ |

### 1.3 Navigation Pattern

**iPhone** uses standard full-screen push navigation:
```
⋯ Side Menu → Settings (full screen)
  └─ Manage Accounts (full screen)
       └─ Account Edit (full screen)
```

**iPad** uses sub-panel replacement within the slide-in panel. The grid never disappears.

> iPad Settings contains Account Order only — it is a single-purpose panel, not a sub-navigation structure.

---

## 2. Data Model Change

### 2.1 New Field — `show_on_iphone_home`

One new boolean field is required on the `accounts` table:

```sql
ALTER TABLE accounts
ADD COLUMN show_on_iphone_home BOOLEAN NOT NULL DEFAULT true;
```

### 2.2 Updated Accounts Schema

```sql
CREATE TABLE accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  type                    account_type NOT NULL,
  currency                currency NOT NULL,
  include_in_cash_balance BOOLEAN NOT NULL DEFAULT true,
  include_in_review       BOOLEAN NOT NULL DEFAULT true,
  show_on_iphone_home     BOOLEAN NOT NULL DEFAULT true,   -- ← NEW
  opening_balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  opening_date            DATE NOT NULL DEFAULT '2024-08-01',
  display_order           INTEGER NOT NULL DEFAULT 0,
  color_from              TEXT NOT NULL DEFAULT '#1a1a2e',
  color_to                TEXT NOT NULL DEFAULT '#0f3460',
  is_archived             BOOLEAN NOT NULL DEFAULT false,
  is_system               BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Field Behaviour Rules

| Account Type | `show_on_iphone_home` default | User-controllable |
|---|---|---|
| CURRENT | true | ✅ Yes |
| SAVINGS | true | ✅ Yes |
| CREDIT | true | ✅ Yes |
| DEBT | true | ✅ Yes |
| TRACKING | true | ✅ Yes |
| EXTERNAL | false | ❌ No (system account, never shown) |

### 2.4 Seeding

All existing 15 production accounts seeded with `show_on_iphone_home = true`.

---

## 3. Settings — iPhone

### 3.1 Entry Point

Tap **⋯** on iPhone Home Screen → Side Menu → **Settings**

Opens as a full-screen navigation screen with a back button.

### 3.2 Screen Layout

```
‹ Back                    Settings

──────────────────────────────────

FORECAST

  Summary Target Date
  15 June 2026                  ›

  Budget Comparison Date
  Today (rolling)               ›

──────────────────────────────────

ACCOUNTS

  Account Order                 ›
  Manage Accounts               ›

──────────────────────────────────

CURRENCY

  Exchange Rate
  1 GBP = 2.22 NZD              ›
  Auto-fetch  [toggle]
  Last updated: Today, 09:14

──────────────────────────────────
```

### 3.3 Section Behaviours

**Summary Target Date**
- Tap row → navigates to a date picker screen
- No default — user must set on first use
- If unset, displays "Not set" in muted text
- If user reaches Review Summary without this set, prompt appears before summary loads

**Budget Comparison Date**
- Tap row → navigates to sub-screen with two options:
  - ● Today (rolling) — default
  - ○ Custom date → date picker appears
- Controls the "Budget" figure shown on all account cards and home header
- Does not affect the forecast engine — display only

**Account Order**
- Tap row → navigates to drag-to-reorder list (see Section 3.4)

**Manage Accounts**
- Tap row → navigates to Manage Accounts screen (see Section 5)

**Exchange Rate**
- Tap rate row → inline editable field for manual override
- Auto-fetch toggle: fetches daily from `frankfurter.app` on app open
- Falls back to last stored rate if fetch fails
- "Last updated" timestamp shown below toggle

### 3.4 Account Order Sub-Screen (iPhone)

```
‹ Settings           Account Order

  ☰  Monzo General
  ☰  Monzo Spending
  ☰  Monzo Bills
  ☰  Monzo Rent + Expenses
  ☰  Monzo Savings
  ☰  Rent Deposit
  ☰  Monzo NZ House
  ☰  Monzo Student Loan
  ☰  Ray Revolut
  ☰  Olivia Owed
  ☰  Ray Owed
  ─────────────────────────────
  ☰  Olivia Revolut
  ☰  NZ Savings
  ☰  NZ Credit Card
  ☰  NZ House
```

- ☰ drag handle on every row
- GBP accounts above divider, NZD below
- Cross-currency dragging not permitted — groups are fixed
- Order persisted automatically on drop (single DB write to `display_order`)
- Order applies to: iPhone home card stack + iPad cockpit grid columns + Weekly Review flashcard sequence

---

## 4. Settings — iPad

### 4.1 Entry Point

Tap **⋯** on iPad top bar → Side Menu → **Settings**

### 4.2 Behaviour

Opens as a **right-side slide-in panel** over the cockpit grid. The grid remains visible and non-interactive behind the panel.

- Panel width: ~380px
- Slides in from the right edge
- Tap ✕ or tap anywhere outside the panel to dismiss
- Order changes persist automatically — no save button needed

### 4.3 Panel Layout

```
┌──────────────────────────────────────────────────────┐
│  Top Bar                               [📅][+][⋯]    │
│──────────────────────────────────────────────────────│
│                               │                      │
│                               │  Settings       [✕]  │
│   Cockpit Grid                │──────────────────────│
│   (visible, frozen)           │  ACCOUNT ORDER       │
│                               │                      │
│                               │  ☰ Monzo General     │
│                               │  ☰ Monzo Spending    │
│                               │  ☰ Monzo Bills       │
│                               │  ☰ Monzo Rent+Exp    │
│                               │  ☰ Monzo Savings     │
│                               │  ☰ Rent Deposit      │
│                               │  ☰ Monzo NZ House    │
│                               │  ☰ Monzo Student     │
│                               │  ☰ Ray Revolut       │
│                               │  ☰ Olivia Owed       │
│                               │  ☰ Ray Owed          │
│                               │  ─────────────────   │
│                               │  ☰ Olivia Revolut    │
│                               │  ☰ NZ Savings        │
│                               │  ☰ NZ Credit Card    │
│                               │  ☰ NZ House          │
│                               │                      │
└──────────────────────────────────────────────────────┘
```

### 4.4 iPad Account Order Behaviour

- ☰ drag handle visible on every account row
- GBP accounts above divider, NZD below — cross-currency dragging not permitted
- Columns in the cockpit grid **reorder live** as the user drags — no need to close panel
- Order persisted automatically on drop
- Same `display_order` field as iPhone — order is shared across both devices

---

## 5. Manage Accounts Screen

### 5.1 Entry Point

iPhone only: Settings → **Manage Accounts** ›

### 5.2 Screen Layout

```
‹ Settings        Manage Accounts

──────────────────────────────────
GBP ACCOUNTS

  ████  Monzo General           ›
  ████  Monzo Spending          ›
  ████  Monzo Bills             ›
  ████  Monzo Rent + Expenses   ›
  ████  Monzo Savings           ›
  ████  Rent Deposit            ›
  ████  Monzo NZ House          ›
  ████  Monzo Student Loan  TRACKING  ›
  ████  Ray Revolut             ›
  ████  Olivia Owed             ›
  ████  Ray Owed                ›

──────────────────────────────────
NZD ACCOUNTS

  ████  Olivia Revolut          ›
  ████  NZ Savings              ›
  ████  NZ Credit Card          ›
  ████  NZ House                ›

──────────────────────────────────
ARCHIVED                            ← Section hidden if no archived accounts exist

  ████  Old Account             ›   ← Shown at reduced opacity

──────────────────────────────────

  [ + Add New Account ]             ← Bottom CTA
```

### 5.3 Account Row

Each row contains:
- **Left:** Small gradient pill swatch (account colours)
- **Centre:** Account name. TRACKING accounts show a `TRACKING` badge inline.
- **Right:** Chevron `›`

Archived accounts shown at 50% opacity.

### 5.4 Grouping Rules

- Accounts grouped by currency: GBP first, NZD second
- Order within each group matches `display_order` (same as Account Order setting)
- Archived accounts shown in a separate section at the bottom, regardless of currency
- EXTERNAL account never shown anywhere in this screen

### 5.5 Archived Section

- Section header "ARCHIVED" only appears if at least one account has `is_archived = true`
- Archived accounts shown at reduced opacity
- Tapping an archived account opens the Account Edit screen with Unarchive option

### 5.6 Add New Account

Tapping **[ + Add New Account ]** opens the existing Add Account Panel (as specced in UX Flow Spec v2.0 Section 16).

---

## 6. Account Edit Screen

### 6.1 Entry Point

Tap any account row on the Manage Accounts screen.

### 6.2 Screen Layout

```
‹ Manage Accounts    [Account Name]

──────────────────────────────────

  Account Name
  [Monzo General                ›]   ← Editable text field. Required.

  Card Colour
  [████████████████████████]         ← Gradient picker (from → to)

──────────────────────────────────

  Include in Cash Balance
  [toggle]
  Counts toward home total

  Include in Weekly Review
  [toggle]
  Appears in review flashcards

  Hide from Home Screen
  [toggle]
  iPhone only — iPad unaffected

──────────────────────────────────

  Archive Account                    ← Red text. Not a button. Tap to trigger flow.

──────────────────────────────────

              [ Save Changes ]
```

### 6.3 Field Definitions

| Field | Editable | Type | Notes |
|---|---|---|---|
| Account Name | ✅ Yes | Text input | Required. Save disabled when empty. |
| Card Colour | ✅ Yes | Gradient picker | Same component as Add Account panel |
| Include in Cash Balance | ✅ Yes | Toggle | Immediate — no save required |
| Include in Weekly Review | ✅ Yes | Toggle | Immediate — no save required |
| Hide from Home Screen | ✅ Yes | Toggle | Immediate — no save required |
| Account Type | ❌ Locked | Display only | Shown for reference, greyed out |
| Currency | ❌ Locked | Display only | Shown for reference, greyed out |

> **Why Type and Currency are locked:** Changing account type post-creation could affect forecast logic and Weekly Review inclusion. Changing currency would invalidate all historical transaction records. Both are intentionally immutable after creation.

### 6.4 Toggle Behaviour

All three toggles (`include_in_cash_balance`, `include_in_review`, `show_on_iphone_home`) apply immediately on tap — no save action required. The change is written to the DB and reflected in the UI instantly.

The **Save Changes** button applies only to: Account Name and Card Colour.

### 6.5 Save Behaviour

- Save Changes button is **disabled** if Account Name field is empty
- On save:
  - Panel / screen closes
  - Account name updates immediately in: home card stack, cockpit grid header, any open timeline
  - Card colour updates immediately in: home card stack, cockpit grid header
  - No forecast recalculation triggered (name and colour are display-only)

### 6.6 Empty Name Guard

If the user clears the Account Name field entirely:
- Save button disables
- Placeholder text "Account name required" appears in the field
- Panel does not close until a valid name is entered

### 6.7 Locked Fields Display

Account Type and Currency are shown in the edit screen for reference but are visually greyed out and non-interactive. No tap target. No chevron.

```
  Account Type
  Current                            ← Grey text, no chevron, no interaction

  Currency
  GBP £                              ← Grey text, no chevron, no interaction
```

---

## 7. Hide from Home Screen

### 7.1 What It Does

`show_on_iphone_home = false` removes the account card from the iPhone home screen card stack.

It does **not** affect:
- The iPad cockpit grid (column always visible)
- The forecast / Budget calculations
- The Cash Balance total
- The Weekly Review sequence
- The Manage Accounts list

### 7.2 Visibility Matrix

| Location | `show_on_iphone_home = true` | `show_on_iphone_home = false` |
|---|---|---|
| iPhone home card stack | ✅ Visible | ❌ Hidden |
| iPad cockpit grid column | ✅ Visible | ✅ Visible |
| Cash Balance total | Follows `include_in_cash_balance` | Follows `include_in_cash_balance` |
| Weekly Review | Follows `include_in_review` | Follows `include_in_review` |
| Manage Accounts list | ✅ Visible | ✅ Visible |
| Account Order list | ✅ Visible | ✅ Visible |

### 7.3 Accessing a Hidden Account

A hidden account is accessible only via:
- **Settings → Manage Accounts → tap account row**

There is no "show hidden accounts" reveal toggle on the iPhone home screen. The account simply does not appear there.

### 7.4 Empty State Guard

If all accounts have `show_on_iphone_home = false`, the iPhone home screen shows:

```
┌─────────────────────────────────────┐
│  Oovy & Ray's Money          [+][⋯] │
│                                     │
│  Cash Balance                       │
│  £11,502.00                         │
│                                     │
│                                     │
│     All accounts are hidden.        │
│     Manage in Settings.             │
│                                     │
└─────────────────────────────────────┘
```

Cash Balance header still shows (it is calculated independently). The card stack area shows the empty state message.

### 7.5 UI Label

The toggle is labelled **"Hide from Home Screen"** with subtext **"iPhone only — iPad unaffected"**.

Toggle ON (green) = account is hidden from iPhone home.  
Toggle OFF (grey) = account is visible on iPhone home (default).

---

## 8. Archive Account

### 8.1 Trigger

Tap **"Archive Account"** (red text) at the bottom of the Account Edit screen.

### 8.2 Confirmation — Zero Balance

When `budget_balance = £0.00` (or NZ$0.00) at time of archive:

```
Archive "Monzo General"?

This account will be hidden from your home
screen and excluded from all totals.
You can unarchive it at any time.

[ Cancel ]        [ Archive ]
```

### 8.3 Confirmation — Non-Zero Balance

When account has a non-zero Budget balance at time of archive:

```
Archive "Monzo General"?

This account has a forecast balance of £2,340.00.

Archiving will hide it from your home screen
and exclude it from all totals. Any future
transactions will remain in the forecast but
will not be visible unless unarchived.

[ Cancel ]        [ Archive Anyway ]
```

### 8.4 On Archive Confirm

The following changes apply immediately:

| Effect | Detail |
|---|---|
| `is_archived = true` | Written to DB |
| iPhone home stack | Card removed |
| iPad cockpit grid | Column hidden |
| Cash Balance total | Account excluded |
| Weekly Review sequence | Account excluded |
| Manage Accounts | Account moves to Archived section at reduced opacity |
| Transactions | All historical and future transactions preserved in DB |
| Forecast data | Preserved — account reactivates cleanly if unarchived |

### 8.5 What Archive Does NOT Do

- Does not delete any transaction records
- Does not modify the forecast history
- Does not affect exchange rate calculations
- Does not remove the account from Account Order list (order preserved for if/when unarchived)

---

## 9. Unarchive Account

### 9.1 Trigger

Tap any account in the **Archived** section of the Manage Accounts screen → Account Edit screen opens → tap **"Unarchive Account"** (shown in place of Archive Account).

### 9.2 Confirmation

```
Unarchive "Monzo General"?

This account will reappear on your home
screen and be included in totals based
on its current toggle settings.

[ Cancel ]        [ Unarchive ]
```

### 9.3 On Unarchive Confirm

| Effect | Detail |
|---|---|
| `is_archived = false` | Written to DB |
| iPhone home stack | Card reappears at bottom of its currency group |
| iPad cockpit grid | Column reappears at rightmost position in its currency group |
| Cash Balance | Follows `include_in_cash_balance` toggle |
| Weekly Review | Follows `include_in_review` toggle |
| Manage Accounts | Account moves back to its currency group |

The user can reorder the account via Settings → Account Order after unarchiving.

---

## 10. Add New Account

### 10.1 Entry Point

Tap **[ + Add New Account ]** at the bottom of the Manage Accounts screen.

### 10.2 Behaviour

Opens the existing **Add Account Panel** as specced in UX Flow Spec v2.0 Section 16. No changes to that spec.

For reference, the Add Account Panel captures:
- Account Name (required)
- Currency (required — GBP or NZD)
- Account Type (Current / Savings / Credit / Tracking)
- Include in Cash Balance (toggle — auto-set by type, overridable)
- Include in Weekly Review (toggle — auto-set by type, overridable)
- Card Colour (gradient picker)

New accounts are created with `show_on_iphone_home = true` and `is_archived = false` by default.

---

## 11. Acceptance Criteria

### 11.1 Data Model

- [ ] `show_on_iphone_home BOOLEAN NOT NULL DEFAULT true` added to accounts table
- [ ] Migration applied without affecting existing account data
- [ ] All 15 production accounts seeded with `show_on_iphone_home = true`
- [ ] EXTERNAL account has `show_on_iphone_home = false` and is non-editable

### 11.2 iPhone Settings Screen

- [ ] Settings accessible via ⋯ → Side Menu → Settings
- [ ] All five sections present: Summary Target Date, Budget Comparison Date, Account Order, Manage Accounts, Exchange Rate
- [ ] Summary Target Date shows "Not set" when null
- [ ] Budget Comparison Date defaults to "Today (rolling)"
- [ ] Exchange Rate shows current rate, auto-fetch toggle, and last updated timestamp
- [ ] Tapping Manage Accounts navigates to Manage Accounts screen

### 11.3 iPad Settings Panel

- [ ] Settings opens as right-side slide-in panel — cockpit grid visible behind
- [ ] Panel contains Account Order only — no other settings
- [ ] GBP and NZD account groups separated by divider
- [ ] Cross-currency dragging not possible
- [ ] Cockpit grid columns reorder live as user drags
- [ ] Order persisted automatically on drop
- [ ] Tap outside panel or ✕ dismisses panel

### 11.4 Manage Accounts Screen

- [ ] Accessible from iPhone Settings only
- [ ] Accounts grouped by currency: GBP section then NZD section
- [ ] Each row shows gradient swatch, account name, chevron
- [ ] TRACKING accounts display `TRACKING` badge
- [ ] Archived section only visible when at least one archived account exists
- [ ] Archived accounts shown at 50% opacity
- [ ] EXTERNAL account never appears
- [ ] [ + Add New Account ] CTA at bottom opens Add Account Panel

### 11.5 Account Edit Screen

- [ ] Opens on tap of any account row in Manage Accounts
- [ ] Account Name is editable text field
- [ ] Card Colour gradient picker functional with live preview
- [ ] Include in Cash Balance toggle present and functional
- [ ] Include in Weekly Review toggle present and functional
- [ ] Hide from Home Screen toggle present and functional
- [ ] Account Type shown as locked/grey — no interaction
- [ ] Currency shown as locked/grey — no interaction
- [ ] Save Changes button disabled when Account Name is empty
- [ ] "Account name required" placeholder shown when field is cleared
- [ ] Save applies name and colour changes only
- [ ] Toggles apply immediately without Save

### 11.6 Hide from Home Screen

- [ ] Setting `show_on_iphone_home = false` removes card from iPhone home stack
- [ ] iPad cockpit grid column unaffected by this toggle
- [ ] Cash Balance total unaffected by this toggle
- [ ] Weekly Review sequence unaffected by this toggle
- [ ] Hidden accounts still visible and editable in Manage Accounts
- [ ] If all accounts hidden: iPhone home shows empty state with "Manage in Settings" message
- [ ] Toggle label: "Hide from Home Screen" / subtext: "iPhone only — iPad unaffected"
- [ ] Toggle ON (green) = hidden. Toggle OFF (grey) = visible.

### 11.7 Archive

- [ ] Archive option shown as red text at bottom of Account Edit screen
- [ ] Archive with zero balance shows simple confirmation dialog
- [ ] Archive with non-zero balance shows balance-aware confirmation with balance amount
- [ ] On confirm: `is_archived = true` written to DB
- [ ] Archived account removed from iPhone home stack
- [ ] Archived account column hidden from iPad cockpit grid
- [ ] Archived account excluded from Cash Balance
- [ ] Archived account excluded from Weekly Review
- [ ] Archived account moves to Archived section in Manage Accounts at 50% opacity
- [ ] All transactions for archived account preserved in DB
- [ ] Forecast data preserved

### 11.8 Unarchive

- [ ] Unarchive option shown in Account Edit screen for archived accounts
- [ ] Confirmation dialog shown before unarchiving
- [ ] On confirm: `is_archived = false` written to DB
- [ ] Account reappears on iPhone home stack at bottom of its currency group
- [ ] Account column reappears in iPad grid at rightmost position in its currency group
- [ ] Account returns to its currency group in Manage Accounts

### 11.9 Save Behaviour

- [ ] Name change reflects immediately on home card stack
- [ ] Name change reflects immediately on iPad cockpit grid column header
- [ ] Colour change reflects immediately on home card stack
- [ ] Colour change reflects immediately on iPad cockpit grid column header
- [ ] No forecast recalculation triggered by name or colour change

---

## 12. Component Checklist for Developer

New components / files required:

| File | Purpose |
|---|---|
| `/app/settings/page.tsx` | iPhone Settings full-screen |
| `/app/settings/manage-accounts/page.tsx` | Manage Accounts list screen |
| `/app/settings/manage-accounts/[id]/page.tsx` | Account Edit screen |
| `/app/settings/account-order/page.tsx` | Account Order drag screen (iPhone) |
| `/components/settings/SettingsPanel.tsx` | iPad right-side settings panel |
| `/components/settings/AccountOrderList.tsx` | Shared drag-to-reorder list (iPhone + iPad) |
| `/components/settings/AccountEditForm.tsx` | Shared account edit form fields |
| `/components/settings/GradientPicker.tsx` | Gradient colour picker (from/to) |
| `/components/settings/ArchiveConfirmSheet.tsx` | Archive confirmation bottom sheet |

Existing components that need updating:

| File | Change Required |
|---|---|
| `/components/accounts/AccountStack.tsx` | Filter by `show_on_iphone_home = true` |
| `/components/accounts/AccountCard.tsx` | No change required |
| `/components/grid/GridHeader.tsx` | Filter archived columns, respect `display_order` |
| `/hooks/useAccounts.ts` | Expose `updateAccount`, `archiveAccount`, `unarchiveAccount` mutations |
| `/lib/db/accounts.ts` | Add `show_on_iphone_home` to all account queries and updates |
