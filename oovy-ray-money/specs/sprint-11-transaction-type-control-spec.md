# Spec 11 — Transaction Type Segmented Control

**Project:** Oovy Ray  
**Spec Version:** 11  
**Status:** Approved  
**Last Updated:** 22 May 2026  

---

## 1. Overview

The Add Transaction panel uses a **three-way segmented control** to define transaction direction. This replaces the previous `[DR] [CR]` toggle and completely abstracts the External account from the user.

The user never sees, selects, or interacts with "External" directly. The app wires it automatically based on the selected mode.

---

## 2. Segmented Control

```
[ Income ]  [ Expense ]  [ Transfer ]
```

### 2.1 Mode Behaviour

| Mode | `from_account_id` | `to_account_id` | Fields Shown |
|---|---|---|---|
| **Income** | `EXTERNAL` (auto, hidden) | User picks destination account | "Into Account" + Amount |
| **Expense** | User picks source account | `EXTERNAL` (auto, hidden) | "From Account" + Amount |
| **Transfer** | User picks source account | User picks destination account | "From" + "To" + Amount (+ cross-currency fields if applicable) |

---

## 3. Panel Layout by Mode

### 3.1 Income Mode

```
┌────────────────────────────────┐
│ Add Transaction            [✕] │
│────────────────────────────────│
│ [Income ✓]  [Expense]  [Transfer] │
│────────────────────────────────│
│  £0.00_                        │
│                                │
│ Into Account                   │
│ [Select account              ›]│
│                                │
│ Date                           │
│ [Today, 22 May 2026          ›]│
│                                │
│ Recurring      [toggle OFF]    │
│                                │
│ Name (optional) [e.g. Salary ›]│
│                                │
│ [    Add Transaction    ]      │
└────────────────────────────────┘
```

### 3.2 Expense Mode

```
┌────────────────────────────────┐
│ Add Transaction            [✕] │
│────────────────────────────────│
│ [Income]  [Expense ✓]  [Transfer] │
│────────────────────────────────│
│  £0.00_                        │
│                                │
│ From Account                   │
│ [Select account              ›]│
│                                │
│ Date                           │
│ [Today, 22 May 2026          ›]│
│                                │
│ Recurring      [toggle OFF]    │
│                                │
│ Name (optional) [e.g. Rent   ›]│
│                                │
│ [    Add Transaction    ]      │
└────────────────────────────────┘
```

### 3.3 Transfer Mode

```
┌────────────────────────────────┐
│ Add Transaction            [✕] │
│────────────────────────────────│
│ [Income]  [Expense]  [Transfer ✓] │
│────────────────────────────────│
│  £0.00_                        │
│                                │
│ From Account                   │
│ [Select account              ›]│
│                                │
│ To Account                     │
│ [Select account              ›]│
│                                │
│ Date                           │
│ [Today, 22 May 2026          ›]│
│                                │
│ Recurring      [toggle OFF]    │
│                                │
│ Name (optional)  [           ›]│
│                                │
│ [    Add Transaction    ]      │
└────────────────────────────────┘
```

---

## 4. Default Mode on Open

| Entry Point | Default Mode | Pre-filled Fields |
|---|---|---|
| Side menu `+` (clean slate) | Expense | None |
| Grid cell tap — known expense account (Bills, Rent) | Expense | From = tapped account |
| Grid cell tap — general/savings account | Transfer | From = tapped account |
| No column context | Expense | None |

> Pre-fill is a convenience, not a constraint. The user can switch mode freely at any time.

---

## 5. Account Picker — Exclusion Rules

| Mode | Picker | Accounts Shown |
|---|---|---|
| Income | "Into Account" | All accounts except EXTERNAL |
| Expense | "From Account" | All accounts except EXTERNAL |
| Transfer | "From Account" | All accounts except EXTERNAL |
| Transfer | "To Account" | All accounts except EXTERNAL, and excluding the currently selected From account |

> **Rule:** External never appears in any picker, in any mode, under any circumstance.

---

## 6. Mode-Switch Behaviour Mid-Entry

When the user switches mode after already filling in fields:

- **Amount** → retained
- **Date** → retained
- **Name** → retained
- **Account selections** → cleared

> Rationale: account context is mode-specific. An account selected as "From" in Expense mode has no safe default meaning in Income or Transfer mode. Clearing is the safest, most predictable behaviour.

---

## 7. Cross-Currency Fields (Transfer Mode)

If the selected From and To accounts are in different currencies, a second amount field appears automatically:

```
│ Amount Out   £450.00_          │
│ Amount In    NZ$_              │  ← appears when currencies differ
```

This behaviour is unchanged from the existing cross-currency spec (see UX Flow Spec v2, Section 13.5). It applies only in Transfer mode.

---

## 8. Recurring Toggle

The Recurring toggle and its expanded frequency options behave identically across all three modes. No mode-specific changes to recurring behaviour.

---

## 9. How Salary Gets Created — End-to-End User Flow

1. User taps `+` in side menu
2. Panel opens — default mode: **Expense**
3. User taps **Income** segment
4. "Into Account" picker appears
5. User selects **Monzo General**
6. User enters amount: `£3,879.18`
7. User turns Recurring **ON**
   - Frequency: Monthly
   - Day of month: 14th
   - Weekday only: ON (moves to Friday if 14th falls on weekend)
8. User enters name: `Salary (Ray)`
9. User taps **Add Transaction**
10. App writes transaction record:
    - `from_account_id` = `EXTERNAL_UUID` (system fixed UUID)
    - `to_account_id` = `monzo_general_uuid`
    - `type` = CR
    - `amount` = 3879.18
    - `currency` = GBP
    - `is_recurring` = true

---

## 10. Timeline Display

| Transaction Mode | Prefix | Amount Style | Example |
|---|---|---|---|
| Income | `←` | Plain, brighter | `← Salary (Ray)   +£3,879.18` |
| Expense | `→` | Muted | `→ Rent   -£1,800.00` |
| Transfer (internal) | `→` | Muted | `→ Monzo Spending   -£200.00` |

---

## 11. Data Layer — No Schema Changes Required

This spec introduces no new database fields. The segmented control is purely a UI abstraction over the existing `from_account_id` / `to_account_id` fields on the `transactions` and `recurring_schedules` tables.

The External account UUID is already seeded at setup and referenced at write time by the app layer, not the user.

---

## 12. Acceptance Criteria

- [ ] Segmented control has exactly three segments: **Income / Expense / Transfer**
- [ ] Default mode on clean-slate open (side menu `+`): **Expense**
- [ ] Default mode when opened from grid cell: inferred from account type per Section 4
- [ ] Income mode shows single "Into Account" picker; `from_account_id` auto-set to `EXTERNAL_UUID`
- [ ] Expense mode shows single "From Account" picker; `to_account_id` auto-set to `EXTERNAL_UUID`
- [ ] Transfer mode shows both From and To pickers; To excludes the selected From account
- [ ] External account never appears in any account picker in any mode
- [ ] Switching mode mid-entry clears account selections, retains amount / date / name
- [ ] Cross-currency second amount field appears in Transfer mode when currencies differ
- [ ] Recurring toggle and frequency options work identically in all three modes
- [ ] On save, `from_account_id` and `to_account_id` are correctly set based on mode
- [ ] Timeline renders `←` for Income, `→` for Expense and Transfer
- [ ] No schema migration required — External UUID referenced from existing seed data

---

## 13. Open Question

**Pending decision:** When a user switches from Transfer → Income mid-entry and a "From" account was already selected — should the app:

- **(A) Clear all account selections** ← current spec default
- **(B) Carry the selected account forward as the "Into Account"** if it's a valid destination

Decision required before developer handoff.
