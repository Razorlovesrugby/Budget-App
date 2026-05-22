'use client'

import { memo } from 'react'
import Decimal from 'decimal.js'
import type { Currency } from '@/types'

export const GRID = {
  HEADER_HEIGHT: 52,
  ROW_HEIGHT: 38,
  DATE_COL_WIDTH: 110,
  ACCOUNT_COL_WIDTH: 148,
  ADD_COL_WIDTH: 48,
  BOTTOM_BAR_HEIGHT: 40,
  TOP_BAR_HEIGHT: 52,
} as const

export function formatCellAmount(balance: number, currency: Currency): string {
  const d = new Decimal(String(balance))
  const prefix = currency === 'GBP' ? '£' : 'NZ$'
  if (d.isZero()) return `${prefix}0`
  if (d.isNegative()) {
    return `(${prefix}${d.abs().toDecimalPlaces(0).toNumber().toLocaleString('en-GB')})`
  }
  return `${prefix}${d.toDecimalPlaces(0).toNumber().toLocaleString('en-GB')}`
}

interface GridCellProps {
  balance: number
  currency: Currency
  hasTransaction: boolean
  isToday: boolean
  onClick: () => void
}

export const GridCell = memo(function GridCell({
  balance,
  currency,
  hasTransaction,
  isToday,
  onClick,
}: GridCellProps) {
  const d = new Decimal(String(balance))
  const isZero = d.isZero()

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-end px-3 border-r border-black/[0.04] cursor-pointer select-none shrink-0 active:bg-black/[0.04] transition-colors"
      style={{ width: GRID.ACCOUNT_COL_WIDTH, height: GRID.ROW_HEIGHT }}
    >
      {hasTransaction && (
        <div className="absolute left-2 w-[3px] h-4 rounded-sm bg-black/15" />
      )}
      <span
        className={`text-xs tracking-tight tabular-nums ${
          isZero
            ? 'text-black/20'
            : isToday
            ? 'text-[#1c1c1e] font-semibold'
            : 'text-black/70 font-medium'
        }`}
      >
        {formatCellAmount(balance, currency)}
      </span>
    </div>
  )
})
