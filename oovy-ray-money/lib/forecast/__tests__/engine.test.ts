import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { calculateBudget, calculateAllBudgets, getTimeline, getGrid } from '@/lib/forecast/engine'
import { toDateString } from '@/lib/utils/dates'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride } from '@/types'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Current',
    type: 'CURRENT',
    currency: 'GBP',
    include_in_cash_balance: true,
    include_in_review: true,
    show_on_iphone_home: true,
    opening_balance: 1000,
    opening_date: '2026-01-01',
    display_order: 1,
    color_from: '#000',
    color_to: '#fff',
    is_archived: false,
    is_system: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    name: 'Test',
    type: 'ONE_OFF',
    from_account_id: 'external',
    to_account_id: 'acc-1',
    amount_from: 200,
    amount_to: 200,
    currency_from: 'GBP',
    currency_to: 'GBP',
    transaction_date: '2026-05-15',
    recurring_id: null,
    is_adjustment: false,
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<RecurringSchedule> = {}): RecurringSchedule {
  return {
    id: 'sched-1',
    name: 'Monthly',
    from_account_id: 'external',
    to_account_id: 'acc-1',
    currency_from: 'GBP',
    currency_to: 'GBP',
    frequency: 'MONTHLY',
    day_of_week: null,
    day_of_month: 1,
    weekday_only: false,
    start_date: '2026-01-01',
    end_date: null,
    effective_changes: [{ effective_from: '2026-01-01', amount_from: 500, amount_to: 500 }],
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const NO_TX: Transaction[] = []
const NO_SCHEDULES: RecurringSchedule[] = []
const NO_SKIPS: RecurringSkip[] = []
const NO_OVERRIDES: RecurringOverride[] = []

describe('calculateBudget — no transactions', () => {
  it('returns opening balance when no transactions', () => {
    const account = makeAccount()
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      NO_TX, NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('1000')
  })

  it('negative opening balance (debt account)', () => {
    const account = makeAccount({ opening_balance: -500 })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      NO_TX, NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('-500')
  })
})

describe('calculateBudget — stored transactions', () => {
  it('CR increases budget', () => {
    const account = makeAccount()
    const tx = makeTx({ to_account_id: 'acc-1', from_account_id: 'external', amount_to: 200, transaction_date: '2026-05-15' })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('1200')
  })

  it('DR decreases budget', () => {
    const account = makeAccount()
    const tx = makeTx({ from_account_id: 'acc-1', to_account_id: 'external', amount_from: 200, transaction_date: '2026-05-15' })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('800')
  })

  it('DR larger than balance goes negative', () => {
    const account = makeAccount({ opening_balance: 100 })
    const tx = makeTx({ from_account_id: 'acc-1', to_account_id: 'external', amount_from: 300, transaction_date: '2026-01-15' })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('-200')
  })

  it('target date before transactions → opening balance', () => {
    const account = makeAccount()
    const tx = makeTx({ transaction_date: '2026-06-01' })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('1000')
  })

  it('target date exactly matching transaction date → included', () => {
    const account = makeAccount()
    const tx = makeTx({ to_account_id: 'acc-1', from_account_id: 'external', amount_to: 200, transaction_date: '2026-05-20' })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('1200')
  })

  it('OPENING type transaction excluded (no double-counting)', () => {
    const account = makeAccount({ opening_balance: 1000 })
    const openingTx = makeTx({
      type: 'OPENING',
      to_account_id: 'acc-1',
      from_account_id: 'external',
      amount_to: 1000,
      transaction_date: '2026-01-01',
    })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [openingTx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.toString()).toBe('1000')
  })

  it('CR before DR on same day — both applied correctly', () => {
    const account = makeAccount()
    const cr = makeTx({ id: 'tx-cr', to_account_id: 'acc-1', from_account_id: 'external', amount_to: 500, transaction_date: '2026-05-15' })
    const dr = makeTx({ id: 'tx-dr', from_account_id: 'acc-1', to_account_id: 'external', amount_from: 200, transaction_date: '2026-05-15' })
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [cr, dr], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    // 1000 + 500 - 200 = 1300
    expect(result.toString()).toBe('1300')
  })
})

describe('calculateBudget — recurring schedules', () => {
  it('recurring CR adds to budget', () => {
    const account = makeAccount()
    const schedule = makeSchedule({
      from_account_id: 'external',
      to_account_id: 'acc-1',
      start_date: '2026-01-01',
      day_of_month: 1,
      effective_changes: [{ effective_from: '2026-01-01', amount_from: 500, amount_to: 500 }],
    })
    // 5 months of £500 CR (Jan, Feb, Mar, Apr, May = 5 × 500 = 2500)
    const result = calculateBudget(
      account,
      new Date(2026, 4, 20),
      NO_TX, [schedule], NO_SKIPS, NO_OVERRIDES
    )
    expect(result.greaterThan(new Decimal('1000'))).toBe(true)
  })

  it('no double-counting: stored RECURRING_INSTANCE + schedule', () => {
    const account = makeAccount()
    const schedule = makeSchedule({
      id: 'sched-1',
      from_account_id: 'external',
      to_account_id: 'acc-1',
      start_date: '2026-05-01',
      day_of_month: 1,
      effective_changes: [{ effective_from: '2026-01-01', amount_from: 500, amount_to: 500 }],
    })
    const storedInstance = makeTx({
      type: 'RECURRING_INSTANCE',
      recurring_id: 'sched-1',
      to_account_id: 'acc-1',
      from_account_id: 'external',
      amount_to: 500,
      transaction_date: '2026-05-01',
    })
    const withStored = calculateBudget(
      account,
      new Date(2026, 4, 20),
      [storedInstance], [schedule], NO_SKIPS, NO_OVERRIDES
    )
    const withoutStored = calculateBudget(
      account,
      new Date(2026, 4, 20),
      NO_TX, [schedule], NO_SKIPS, NO_OVERRIDES
    )
    // Both approaches should yield same result — no double-counting
    expect(withStored.toString()).toBe(withoutStored.toString())
  })
})

describe('calculateAllBudgets', () => {
  it('returns map with balance for each account', () => {
    const acc1 = makeAccount({ id: 'acc-1', opening_balance: 1000 })
    const acc2 = makeAccount({ id: 'acc-2', opening_balance: 2000 })
    const result = calculateAllBudgets(
      [acc1, acc2],
      new Date(2026, 4, 20),
      NO_TX, NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(result.get('acc-1')?.toString()).toBe('1000')
    expect(result.get('acc-2')?.toString()).toBe('2000')
  })
})

describe('getTimeline', () => {
  it('returns one DailyBalance per day in range', () => {
    const account = makeAccount()
    const timeline = getTimeline(
      account,
      new Date(2026, 4, 1),
      new Date(2026, 4, 5),
      NO_TX, NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(timeline).toHaveLength(5)
    expect(toDateString(timeline[0].date)).toBe('2026-05-01')
    expect(toDateString(timeline[4].date)).toBe('2026-05-05')
  })

  it('includes days with no transactions (balance unchanged)', () => {
    const account = makeAccount()
    const timeline = getTimeline(
      account,
      new Date(2026, 4, 1),
      new Date(2026, 4, 3),
      NO_TX, NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(timeline[0].balance).toBe(1000)
    expect(timeline[1].balance).toBe(1000)
    expect(timeline[2].balance).toBe(1000)
  })

  it('balance updates on transaction day', () => {
    const account = makeAccount()
    const tx = makeTx({ to_account_id: 'acc-1', from_account_id: 'external', amount_to: 200, transaction_date: '2026-05-03' })
    const timeline = getTimeline(
      account,
      new Date(2026, 4, 1),
      new Date(2026, 4, 5),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(timeline[0].balance).toBe(1000) // May 1
    expect(timeline[1].balance).toBe(1000) // May 2
    expect(timeline[2].balance).toBe(1200) // May 3 — CR applied
    expect(timeline[3].balance).toBe(1200) // May 4
    expect(timeline[4].balance).toBe(1200) // May 5
  })

  it('transactions array populated on activity days', () => {
    const account = makeAccount()
    const tx = makeTx({ to_account_id: 'acc-1', from_account_id: 'external', amount_to: 200, transaction_date: '2026-05-02' })
    const timeline = getTimeline(
      account,
      new Date(2026, 4, 1),
      new Date(2026, 4, 3),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(timeline[0].transactions).toHaveLength(0)
    expect(timeline[1].transactions).toHaveLength(1)
    expect(timeline[2].transactions).toHaveLength(0)
  })
})

describe('getGrid', () => {
  it('returns correct structure: dates, accounts, balances map', () => {
    const account = makeAccount()
    const grid = getGrid(
      [account],
      new Date(2026, 4, 1),
      new Date(2026, 4, 5),
      NO_TX, NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )
    expect(grid.dates).toHaveLength(5)
    expect(grid.accounts).toHaveLength(1)
    expect(grid.balances.has('acc-1')).toBe(true)
    expect(grid.balances.get('acc-1')?.get('2026-05-01')).toBe(1000)
  })

  it('3 accounts × 5 days — all balances correct', () => {
    const acc1 = makeAccount({ id: 'acc-1', opening_balance: 1000 })
    const acc2 = makeAccount({ id: 'acc-2', opening_balance: 2000 })
    const acc3 = makeAccount({ id: 'acc-3', opening_balance: 500 })
    const tx = makeTx({ to_account_id: 'acc-2', from_account_id: 'external', amount_to: 300, transaction_date: '2026-05-03' })

    const grid = getGrid(
      [acc1, acc2, acc3],
      new Date(2026, 4, 1),
      new Date(2026, 4, 5),
      [tx], NO_SCHEDULES, NO_SKIPS, NO_OVERRIDES
    )

    // acc-1 unchanged
    expect(grid.balances.get('acc-1')?.get('2026-05-05')).toBe(1000)
    // acc-2 gets CR on May 3
    expect(grid.balances.get('acc-2')?.get('2026-05-02')).toBe(2000)
    expect(grid.balances.get('acc-2')?.get('2026-05-03')).toBe(2300)
    // acc-3 unchanged
    expect(grid.balances.get('acc-3')?.get('2026-05-05')).toBe(500)
  })
})
