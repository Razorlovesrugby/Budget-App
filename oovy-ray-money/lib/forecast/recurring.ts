import Decimal from 'decimal.js'
import type { RecurringSchedule, RecurringSkip, RecurringOverride, Currency } from '@/types'
import { toDecimal } from '@/lib/utils/money'
import {
  nextOccurrenceDate,
  applyWeekdayRule,
  isOnOrBefore,
  isOnOrAfter,
  parseDate,
  toDateString,
} from '@/lib/utils/dates'
import { getEffectiveAmounts } from './effective-amount'

export interface RecurringOccurrence {
  date: Date
  amount_from: Decimal
  amount_to: Decimal
  from_account_id: string
  to_account_id: string
  currency_from: Currency
  currency_to: Currency
  recurring_id: string
  name: string | null
}

export function getFirstOccurrence(schedule: RecurringSchedule): Date {
  const start = parseDate(schedule.start_date)
  return applyWeekdayRule(start, schedule.weekday_only)
}

export function getNextOccurrence(schedule: RecurringSchedule, afterDate: Date): Date | null {
  if (!schedule.is_active) return null

  const raw = nextOccurrenceDate(
    afterDate,
    schedule.frequency,
    schedule.day_of_month ?? undefined,
    schedule.day_of_week ?? undefined
  )
  const adjusted = applyWeekdayRule(raw, schedule.weekday_only)

  if (schedule.end_date && !isOnOrBefore(adjusted, parseDate(schedule.end_date))) {
    return null
  }

  return adjusted
}

export function generateOccurrences(
  schedule: RecurringSchedule,
  fromDate: Date,
  toDate: Date,
  skips: RecurringSkip[],
  overrides: RecurringOverride[]
): RecurringOccurrence[] {
  if (!schedule.is_active) return []

  const skipDates = new Set(
    skips.filter(s => s.recurring_id === schedule.id).map(s => s.skip_date)
  )
  const overrideMap = new Map<string, RecurringOverride>()
  for (const o of overrides) {
    if (o.recurring_id === schedule.id) {
      overrideMap.set(o.original_date, o)
    }
  }

  const results: RecurringOccurrence[] = []
  let current = getFirstOccurrence(schedule)
  const endDate = schedule.end_date ? parseDate(schedule.end_date) : null

  while (isOnOrBefore(current, toDate)) {
    if (endDate && !isOnOrBefore(current, endDate)) break

    if (isOnOrAfter(current, fromDate)) {
      const currentStr = toDateString(current)

      if (!skipDates.has(currentStr)) {
        const override = overrideMap.get(currentStr)
        const occDate = override ? parseDate(override.override_date) : current
        let amountFrom: Decimal
        let amountTo: Decimal

        if (override) {
          amountFrom = toDecimal(override.amount_from)
          amountTo = toDecimal(override.amount_to)
        } else {
          const amounts = getEffectiveAmounts(schedule.effective_changes, current)
          amountFrom = amounts.amountFrom
          amountTo = amounts.amountTo
        }

        results.push({
          date: occDate,
          amount_from: amountFrom,
          amount_to: amountTo,
          from_account_id: schedule.from_account_id,
          to_account_id: schedule.to_account_id,
          currency_from: schedule.currency_from,
          currency_to: schedule.currency_to,
          recurring_id: schedule.id,
          name: override?.name ?? schedule.name ?? null,
        })
      }
    }

    const next = getNextOccurrence(schedule, current)
    if (!next) break
    current = next
  }

  return results
}
