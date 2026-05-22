'use client'

import { memo } from 'react'
import { format, isSameDay } from 'date-fns'
import type { Account } from '@/types'
import { GridCell, GRID } from './GridCell'
import { toDateString } from '@/lib/utils/dates'

interface GridRowProps {
  date: Date
  today: Date
  accounts: Account[]
  balances: Map<string, Map<string, number>>
  txLookup: Map<string, Set<string>>
  isHighlighted: boolean
  onCellTap: (accountId: string, date: Date, hasTransaction: boolean) => void
}

export const GridRow = memo(function GridRow({
  date,
  today,
  accounts,
  balances,
  txLookup,
  isHighlighted,
  onCellTap,
}: GridRowProps) {
  const isToday = isSameDay(date, today)
  const dateISO = toDateString(date)
  const dayLabel = format(date, 'EEE').toUpperCase().slice(0, 3)
  const dateNum = format(date, 'd')
  const monthLabel = format(date, 'MMM').toUpperCase()

  return (
    <div
      className={`flex ${
        isToday ? 'border-t border-b border-black/10' : 'border-b border-black/[0.04]'
      }`}
      style={{
        height: GRID.ROW_HEIGHT,
        backgroundColor: isHighlighted
          ? 'rgba(0,0,0,0.06)'
          : isToday
          ? 'rgba(0,0,0,0.025)'
          : undefined,
      }}
    >
      {/* Frozen date cell — sticky left */}
      <div
        className="sticky left-0 flex items-center gap-1 px-2.5 border-r border-black/10 shrink-0 bg-white"
        style={{ width: GRID.DATE_COL_WIDTH, height: GRID.ROW_HEIGHT, zIndex: 10 }}
      >
        {isToday ? (
          <>
            <span className="text-[8px] font-bold uppercase tracking-wide bg-[#1c1c1e] text-white px-1.5 py-0.5 rounded-[3px]">
              TODAY
            </span>
            <span className="text-[12px] font-semibold text-[#1c1c1e] tabular-nums">
              {dateNum}
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-medium text-black/30 uppercase w-7 shrink-0">
              {dayLabel}
            </span>
            <span className="text-[12px] font-semibold text-[#1c1c1e] tabular-nums w-5">
              {dateNum}
            </span>
            <span className="text-[10px] font-medium text-black/30 uppercase">
              {monthLabel}
            </span>
          </>
        )}
      </div>

      {/* Account cells */}
      {accounts.map((account) => {
        const balance = balances.get(account.id)?.get(dateISO) ?? account.opening_balance
        const hasTransaction = txLookup.get(account.id)?.has(dateISO) ?? false

        return (
          <GridCell
            key={account.id}
            balance={balance}
            currency={account.currency}
            hasTransaction={hasTransaction}
            isToday={isToday}
            onClick={() => onCellTap(account.id, date, hasTransaction)}
          />
        )
      })}

      {/* Add-account column spacer */}
      <div style={{ width: GRID.ADD_COL_WIDTH, flexShrink: 0 }} />
    </div>
  )
})
