'use client'

import { useMemo } from 'react'
import { toDecimal } from '@/lib/utils/money'
import { calculateAllBudgets } from '@/lib/forecast/engine'
import { parseDate } from '@/lib/utils/dates'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, Settings } from '@/types'

interface UseForecastInput {
  accounts: Account[]
  settings: Settings | null
  transactions: Transaction[]
  schedules: RecurringSchedule[]
  skips: RecurringSkip[]
  overrides: RecurringOverride[]
}

export function useForecast({ accounts, settings, transactions, schedules, skips, overrides }: UseForecastInput) {
  const comparisonDate = useMemo(() => {
    if (settings?.budget_comparison_date) return parseDate(settings.budget_comparison_date)
    return new Date()
  }, [settings?.budget_comparison_date])

  const allBudgets = useMemo(() => {
    if (!accounts.length) return new Map<string, ReturnType<typeof toDecimal>>()
    return calculateAllBudgets(accounts, comparisonDate, transactions, schedules, skips, overrides)
  }, [accounts, comparisonDate, transactions, schedules, skips, overrides])

  const { cashBalanceTotal, budgetTotal, variance } = useMemo(() => {
    const rate = settings?.exchange_rate_gbp_nzd
      ? toDecimal(settings.exchange_rate_gbp_nzd)
      : toDecimal(2.0)

    let cashGbp = toDecimal(0)
    let cashNzd = toDecimal(0)
    let budgetGbp = toDecimal(0)
    let budgetNzd = toDecimal(0)

    for (const acc of accounts) {
      if (!acc.include_in_cash_balance) continue
      if (acc.currency === 'GBP') {
        cashGbp = cashGbp.plus(toDecimal(acc.opening_balance))
        budgetGbp = budgetGbp.plus(allBudgets.get(acc.id) ?? toDecimal(acc.opening_balance))
      } else {
        cashNzd = cashNzd.plus(toDecimal(acc.opening_balance))
        budgetNzd = budgetNzd.plus(allBudgets.get(acc.id) ?? toDecimal(acc.opening_balance))
      }
    }

    const cashBalanceTotal = cashGbp.plus(cashNzd.div(rate))
    const budgetTotal = budgetGbp.plus(budgetNzd.div(rate))
    const variance = cashBalanceTotal.minus(budgetTotal)

    return { cashBalanceTotal, budgetTotal, variance }
  }, [accounts, allBudgets, settings?.exchange_rate_gbp_nzd])

  return { allBudgets, cashBalanceTotal, budgetTotal, variance, comparisonDate }
}
