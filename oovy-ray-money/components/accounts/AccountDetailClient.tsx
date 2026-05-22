'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride } from '@/types'
import AccountCardDetail from '@/components/accounts/AccountCardDetail'
import TransactionTimeline from '@/components/transactions/TransactionTimeline'
import { fromDecimal } from '@/lib/utils/money'
import { calculateBudget } from '@/lib/forecast/engine'

interface AccountDetailClientProps {
  account: Account
  actualBalance: number
  budgetBalanceToday: number
  transactions: Transaction[]
  schedules: RecurringSchedule[]
  skips: RecurringSkip[]
  overrides: RecurringOverride[]
  accountNames: Map<string, string>
  allTransactions: Transaction[]
  allSchedules: RecurringSchedule[]
}

export default function AccountDetailClient({
  account,
  actualBalance,
  budgetBalanceToday,
  transactions,
  schedules,
  skips,
  overrides,
  accountNames,
  allTransactions,
  allSchedules,
}: AccountDetailClientProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [jumpToDate, setJumpToDate] = useState<Date | null>(null)
  const [budgetAtDate, setBudgetAtDate] = useState(budgetBalanceToday)
  const [comparisonLabel, setComparisonLabel] = useState('Today')

  const handleDateSelect = (dateStr: string) => {
    const date = new Date(dateStr)
    setJumpToDate(date)
    setShowDatePicker(false)

    // Recalculate budget at selected date
    const budget = calculateBudget(
      account,
      date,
      allTransactions,
      allSchedules,
      skips,
      overrides
    )
    setBudgetAtDate(fromDecimal(budget))

    const formatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    setComparisonLabel(formatted)
  }

  return (
    <main className="min-h-screen bg-[#f2f2f7] flex flex-col overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 sticky top-0 z-10 bg-[#f2f2f7]">
      <div className="h-[54px]" />
      <div className="flex items-center justify-between px-6 pb-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg hover:bg-black/10 transition-colors"
        >
          ‹
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-base hover:bg-black/10 transition-colors"
          >
            📅
          </button>
          <Link
            href={`/add?fromAccountId=${account.id}`}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg font-medium hover:bg-black/10 transition-colors"
          >
            +
          </Link>
          <button className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg hover:bg-black/10 transition-colors">
            ⋯
          </button>
        </div>
      </div>
      </div>

      {/* Date picker modal */}
      {showDatePicker && (
        <div className="absolute top-[100px] right-6 z-20 bg-white rounded-xl shadow-lg p-4 border border-black/10">
          <input
            type="date"
            onChange={(e) => handleDateSelect(e.target.value)}
            defaultValue={new Date().toISOString().split('T')[0]}
            min={account.opening_date}
            max={
              new Date(
                new Date().getFullYear() + 2,
                new Date().getMonth(),
                new Date().getDate()
              )
                .toISOString()
                .split('T')[0]
            }
            className="text-sm text-[#1c1c1e] border border-black/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      )}

      {/* Scrollable content */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Card detail */}
        <AccountCardDetail
          account={account}
          actualBalance={actualBalance}
          budgetBalance={budgetAtDate}
          lastUpdatedDate={account.opening_date}
          comparisonDateLabel={comparisonLabel}
        />

        {/* Divider */}
        <div className="h-px bg-black/8 mx-6 mb-2" />

        {/* Transaction Timeline */}
        <TransactionTimeline
          accountId={account.id}
          transactions={transactions}
          schedules={schedules}
          skips={skips}
          overrides={overrides}
          accountNames={accountNames}
          jumpToDate={jumpToDate}
        />
      </div>
    </main>
  )
}
