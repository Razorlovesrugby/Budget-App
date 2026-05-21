import type { RecurringSchedule } from '@/types'
import { getFirstOccurrence, getNextOccurrence } from './recurring'
import { parseDate, isOnOrBefore } from '@/lib/utils/dates'
import { subDays, startOfDay, differenceInDays, format } from 'date-fns'

export function getNextOccurrenceDate(
  schedule: RecurringSchedule,
  fromDate: Date = new Date()
): Date | null {
  if (!schedule.is_active) return null
  if (schedule.end_date && !isOnOrBefore(parseDate(fromDate), parseDate(schedule.end_date))) {
    return null
  }

  const firstDate = getFirstOccurrence(schedule)

  // If first occurrence is in the future (schedule hasn't started yet)
  if (firstDate > fromDate) return firstDate

  // Step back 1 day so getNextOccurrence lands on fromDate if it's an occurrence
  const searchFrom = subDays(fromDate, 1)

  const next = getNextOccurrence(schedule, searchFrom)
  if (!next) return null

  // If next occurrence is <= fromDate, it means fromDate is an occurrence — return it
  if (next <= fromDate) return next

  // Otherwise return the next one
  return next
}

export function formatNextOccurrence(date: Date | null): string {
  if (!date) return '—'

  const today = startOfDay(new Date())
  const diff = differenceInDays(date, today)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return format(date, 'EEEE')
  if (diff < 14) return `Next ${format(date, 'EEEE')}`
  return format(date, 'd MMM yyyy')
}
