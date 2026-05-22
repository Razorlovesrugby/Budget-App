'use client'

import { memo } from 'react'
import type { RecurringSchedule, Currency } from '@/types'
import { getNextOccurrenceDate, formatNextOccurrence } from '@/lib/forecast/next-occurrence'
import { useRouter } from 'next/navigation'

interface RecurringListItemProps {
  schedule: RecurringSchedule
  fromAccountName: string
  toAccountName: string
  fromCurrency: Currency
}

const CURRENCY_PREFIX: Record<Currency, string> = {
  GBP: '£',
  NZD: 'NZ$',
}

const FREQUENCY_LABEL: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  BIANNUAL: 'Biannual',
}

const DAY_OF_WEEK_LABELS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

function getDayAnchor(schedule: RecurringSchedule): string {
  switch (schedule.frequency) {
    case 'WEEKLY':
      return schedule.day_of_week !== null
        ? DAY_OF_WEEK_LABELS[schedule.day_of_week]
        : ''
    case 'MONTHLY':
    case 'QUARTERLY':
    case 'BIANNUAL':
      return schedule.day_of_month !== null ? `${schedule.day_of_month}${ordinalSuffix(schedule.day_of_month)}` : ''
    case 'FORTNIGHTLY':
      return ''
    default:
      return ''
  }
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function formatAmount(amount: number, currency: Currency): string {
  const prefix = CURRENCY_PREFIX[currency]
  return `${prefix}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const RecurringListItem = memo(function RecurringListItem({
  schedule,
  fromAccountName,
  toAccountName,
  fromCurrency,
}: RecurringListItemProps) {
  const router = useRouter()
  const nextOccurrence = getNextOccurrenceDate(schedule)
  const nextLabel = formatNextOccurrence(nextOccurrence)

  // Determine the status label
  let statusLabel = nextLabel ? `Next: ${nextLabel}` : ''
  if (!schedule.is_active) {
    statusLabel = 'Paused'
  } else if (nextOccurrence === null) {
    statusLabel = 'Ended'
  }

  // Use from currency for the display amount
  const amountLabel = formatAmount(schedule.effective_changes[0]?.amount_from ?? 0, fromCurrency)

  // Day anchor
  const anchor = getDayAnchor(schedule)
  const metaParts: string[] = [amountLabel, FREQUENCY_LABEL[schedule.frequency] || schedule.frequency]
  if (anchor) metaParts.push(anchor)

  return (
    <button
      onClick={() => router.push(`/recurring/${schedule.id}/edit`)}
      className="w-full text-left bg-white rounded-[18px] px-5 py-4
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
        hover:bg-black/[0.01] transition-colors
        active:scale-[0.99] transition-transform"
    >
      {/* Name */}
      <p className="text-[16px] font-semibold text-[#1c1c1e] mb-0.5">
        {schedule.name || 'Untitled'}
      </p>

      {/* Meta: Amount · Frequency · Day anchor */}
      <p className="text-[14px] font-medium text-[#1c1c1e] mb-1">
        {metaParts.join(' · ')}
      </p>

      {/* From → To */}
      <p className="text-[13px] text-black/35 mb-1">
        {fromAccountName} → {toAccountName}
      </p>

      {/* Next occurrence / status */}
      <p className="text-[13px] text-black/35">
        {statusLabel}
      </p>
    </button>
  )
})

export default RecurringListItem
