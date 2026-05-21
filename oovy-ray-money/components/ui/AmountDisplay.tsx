import type { Currency } from '@/types'
import { toDecimal } from '@/lib/utils/money'

interface AmountDisplayProps {
  amount: number
  currency: Currency
  variant: 'plain' | 'debit' | 'variance'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses: Record<string, string> = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[17px]',
  xl: 'text-[42px] tracking-[-1.5px]',
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function AmountDisplay({
  amount,
  currency,
  variant,
  size = 'md',
}: AmountDisplayProps) {
  const prefix = currency === 'NZD' ? 'NZ$' : '£'
  const d = toDecimal(amount)
  const isPositive = d.greaterThan(0)
  const isNegative = d.lessThan(0)
  const abs = d.abs().toDecimalPlaces(2).toNumber()

  let display: string

  switch (variant) {
    case 'debit':
      // Always bracketed — amount is positive, displayed as debit
      display = `(${prefix}${formatNumber(d.toDecimalPlaces(2).toNumber())})`
      break
    case 'variance':
      if (isNegative) {
        display = `(${prefix}${formatNumber(abs)})`
      } else if (isPositive) {
        display = `+${prefix}${formatNumber(abs)}`
      } else {
        display = `${prefix}0.00`
      }
      break
    case 'plain':
    default:
      if (isNegative) {
        display = `(${prefix}${formatNumber(abs)})`
      } else {
        display = `${prefix}${formatNumber(abs)}`
      }
      break
  }

  return (
    <span className={`font-semibold tabular-nums ${sizeClasses[size] || ''}`}>
      {display}
    </span>
  )
}
