'use client'

import { memo, useMemo, useRef, useEffect } from 'react'
import type {
  Transaction,
  RecurringSchedule,
  RecurringSkip,
  RecurringOverride,
} from '@/types'
import { generateOccurrences } from '@/lib/forecast/recurring'
import { parseDate, toDateString } from '@/lib/utils/dates'
import { addMonths } from 'date-fns'
import TransactionRow, { type TransactionUnion } from './TransactionRow'

interface TransactionTimelineProps {
  accountId: string
  transactions: Transaction[]
  schedules: RecurringSchedule[]
  skips: RecurringSkip[]
  overrides: RecurringOverride[]
  accountNames: Map<string, string>
  jumpToDate?: Date | null
}

const TransactionTimeline = memo(function TransactionTimeline({
  accountId,
  transactions,
  schedules,
  skips,
  overrides,
  accountNames,
  jumpToDate,
}: TransactionTimelineProps) {
  const todayRef = useRef<HTMLDivElement>(null)
  const jumpRef = useRef<HTMLDivElement>(null)
  const today = useMemo(() => new Date(), [])

  // Generate timeline: 18 months forward from today
  const endDate = addMonths(today, 18)

  // Build stored recurring keys for dedup
  const storedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const tx of transactions) {
      if (tx.type === 'RECURRING_INSTANCE' && tx.recurring_id) {
        keys.add(`${tx.recurring_id}:${tx.transaction_date}`)
      }
    }
    return keys
  }, [transactions])

  // Generate recurring occurrences
  const recurringOccurrences = useMemo(() => {
    const result: { date: string; occ: ReturnType<typeof generateOccurrences>[number] }[] = []
    for (const schedule of schedules) {
      const startDate = parseDate(schedule.start_date)
      const occs = generateOccurrences(
        schedule,
        startDate,
        endDate,
        skips.filter(s => s.recurring_id === schedule.id),
        overrides.filter(o => o.recurring_id === schedule.id)
      )
      for (const occ of occs) {
        const key = `${occ.recurring_id}:${toDateString(occ.date)}`
        if (!storedKeys.has(key)) {
          result.push({ date: toDateString(occ.date), occ })
        }
      }
    }
    return result
  }, [schedules, skips, overrides, endDate, storedKeys])

  // Build combined items grouped by date
  const { pastItems, futureItems } = useMemo(() => {
    // Stored transactions
    const txByDate = new Map<string, TransactionUnion[]>()
    for (const tx of transactions) {
      if (tx.type === 'OPENING') continue
      const date = tx.transaction_date
      if (!txByDate.has(date)) txByDate.set(date, [])
      txByDate.get(date)!.push({ kind: 'stored' as const, data: tx })
    }

    // Recurring occurrences
    for (const { date, occ } of recurringOccurrences) {
      if (!txByDate.has(date)) txByDate.set(date, [])
      txByDate.get(date)!.push({ kind: 'recurring' as const, data: occ })
    }

    // Sort dates and split past/future
    const allDates = Array.from(txByDate.keys()).sort()
    const todayStr = toDateString(today)

    const past: { date: string; items: TransactionUnion[] }[] = []
    const future: { date: string; items: TransactionUnion[] }[] = []

    for (const date of allDates) {
      const items = txByDate.get(date)!
      if (date < todayStr) {
        past.push({ date, items })
      } else {
        future.push({ date, items })
      }
    }

    return { pastItems: past, futureItems: future }
  }, [transactions, recurringOccurrences, today])

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const todayFormatted = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
  }, [])

  // Scroll to jump date when it changes
  useEffect(() => {
    if (jumpToDate && jumpRef.current) {
      jumpRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [jumpToDate])

  return (
    <div className="px-6 pb-8">
      {/* Section header */}
      <p className="text-[13px] font-semibold text-black/25 uppercase tracking-wide mb-2">
        Transactions
      </p>

      {/* Past transactions */}
      {pastItems.map(({ date, items }) => (
        <div key={date}>
          <p className="text-[11px] text-black/25 mt-1 mb-1">{formatDate(date)}</p>
          {items.map((item, i) => (
            <TransactionRow
              key={`${date}-${i}`}
              item={item}
              isFuture={false}
              viewingAccountId={accountId}
              accountNames={accountNames}
            />
          ))}
        </div>
      ))}

      {/* Today marker */}
      <div ref={todayRef} className="flex items-center gap-3 my-1">
        <hr className="flex-1 border-black/[0.12]" />
        <span className="text-[11px] font-semibold text-black/25 uppercase whitespace-nowrap">
          Today · {todayFormatted}
        </span>
        <hr className="flex-1 border-black/[0.12]" />
      </div>

      {/* Future transactions */}
      {futureItems.map(({ date, items }) => (
        <div key={date}>
          {/* Jump to date marker */}
          {jumpToDate && date === toDateString(jumpToDate) && (
            <div ref={jumpRef} className="flex items-center gap-3 my-2">
              <hr className="flex-1 border-black/[0.12]" />
              <span className="text-[11px] font-semibold text-black/25 uppercase whitespace-nowrap bg-black/5 px-2 py-0.5 rounded">
                {formatDate(date)}
              </span>
              <hr className="flex-1 border-black/[0.12]" />
            </div>
          )}
          <p className="text-[11px] text-black/25 mt-1 mb-1">{formatDate(date)}</p>
          {items.map((item, i) => (
            <TransactionRow
              key={`${date}-${i}`}
              item={item}
              isFuture
              viewingAccountId={accountId}
              accountNames={accountNames}
            />
          ))}
        </div>
      ))}

      {/* Empty state: no future transactions */}
      {futureItems.length === 0 && pastItems.length === 0 && (
        <p className="text-sm text-black/25 text-center py-8">
          No transactions yet
        </p>
      )}

      {/* Forecast note if only stored data */}
      {futureItems.length === 0 && schedules.length > 0 && (
        <p className="text-xs text-black/15 text-center mt-2">
          Forecast loading...
        </p>
      )}
    </div>
  )
})

export default TransactionTimeline
