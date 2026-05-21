import Decimal from 'decimal.js'
import type {
  Account,
  Transaction,
  RecurringSchedule,
  RecurringSkip,
  RecurringOverride,
  DailyBalance,
  GridData,
} from '@/types'
import { toDecimal, fromDecimal } from '@/lib/utils/money'
import { parseDate, toDateString, isOnOrBefore, isOnOrAfter } from '@/lib/utils/dates'
import { generateOccurrences, type RecurringOccurrence } from './recurring'
import { addDays } from 'date-fns'

// Build a set of "recurring_id:date" keys for stored RECURRING_INSTANCE transactions
// to prevent double-counting when the occurrence generator also covers those dates.
function buildStoredRecurringKeys(transactions: Transaction[]): Set<string> {
  const keys = new Set<string>()
  for (const tx of transactions) {
    if (tx.type === 'RECURRING_INSTANCE' && tx.recurring_id) {
      keys.add(`${tx.recurring_id}:${tx.transaction_date}`)
    }
  }
  return keys
}

function applyOccurrencesToBalance(
  balance: Decimal,
  accountId: string,
  occurrences: RecurringOccurrence[]
): Decimal {
  let b = balance
  // CR first
  for (const occ of occurrences) {
    if (occ.to_account_id === accountId) {
      b = b.plus(occ.amount_to)
    }
  }
  // then DR
  for (const occ of occurrences) {
    if (occ.from_account_id === accountId) {
      b = b.minus(occ.amount_from)
    }
  }
  return b
}

function applyTransactionsToBalance(
  balance: Decimal,
  accountId: string,
  transactions: Transaction[]
): Decimal {
  let b = balance
  // CR first
  for (const tx of transactions) {
    if (tx.to_account_id === accountId) {
      b = b.plus(toDecimal(tx.amount_to))
    }
  }
  // then DR
  for (const tx of transactions) {
    if (tx.from_account_id === accountId) {
      b = b.minus(toDecimal(tx.amount_from))
    }
  }
  return b
}

export function calculateBudget(
  account: Account,
  targetDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): Decimal {
  const openingDate = parseDate(account.opening_date)
  let balance = toDecimal(account.opening_balance)

  // Filter stored transactions up to and including targetDate
  // Exclude OPENING type — opening_balance already covers it
  const relevantTx = storedTransactions.filter(tx => {
    if (tx.type === 'OPENING') return false
    const txDate = parseDate(tx.transaction_date)
    return isOnOrBefore(txDate, targetDate) && isOnOrAfter(txDate, openingDate)
  })

  // Apply stored transactions (CR before DR within day handled at daily level here is aggregate)
  balance = applyTransactionsToBalance(balance, account.id, relevantTx)

  // Build stored recurring keys to skip duplicate generation
  const storedKeys = buildStoredRecurringKeys(relevantTx)

  // Generate recurring occurrences for relevant schedules
  const relevantSchedules = recurringSchedules.filter(
    s => s.from_account_id === account.id || s.to_account_id === account.id
  )

  for (const schedule of relevantSchedules) {
    const occurrences = generateOccurrences(
      schedule,
      openingDate,
      targetDate,
      recurringSkips.filter(s => s.recurring_id === schedule.id),
      recurringOverrides.filter(o => o.recurring_id === schedule.id)
    )
    const nonDuplicate = occurrences.filter(
      occ => !storedKeys.has(`${occ.recurring_id}:${toDateString(occ.date)}`)
    )
    balance = applyOccurrencesToBalance(balance, account.id, nonDuplicate)
  }

  return balance
}

export function calculateAllBudgets(
  accounts: Account[],
  targetDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): Map<string, Decimal> {
  const result = new Map<string, Decimal>()
  for (const account of accounts) {
    result.set(
      account.id,
      calculateBudget(account, targetDate, storedTransactions, recurringSchedules, recurringSkips, recurringOverrides)
    )
  }
  return result
}

export function getTimeline(
  account: Account,
  startDate: Date,
  endDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): DailyBalance[] {
  const openingDate = parseDate(account.opening_date)

  // Pre-compute all occurrences up to endDate for this account
  const relevantSchedules = recurringSchedules.filter(
    s => s.from_account_id === account.id || s.to_account_id === account.id
  )
  const allOccurrences: RecurringOccurrence[] = []
  for (const schedule of relevantSchedules) {
    const occs = generateOccurrences(
      schedule,
      openingDate,
      endDate,
      recurringSkips.filter(s => s.recurring_id === schedule.id),
      recurringOverrides.filter(o => o.recurring_id === schedule.id)
    )
    allOccurrences.push(...occs)
  }

  const storedKeys = buildStoredRecurringKeys(storedTransactions)
  const dedupedOccurrences = allOccurrences.filter(
    occ => !storedKeys.has(`${occ.recurring_id}:${toDateString(occ.date)}`)
  )

  // Build lookup maps keyed by date string
  const txByDate = new Map<string, Transaction[]>()
  for (const tx of storedTransactions) {
    if (tx.type === 'OPENING') continue
    const txDate = parseDate(tx.transaction_date)
    if (!isOnOrAfter(txDate, openingDate)) continue
    const key = toDateString(txDate)
    if (!txByDate.has(key)) txByDate.set(key, [])
    txByDate.get(key)!.push(tx)
  }

  const occByDate = new Map<string, RecurringOccurrence[]>()
  for (const occ of dedupedOccurrences) {
    const key = toDateString(occ.date)
    if (!occByDate.has(key)) occByDate.set(key, [])
    occByDate.get(key)!.push(occ)
  }

  // Running balance from opening up to startDate-1
  let runningBalance = toDecimal(account.opening_balance)
  let cursor = openingDate

  while (isOnOrBefore(cursor, startDate) && !isOnOrAfter(cursor, startDate)) {
    const key = toDateString(cursor)
    const dayTx = txByDate.get(key) ?? []
    const dayOcc = occByDate.get(key) ?? []
    runningBalance = applyTransactionsToBalance(runningBalance, account.id, dayTx)
    runningBalance = applyOccurrencesToBalance(runningBalance, account.id, dayOcc)
    cursor = addDays(cursor, 1)
  }

  // Now walk day by day through the requested range
  const timeline: DailyBalance[] = []
  let day = startDate

  while (isOnOrBefore(day, endDate)) {
    const key = toDateString(day)
    const dayTx = txByDate.get(key) ?? []
    const dayOcc = occByDate.get(key) ?? []

    runningBalance = applyTransactionsToBalance(runningBalance, account.id, dayTx)
    runningBalance = applyOccurrencesToBalance(runningBalance, account.id, dayOcc)

    timeline.push({
      date: day,
      balance: fromDecimal(runningBalance),
      transactions: dayTx,
    })

    day = addDays(day, 1)
  }

  return timeline
}

export function getGrid(
  accounts: Account[],
  startDate: Date,
  endDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[]
): GridData {
  const dates: Date[] = []
  let d = startDate
  while (isOnOrBefore(d, endDate)) {
    dates.push(d)
    d = addDays(d, 1)
  }

  const balances = new Map<string, Map<string, number>>()

  for (const account of accounts) {
    const timeline = getTimeline(
      account,
      startDate,
      endDate,
      storedTransactions,
      recurringSchedules,
      recurringSkips,
      recurringOverrides
    )
    const accountMap = new Map<string, number>()
    for (const day of timeline) {
      accountMap.set(toDateString(day.date), day.balance)
    }
    balances.set(account.id, accountMap)
  }

  return { dates, accounts, balances }
}
