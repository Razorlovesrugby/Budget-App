import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  isBefore,
  isAfter,
  isEqual,
  getDay,
  format,
  parseISO,
  getDaysInMonth,
  isSaturday,
  isSunday,
} from 'date-fns'
import type { Frequency } from '@/types'

// UK bank holidays 2024–2030 (England & Wales)
const UK_BANK_HOLIDAYS = new Set<string>([
  // 2024
  '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-06', '2024-05-27',
  '2024-08-26', '2024-12-25', '2024-12-26',
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26',
  '2025-08-25', '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
  '2026-08-31', '2026-12-25', '2026-12-28',
  // 2027
  '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31',
  '2027-08-30', '2027-12-27', '2027-12-28',
  // 2028
  '2028-01-03', '2028-04-14', '2028-04-17', '2028-05-01', '2028-05-29',
  '2028-08-28', '2028-12-25', '2028-12-26',
  // 2029
  '2029-01-01', '2029-03-30', '2029-04-02', '2029-05-07', '2029-05-27',
  '2029-08-27', '2029-12-25', '2029-12-26',
  // 2030
  '2030-01-01', '2030-04-19', '2030-04-22', '2030-05-06', '2030-05-27',
  '2030-08-26', '2030-12-25', '2030-12-26',
])

export function parseDate(dateOrString: Date | string): Date {
  if (dateOrString instanceof Date) return dateOrString
  return parseISO(dateOrString)
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'd MMM yyyy')
}

export function formatShortDate(date: Date): string {
  return format(date, 'd MMM')
}

export function isOnOrBefore(date: Date, target: Date): boolean {
  return isBefore(date, target) || isEqual(date, target)
}

export function isOnOrAfter(date: Date, target: Date): boolean {
  return isAfter(date, target) || isEqual(date, target)
}

export function isBetween(date: Date, start: Date, end: Date): boolean {
  return isOnOrAfter(date, start) && isOnOrBefore(date, end)
}

export function isUKBankHoliday(date: Date): boolean {
  return UK_BANK_HOLIDAYS.has(format(date, 'yyyy-MM-dd'))
}

export function getSafeDayOfMonth(year: number, month: number, dayOfMonth: number): number {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))
  return Math.min(dayOfMonth, daysInMonth)
}

export function applyWeekdayRule(date: Date, weekdayOnly: boolean): Date {
  if (!weekdayOnly) return date

  let result = date

  if (isSaturday(result)) result = subDays(result, 1)
  else if (isSunday(result)) result = subDays(result, 2)

  while (isUKBankHoliday(result)) {
    result = subDays(result, 1)
  }

  return result
}

export function nextOccurrenceDate(
  current: Date,
  frequency: Frequency,
  dayOfMonth?: number,
  dayOfWeek?: number
): Date {
  switch (frequency) {
    case 'WEEKLY': {
      const next = addWeeks(current, 1)
      if (dayOfWeek !== undefined) {
        const targetDay = dayOfWeek
        const actualDay = getDay(next)
        const diff = (targetDay - actualDay + 7) % 7
        return diff === 0 ? next : addDays(next, diff)
      }
      return next
    }
    case 'FORTNIGHTLY':
      return addDays(current, 14)
    case 'MONTHLY': {
      const next = addMonths(current, 1)
      if (dayOfMonth !== undefined) {
        const safeDay = getSafeDayOfMonth(next.getFullYear(), next.getMonth() + 1, dayOfMonth)
        return new Date(next.getFullYear(), next.getMonth(), safeDay)
      }
      return next
    }
    case 'QUARTERLY': {
      const next = addMonths(current, 3)
      if (dayOfMonth !== undefined) {
        const safeDay = getSafeDayOfMonth(next.getFullYear(), next.getMonth() + 1, dayOfMonth)
        return new Date(next.getFullYear(), next.getMonth(), safeDay)
      }
      return next
    }
    case 'BIANNUAL': {
      const next = addMonths(current, 6)
      if (dayOfMonth !== undefined) {
        const safeDay = getSafeDayOfMonth(next.getFullYear(), next.getMonth() + 1, dayOfMonth)
        return new Date(next.getFullYear(), next.getMonth(), safeDay)
      }
      return next
    }
  }
}
