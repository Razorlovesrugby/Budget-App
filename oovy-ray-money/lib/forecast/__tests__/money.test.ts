import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  toDecimal,
  fromDecimal,
  formatMoney,
  formatDebit,
  add,
  subtract,
  multiply,
  divide,
  sum,
  isGreaterThan,
  isLessThan,
  isZero,
  gbpToNzd,
  nzdToGbp,
} from '@/lib/utils/money'

describe('toDecimal / fromDecimal', () => {
  it('roundtrips 1234.56', () => {
    expect(fromDecimal(toDecimal(1234.56))).toBe(1234.56)
  })

  it('avoids float issues: 0.1 + 0.2', () => {
    const result = add(toDecimal(0.1), toDecimal(0.2))
    expect(result.toFixed(2)).toBe('0.30')
  })

  it('converts via String to avoid precision loss', () => {
    expect(toDecimal(1.1).toString()).toBe('1.1')
  })
})

describe('formatMoney GBP', () => {
  it('positive amount', () => {
    expect(formatMoney(new Decimal('1234.50'), 'GBP')).toBe('£1,234.50')
  })

  it('negative amount → brackets', () => {
    expect(formatMoney(new Decimal('-200.00'), 'GBP')).toBe('(£200.00)')
  })

  it('zero', () => {
    expect(formatMoney(new Decimal('0.00'), 'GBP')).toBe('£0.00')
  })

  it('large number with commas', () => {
    expect(formatMoney(new Decimal('1000000.00'), 'GBP')).toBe('£1,000,000.00')
  })
})

describe('formatMoney NZD', () => {
  it('positive amount uses NZ$ prefix', () => {
    expect(formatMoney(new Decimal('2220.00'), 'NZD')).toBe('NZ$2,220.00')
  })

  it('negative NZD → brackets with NZ$', () => {
    expect(formatMoney(new Decimal('-450.00'), 'NZD')).toBe('(NZ$450.00)')
  })

  it('zero NZD', () => {
    expect(formatMoney(new Decimal('0'), 'NZD')).toBe('NZ$0.00')
  })

  it('never bare $ prefix', () => {
    const result = formatMoney(new Decimal('100'), 'NZD')
    expect(result.startsWith('$')).toBe(false)
    expect(result).toContain('NZ$')
  })
})

describe('formatDebit', () => {
  it('GBP always brackets', () => {
    expect(formatDebit(new Decimal('200.00'), 'GBP')).toBe('(£200.00)')
  })

  it('NZD always brackets with NZ$', () => {
    expect(formatDebit(new Decimal('450.00'), 'NZD')).toBe('(NZ$450.00)')
  })

  it('positive input shown as debit', () => {
    expect(formatDebit(new Decimal('0.01'), 'GBP')).toBe('(£0.01)')
  })
})

describe('arithmetic', () => {
  it('add', () => {
    expect(add(new Decimal('1.1'), new Decimal('2.2')).toFixed(2)).toBe('3.30')
  })

  it('subtract', () => {
    expect(subtract(new Decimal('10'), new Decimal('3.5')).toFixed(2)).toBe('6.50')
  })

  it('multiply', () => {
    expect(multiply(new Decimal('2.5'), new Decimal('4')).toFixed(2)).toBe('10.00')
  })

  it('divide', () => {
    expect(divide(new Decimal('10'), new Decimal('3')).toDecimalPlaces(2).toFixed(2)).toBe('3.33')
  })

  it('accepts numbers', () => {
    expect(add(1, 2).toFixed(2)).toBe('3.00')
  })
})

describe('sum', () => {
  it('empty array → 0', () => {
    expect(sum([]).toFixed(2)).toBe('0.00')
  })

  it('single value', () => {
    expect(sum([toDecimal(5.5)]).toFixed(2)).toBe('5.50')
  })

  it('avoids float error: 1.1 + 2.2', () => {
    expect(sum([toDecimal(1.1), toDecimal(2.2)]).toFixed(2)).toBe('3.30')
  })

  it('many values', () => {
    expect(sum([1, 2, 3, 4, 5]).toFixed(2)).toBe('15.00')
  })
})

describe('comparisons', () => {
  it('isGreaterThan', () => {
    expect(isGreaterThan(new Decimal('5'), new Decimal('3'))).toBe(true)
    expect(isGreaterThan(new Decimal('3'), new Decimal('5'))).toBe(false)
  })

  it('isLessThan', () => {
    expect(isLessThan(new Decimal('3'), new Decimal('5'))).toBe(true)
  })

  it('isZero', () => {
    expect(isZero(new Decimal('0'))).toBe(true)
    expect(isZero(new Decimal('0.01'))).toBe(false)
  })
})

describe('currency conversion', () => {
  it('gbpToNzd', () => {
    expect(gbpToNzd(new Decimal('100'), new Decimal('2.22')).toString()).toBe('222')
  })

  it('nzdToGbp', () => {
    expect(nzdToGbp(new Decimal('222'), new Decimal('2.22')).toFixed(2)).toBe('100.00')
  })
})
