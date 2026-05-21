import type { Account } from '@/types'
import { toDecimal, sum } from '@/lib/utils/money'
import { calculateBudget } from './engine'
import type { Transaction, RecurringSchedule, RecurringSkip, RecurringOverride } from '@/types'
import type { ReviewEntryData } from '@/lib/db/reviews'

export interface AccountProjection {
  accountId: string
  accountName: string
  currency: 'GBP' | 'NZD'
  type: string
  actualBalance: number     // Decimal-as-number
  projectedBalance: number  // Decimal-as-number
}

export interface CashBalanceProjection {
  currency: 'GBP' | 'NZD'
  actualTotal: number
  projectedTotal: number
}

export function calculateSummaryProjections(
  accounts: Account[],
  entries: ReviewEntryData[],
  targetDate: Date,
  storedTransactions: Transaction[],
  recurringSchedules: RecurringSchedule[],
  recurringSkips: RecurringSkip[],
  recurringOverrides: RecurringOverride[],
): {
  savingsProjections: AccountProjection[]
  cashBalanceProjections: CashBalanceProjection[]
} {
  const savingsProjections: AccountProjection[] = []

  // Build a map of accountId → review actual
  const actualMap = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.wasSkipped && entry.actualBalance !== null) {
      actualMap.set(entry.accountId, entry.actualBalance)
    }
  }

  // For each account, calculate forward projection
  for (const account of accounts) {
    const actual = actualMap.get(account.id) ?? account.opening_balance

    const projected = calculateBudget(
      account,
      targetDate,
      storedTransactions,
      recurringSchedules,
      recurringSkips,
      recurringOverrides,
    )

    savingsProjections.push({
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      type: account.type,
      actualBalance: actual,
      projectedBalance: projected.toDecimalPlaces(2).toNumber(),
    })
  }

  // Calculate cash balance totals by currency
  const gbpActuals = savingsProjections
    .filter(p => p.currency === 'GBP')
    .map(p => toDecimal(p.actualBalance))
  const gbpProjected = savingsProjections
    .filter(p => p.currency === 'GBP')
    .map(p => toDecimal(p.projectedBalance))
  const nzdActuals = savingsProjections
    .filter(p => p.currency === 'NZD')
    .map(p => toDecimal(p.actualBalance))
  const nzdProjected = savingsProjections
    .filter(p => p.currency === 'NZD')
    .map(p => toDecimal(p.projectedBalance))

  const cashBalanceProjections: CashBalanceProjection[] = [
    {
      currency: 'GBP',
      actualTotal: sum(gbpActuals).toDecimalPlaces(2).toNumber(),
      projectedTotal: sum(gbpProjected).toDecimalPlaces(2).toNumber(),
    },
    {
      currency: 'NZD',
      actualTotal: sum(nzdActuals).toDecimalPlaces(2).toNumber(),
      projectedTotal: sum(nzdProjected).toDecimalPlaces(2).toNumber(),
    },
  ]

  return { savingsProjections, cashBalanceProjections }
}
