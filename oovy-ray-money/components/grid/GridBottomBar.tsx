'use client'

import Decimal from 'decimal.js'
import type { Settings } from '@/types'
import { GRID } from './GridCell'

interface GridBottomBarProps {
  gbpTotal: Decimal
  nzdTotal: Decimal
  settings: Settings
  lastReviewDate: string | null
}

function fmt(d: Decimal, prefix: string): string {
  const abs = d.abs()
  const num = abs.toDecimalPlaces(0).toNumber().toLocaleString('en-GB')
  if (d.isNegative()) return `(${prefix}${num})`
  return `${prefix}${num}`
}

export function GridBottomBar({ gbpTotal, nzdTotal, settings, lastReviewDate }: GridBottomBarProps) {
  const rate = settings.exchange_rate_gbp_nzd ?? 2.0

  return (
    <div
      className="shrink-0 flex items-center px-4 gap-4 border-t border-black/[0.08]"
      style={{
        height: GRID.BOTTOM_BAR_HEIGHT,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">GBP</span>
        <span className="text-[13px] font-semibold tabular-nums text-[#1c1c1e]">
          {fmt(gbpTotal, '£')}
        </span>
      </div>

      <div className="w-px h-4 bg-black/10" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">NZD</span>
        <span className="text-[13px] font-semibold tabular-nums text-[#1c1c1e]">
          {fmt(nzdTotal, 'NZ$')}
        </span>
      </div>

      <div className="w-px h-4 bg-black/10" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">Rate</span>
        <span className="text-[13px] font-semibold tabular-nums text-[#1c1c1e]">
          {Number(rate).toFixed(2)}
        </span>
      </div>

      {lastReviewDate && (
        <>
          <div className="w-px h-4 bg-black/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black/30">
              Last review
            </span>
            <span className="text-[13px] font-semibold text-[#1c1c1e]">{lastReviewDate}</span>
          </div>
        </>
      )}
    </div>
  )
}
