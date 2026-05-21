import { describe, it, expect } from 'vitest'
import {
  parseDate,
  toDateString,
  formatDisplayDate,
  formatShortDate,
  isOnOrBefore,
  isOnOrAfter,
  isBetween,
  nextOccurrenceDate,
  getSafeDayOfMonth,
  applyWeekdayRule,
  isUKBankHoliday,
} from '@/lib/utils/dates'

describe('parseDate', () => {
  it('accepts ISO string', () => {
    const d = parseDate('2026-05-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4)
    expect(d.getDate()).toBe(15)
  })

  it('accepts Date passthrough', () => {
    const d = new Date(2026, 4, 15)
    expect(parseDate(d)).toBe(d)
  })
})

describe('toDateString', () => {
  it('formats as yyyy-MM-dd', () => {
    expect(toDateString(new Date(2026, 4, 5))).toBe('2026-05-05')
  })
})

describe('formatDisplayDate / formatShortDate', () => {
  it('display date', () => {
    expect(formatDisplayDate(new Date(2026, 4, 15))).toBe('15 May 2026')
  })

  it('short date', () => {
    expect(formatShortDate(new Date(2026, 4, 15))).toBe('15 May')
  })
})

describe('comparisons', () => {
  const jan1 = new Date(2026, 0, 1)
  const jan5 = new Date(2026, 0, 5)
  const jan10 = new Date(2026, 0, 10)

  it('isOnOrBefore: equal', () => {
    expect(isOnOrBefore(jan1, jan1)).toBe(true)
  })

  it('isOnOrBefore: before', () => {
    expect(isOnOrBefore(jan1, jan5)).toBe(true)
  })

  it('isOnOrBefore: after → false', () => {
    expect(isOnOrBefore(jan10, jan5)).toBe(false)
  })

  it('isOnOrAfter: equal', () => {
    expect(isOnOrAfter(jan5, jan5)).toBe(true)
  })

  it('isBetween: inclusive', () => {
    expect(isBetween(jan5, jan1, jan10)).toBe(true)
    expect(isBetween(jan1, jan1, jan10)).toBe(true)
    expect(isBetween(jan10, jan1, jan10)).toBe(true)
  })

  it('isBetween: outside', () => {
    expect(isBetween(new Date(2025, 11, 31), jan1, jan10)).toBe(false)
  })
})

describe('getSafeDayOfMonth', () => {
  it('normal month', () => {
    expect(getSafeDayOfMonth(2026, 5, 15)).toBe(15)
  })

  it('31 in April → 30', () => {
    expect(getSafeDayOfMonth(2026, 4, 31)).toBe(30)
  })

  it('31 in Feb → 28 (non-leap)', () => {
    expect(getSafeDayOfMonth(2025, 2, 31)).toBe(28)
  })

  it('29 in Feb 2024 (leap)', () => {
    expect(getSafeDayOfMonth(2024, 2, 29)).toBe(29)
  })

  it('29 in Feb 2025 (non-leap) → 28', () => {
    expect(getSafeDayOfMonth(2025, 2, 29)).toBe(28)
  })
})

describe('nextOccurrenceDate', () => {
  it('WEEKLY advances 7 days to correct day_of_week=1 (Mon)', () => {
    const mon = new Date(2026, 4, 4) // Monday 4 May
    const next = nextOccurrenceDate(mon, 'WEEKLY', undefined, 1)
    expect(toDateString(next)).toBe('2026-05-11')
  })

  it('FORTNIGHTLY adds 14 days', () => {
    const d = new Date(2026, 4, 1)
    const next = nextOccurrenceDate(d, 'FORTNIGHTLY')
    expect(toDateString(next)).toBe('2026-05-15')
  })

  it('MONTHLY same day next month', () => {
    const d = new Date(2026, 0, 15)
    const next = nextOccurrenceDate(d, 'MONTHLY', 15)
    expect(toDateString(next)).toBe('2026-02-15')
  })

  it('MONTHLY 31st Jan → 28th Feb (non-leap)', () => {
    const d = new Date(2025, 0, 31)
    const next = nextOccurrenceDate(d, 'MONTHLY', 31)
    expect(toDateString(next)).toBe('2025-02-28')
  })

  it('MONTHLY 31st Jan 2024 → 29th Feb (leap)', () => {
    const d = new Date(2024, 0, 31)
    const next = nextOccurrenceDate(d, 'MONTHLY', 31)
    expect(toDateString(next)).toBe('2024-02-29')
  })

  it('MONTHLY 31st Mar → 30th Apr', () => {
    const d = new Date(2026, 2, 31)
    const next = nextOccurrenceDate(d, 'MONTHLY', 31)
    expect(toDateString(next)).toBe('2026-04-30')
  })

  it('QUARTERLY adds 3 months', () => {
    const d = new Date(2026, 0, 15)
    const next = nextOccurrenceDate(d, 'QUARTERLY', 15)
    expect(toDateString(next)).toBe('2026-04-15')
  })

  it('BIANNUAL adds 6 months', () => {
    const d = new Date(2026, 0, 15)
    const next = nextOccurrenceDate(d, 'BIANNUAL', 15)
    expect(toDateString(next)).toBe('2026-07-15')
  })
})

describe('applyWeekdayRule', () => {
  it('weekdayOnly=false: unchanged regardless of day', () => {
    const sat = new Date(2025, 7, 30) // Sat 30 Aug 2025
    expect(toDateString(applyWeekdayRule(sat, false))).toBe('2025-08-30')
  })

  it('Saturday → Friday', () => {
    const sat = new Date(2025, 7, 30) // Sat 30 Aug 2025
    expect(toDateString(applyWeekdayRule(sat, true))).toBe('2025-08-29')
  })

  it('Sunday → Friday', () => {
    const sun = new Date(2025, 10, 30) // Sun 30 Nov 2025
    expect(toDateString(applyWeekdayRule(sun, true))).toBe('2025-11-28')
  })

  it('weekday non-bank-holiday: unchanged', () => {
    const tue = new Date(2025, 8, 30) // Tue 30 Sep 2025
    expect(toDateString(applyWeekdayRule(tue, true))).toBe('2025-09-30')
  })

  it('bank holiday Friday → Thursday before', () => {
    // 2025-12-26 Boxing Day is a Thursday → not a Friday bank hol
    // 2025-04-18 Good Friday → move to Thursday 2025-04-17
    const fri = new Date(2025, 3, 18) // Fri 18 Apr 2025 (Good Friday)
    expect(toDateString(applyWeekdayRule(fri, true))).toBe('2025-04-17')
  })

  it('non-bank-holiday weekday: unchanged', () => {
    const wed = new Date(2026, 4, 20) // Wed 20 May 2026
    expect(toDateString(applyWeekdayRule(wed, true))).toBe('2026-05-20')
  })
})

describe('isUKBankHoliday', () => {
  it('Christmas 2025', () => {
    expect(isUKBankHoliday(new Date(2025, 11, 25))).toBe(true)
  })

  it('Boxing Day 2025', () => {
    expect(isUKBankHoliday(new Date(2025, 11, 26))).toBe(true)
  })

  it('New Year 2026', () => {
    expect(isUKBankHoliday(new Date(2026, 0, 1))).toBe(true)
  })

  it('Good Friday 2025', () => {
    expect(isUKBankHoliday(new Date(2025, 3, 18))).toBe(true)
  })

  it('Normal weekday is not bank holiday', () => {
    expect(isUKBankHoliday(new Date(2026, 4, 20))).toBe(false)
  })
})
