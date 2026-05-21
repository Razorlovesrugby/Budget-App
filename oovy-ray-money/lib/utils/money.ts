import Decimal from 'decimal.js'
import type { Currency } from '@/types'

Decimal.set({ precision: 14, rounding: Decimal.ROUND_HALF_UP })

export function toDecimal(value: number): Decimal {
  return new Decimal(String(value))
}

export function fromDecimal(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber()
}

export function formatMoney(amount: Decimal, currency: Currency): string {
  const isNegative = amount.isNegative()
  const abs = amount.abs()
  const formatted = abs.toDecimalPlaces(2).toNumber()
    .toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const prefix = currency === 'NZD' ? 'NZ$' : '£'
  if (isNegative) return `(${prefix}${formatted})`
  return `${prefix}${formatted}`
}

export function formatDebit(amount: Decimal, currency: Currency): string {
  const abs = amount.abs()
  const formatted = abs.toDecimalPlaces(2).toNumber()
    .toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const prefix = currency === 'NZD' ? 'NZ$' : '£'
  return `(${prefix}${formatted})`
}

function toD(v: number | Decimal): Decimal {
  return v instanceof Decimal ? v : new Decimal(String(v))
}

export function add(a: number | Decimal, b: number | Decimal): Decimal {
  return toD(a).plus(toD(b))
}

export function subtract(a: number | Decimal, b: number | Decimal): Decimal {
  return toD(a).minus(toD(b))
}

export function multiply(a: number | Decimal, b: number | Decimal): Decimal {
  return toD(a).times(toD(b))
}

export function divide(a: number | Decimal, b: number | Decimal): Decimal {
  return toD(a).div(toD(b))
}

export function sum(values: (number | Decimal)[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toD(v)), new Decimal(0))
}

export function isGreaterThan(a: Decimal, b: Decimal): boolean {
  return a.greaterThan(b)
}

export function isLessThan(a: Decimal, b: Decimal): boolean {
  return a.lessThan(b)
}

export function isZero(d: Decimal): boolean {
  return d.isZero()
}

export function gbpToNzd(gbpAmount: Decimal, rate: Decimal): Decimal {
  return gbpAmount.times(rate)
}

export function nzdToGbp(nzdAmount: Decimal, rate: Decimal): Decimal {
  return nzdAmount.div(rate)
}
