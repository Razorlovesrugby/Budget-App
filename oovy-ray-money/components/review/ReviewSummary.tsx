'use client'

import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride } from '@/types'
import type { ReviewEntryData } from '@/lib/db/reviews'
import { calculateSummaryProjections } from '@/lib/forecast/projection'

interface ReviewSummaryProps {
  entries: ReviewEntryData[]
  accounts: Account[]
  summaryTargetDate: string | null    // From Settings
  storedTransactions: Transaction[]
  recurringSchedules: RecurringSchedule[]
  recurringSkips: RecurringSkip[]
  recurringOverrides: RecurringOverride[]
  onDone: () => void
}

export default function ReviewSummary({
  entries,
  accounts,
  summaryTargetDate,
  storedTransactions,
  recurringSchedules,
  recurringSkips,
  recurringOverrides,
  onDone,
}: ReviewSummaryProps) {
  const prefix = (currency: string) => currency === 'NZD' ? 'NZ$' : '£'

  function formatAmount(n: number, currency: string): string {
    const formatted = Math.abs(n).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${prefix(currency)}${formatted}`
  }

  // Filter to only accounts that have entries (were reviewed)
  const entryAccountIds = new Set(entries.map(e => e.accountId))
  const reviewedAccounts = accounts.filter(a => entryAccountIds.has(a.id))

  // Build a map of accountId → entry
  const entryMap = new Map<string, ReviewEntryData>()
  for (const entry of entries) {
    entryMap.set(entry.accountId, entry)
  }

  // Group accounts by type
  const savingsAccounts = reviewedAccounts.filter(a => a.type === 'SAVINGS')

  // Get actual balances for each reviewed account
  function getActualBalance(accountId: string): number {
    const entry = entryMap.get(accountId)
    if (!entry || entry.wasSkipped || entry.actualBalance === null) {
      const account = accounts.find(a => a.id === accountId)
      return account?.opening_balance ?? 0
    }
    return entry.actualBalance
  }

  let hasProjections = false
  const savingsRows: { account: Account; actual: number; projected: number | null }[] = []
  let gbpTotalActual = 0
  let gbpTotalProjected = 0
  let nzdTotalActual = 0
  let nzdTotalProjected = 0

  if (summaryTargetDate) {
    const targetDate = new Date(summaryTargetDate)
    const { savingsProjections, cashBalanceProjections } = calculateSummaryProjections(
      reviewedAccounts,
      entries,
      targetDate,
      storedTransactions,
      recurringSchedules,
      recurringSkips,
      recurringOverrides,
    )

    hasProjections = true

    // Build savings rows with projections
    for (const proj of savingsProjections) {
      if (proj.type === 'SAVINGS') {
        savingsRows.push({
          account: accounts.find(a => a.id === proj.accountId)!,
          actual: proj.actualBalance,
          projected: proj.projectedBalance,
        })
      }
    }

    // Cash balance totals
    for (const cp of cashBalanceProjections) {
      if (cp.currency === 'GBP') {
        gbpTotalActual = cp.actualTotal
        gbpTotalProjected = cp.projectedTotal
      } else {
        nzdTotalActual = cp.actualTotal
        nzdTotalProjected = cp.projectedTotal
      }
    }
  } else {
    // No target date — compute simple cash balance totals
    for (const account of reviewedAccounts) {
      const actual = getActualBalance(account.id)
      if (account.currency === 'GBP') {
        gbpTotalActual += actual
      } else {
        nzdTotalActual += actual
      }
    }

    // Savings rows without projections
    for (const account of savingsAccounts) {
      savingsRows.push({
        account,
        actual: getActualBalance(account.id),
        projected: null,
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      {/* Safe area */}
      <div className="h-[54px] shrink-0" />

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 overflow-y-auto">
        {/* Checkmark */}
        <div className="flex justify-center mt-8 mb-4">
          <div className="w-[52px] h-[52px] rounded-full bg-[#34c759]/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M7 14.5L12 19.5L21 9"
                stroke="#34c759"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-[28px] font-bold text-[#1c1c1e] text-center mb-1">
          Review Complete
        </h2>

        {summaryTargetDate && (
          <p className="text-[14px] text-black/30 text-center mb-6">
            Projected at{' '}
            {new Date(summaryTargetDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
        {!summaryTargetDate && (
          <p className="text-[13px] text-black/20 text-center mb-6">
            Set a target date in Settings to see projections
          </p>
        )}

        {/* Savings Accounts */}
        {savingsRows.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/25 text-center mb-3">
              Savings Accounts
            </p>

            {savingsRows.map((row) => (
              <div
                key={row.account.id}
                className="bg-white rounded-[18px] p-[18px_20px] mb-2 shadow-sm"
              >
                <p className="text-[14px] font-semibold text-black/50 mb-1">
                  {row.account.name}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] text-black/30 tabular-nums">
                    {formatAmount(row.actual, row.account.currency)}
                  </span>
                  {row.projected !== null && (
                    <>
                      <span className="text-[13px] text-black/20">→</span>
                      <span className="text-[15px] font-bold text-[#1c1c1e] tabular-nums">
                        {formatAmount(row.projected, row.account.currency)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Cash Balance */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/25 text-center mt-6 mb-3">
          Cash Balance
        </p>

        {/* GBP Total */}
        <div className={`rounded-[18px] p-[18px_20px] mb-2 ${hasProjections ? 'bg-black/[0.03]' : 'bg-white shadow-sm'}`}>
          <p className="text-[14px] font-semibold text-black/50 mb-1">
            Total GBP
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] text-black/30 tabular-nums">
              {formatAmount(gbpTotalActual, 'GBP')}
            </span>
            {hasProjections && (
              <>
                <span className="text-[13px] text-black/20">→</span>
                <span className="text-[15px] font-bold text-[#1c1c1e] tabular-nums">
                  {formatAmount(gbpTotalProjected, 'GBP')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* NZD Total */}
        <div className={`rounded-[18px] p-[18px_20px] mb-8 ${hasProjections ? 'bg-black/[0.03]' : 'bg-white shadow-sm'}`}>
          <p className="text-[14px] font-semibold text-black/50 mb-1">
            Total NZD
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] text-black/30 tabular-nums">
              {formatAmount(nzdTotalActual, 'NZD')}
            </span>
            {hasProjections && (
              <>
                <span className="text-[13px] text-black/20">→</span>
                <span className="text-[15px] font-bold text-[#1c1c1e] tabular-nums">
                  {formatAmount(nzdTotalProjected, 'NZD')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Done Button */}
      <div className="px-6 pb-8">
        <button
          onClick={onDone}
          className="w-full h-[58px] rounded-[18px] text-[17px] font-bold text-white
            bg-[#1c1c1e] hover:bg-black/90 transition-colors
            active:scale-[0.98] transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  )
}
