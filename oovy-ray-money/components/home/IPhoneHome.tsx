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

  const comparisonDate = settings?.budget_comparison_date
    ? parseDate(settings.budget_comparison_date)
    : new Date()

  let cashBalanceGbp = toDecimal(0)
  let cashBalanceNzd = toDecimal(0)

  for (const acc of accounts) {
    if (!acc.include_in_cash_balance) continue
    if (acc.currency === 'GBP') {
      cashBalanceGbp = cashBalanceGbp.plus(toDecimal(acc.opening_balance))
    } else {
      cashBalanceNzd = cashBalanceNzd.plus(toDecimal(acc.opening_balance))
    }
  }

  const rate = settings?.exchange_rate_gbp_nzd
    ? toDecimal(settings.exchange_rate_gbp_nzd)
    : toDecimal(2.0)

  const cashBalanceTotal = cashBalanceGbp.plus(cashBalanceNzd.div(rate))

  const allBudgets = calculateAllBudgets(
    accounts,
    comparisonDate,
    transactions,
    schedules,
    skips,
    overrides
  )

  let budgetTotalGbp = toDecimal(0)
  let budgetTotalNzd = toDecimal(0)

  for (const acc of accounts) {
    if (!acc.include_in_cash_balance) continue
    const budget = allBudgets.get(acc.id) ?? toDecimal(acc.opening_balance)
    if (acc.currency === 'GBP') {
      budgetTotalGbp = budgetTotalGbp.plus(budget)
    } else {
      budgetTotalNzd = budgetTotalNzd.plus(budget)
    }
  }

  const budgetTotal = budgetTotalGbp.plus(budgetTotalNzd.div(rate))
  const variance = cashBalanceTotal.minus(budgetTotal)

  const actualBalances = new Map<string, number>()
  const budgetBalances = new Map<string, number>()
  const lastUpdatedDates = new Map<string, string>()

  for (const acc of accounts) {
    actualBalances.set(acc.id, acc.opening_balance)
    const budget = allBudgets.get(acc.id) ?? toDecimal(acc.opening_balance)
    budgetBalances.set(acc.id, fromDecimal(budget))
    lastUpdatedDates.set(acc.id, acc.opening_date)
  }

  return (
    <main className="min-h-screen bg-[#f2f2f7] flex flex-col overflow-hidden">
      <div className="h-[54px] shrink-0" />

      <div className="flex items-center justify-between px-6 mb-2 shrink-0">
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

      <div className="px-6 pb-3 shrink-0">
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
