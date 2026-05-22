'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, Settings } from '@/types'
import { toDecimal, fromDecimal } from '@/lib/utils/money'
import { calculateAllBudgets } from '@/lib/forecast/engine'
import { parseDate } from '@/lib/utils/dates'
import AmountDisplay from '@/components/ui/AmountDisplay'
import AccountStack from '@/components/accounts/AccountStack'
import { HomeMenuButton } from '@/components/ui/HomeMenuButton'

interface IPhoneHomeProps {
  accounts: Account[]
  settings: Settings
  transactions: Transaction[]
  schedules: RecurringSchedule[]
  skips: RecurringSkip[]
  overrides: RecurringOverride[]
}

export default function IPhoneHome({
  accounts,
  settings,
  transactions,
  schedules,
  skips,
  overrides,
}: IPhoneHomeProps) {
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

  const actualBalances = useMemo(() => {
    const rec: Record<string, number> = {}
    for (const acc of accounts) rec[acc.id] = acc.opening_balance
    return rec
  }, [accounts])

  const budgetBalances = useMemo(() => {
    const rec: Record<string, number> = {}
    for (const acc of accounts) {
      rec[acc.id] = fromDecimal(allBudgets.get(acc.id) ?? toDecimal(acc.opening_balance))
    }
    return rec
  }, [accounts, allBudgets])

  const lastUpdatedDates = useMemo(() => {
    const rec: Record<string, string> = {}
    for (const acc of accounts) rec[acc.id] = acc.opening_date
    return rec
  }, [accounts])

  if (!accounts || accounts.length === 0) {
    return (
      <main className="min-h-screen bg-[#f2f2f7] flex flex-col">
        <div className="h-[54px]" />
        <div className="flex items-center justify-between px-6 mb-6">
          <h1 className="text-[28px] font-bold tracking-[-0.8px] text-[#1c1c1e]">
            Oovy &amp; Ray&apos;s Money
          </h1>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg font-medium">+</button>
            <button className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg">⋯</button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-black/25">No accounts yet</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f2f2f7] flex flex-col overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 sticky top-0 z-10 bg-[#f2f2f7]">
        <div className="h-[54px]" />

        <div className="flex items-center justify-between px-6 mb-2">
          <h1 className="text-[28px] font-bold tracking-[-0.8px] text-[#1c1c1e] leading-tight">
            Oovy &amp; Ray&apos;s Money
          </h1>
          <div className="flex gap-2">
            <Link
              href="/add"
              className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg font-medium hover:bg-black/10 transition-colors"
            >
              +
            </Link>
            <HomeMenuButton />
          </div>
        </div>

        <div className="px-6 pb-3">
          <p className="text-[11px] font-medium text-black/25 uppercase tracking-wide">
            Cash Balance
          </p>
          <AmountDisplay
            amount={fromDecimal(cashBalanceTotal)}
            currency="GBP"
            variant="plain"
            size="xl"
          />
          <div className="flex gap-6 mt-1">
            <div>
              <span className="text-[15px] text-black/45 mr-1">Budget</span>
              <AmountDisplay
                amount={fromDecimal(budgetTotal)}
                currency="GBP"
                variant="plain"
                size="md"
              />
            </div>
            <div>
              <span className="text-[15px] text-black/45 mr-1">Variance</span>
              <AmountDisplay
                amount={fromDecimal(variance)}
                currency="GBP"
                variant="variance"
                size="md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable card stack */}
      <div className="flex-1 min-h-0">
        <AccountStack
          accounts={accounts}
          actualBalances={actualBalances}
          budgetBalances={budgetBalances}
          lastUpdatedDates={lastUpdatedDates}
        />
      </div>
    </main>
  )
}
