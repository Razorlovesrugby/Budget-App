'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Decimal from 'decimal.js'
import type { Account } from '@/types'
import { toDecimal } from '@/lib/utils/money'

interface ReviewFlashcardProps {
  account: Account
  budgetBalance: number               // Budget at review date for this account
  lastActualBalance: number | null    // Most recent actual balance (null = first review)
  lastActualDate: string | null       // Date of last actual
  progress: { current: number; total: number }
  onNext: (actualBalance: number) => void
  onSkip: () => void
}

export default function ReviewFlashcard({
  account,
  budgetBalance,
  lastActualBalance,
  lastActualDate,
  progress,
  onNext,
  onSkip,
}: ReviewFlashcardProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [account.id])

  const prefix = account.currency === 'NZD' ? 'NZ$' : '£'

  // Live variance calculation
  const variance = useMemo(() => {
    if (!inputValue || isNaN(Number(inputValue))) return null
    const entered = new Decimal(inputValue)
    const budget = toDecimal(budgetBalance)
    return entered.minus(budget)
  }, [inputValue, budgetBalance])

  function formatVariance(d: Decimal): string {
    if (d.isZero()) return `${prefix}0.00`
    const abs = d.abs().toDecimalPlaces(2).toNumber()
    const formatted = abs.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    if (d.isPositive()) return `+${prefix}${formatted}`
    return `(${prefix}${formatted})`
  }

  function formatBudget(n: number): string {
    const d = toDecimal(n).toDecimalPlaces(2).toNumber()
    return d.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function handleSubmit() {
    if (!inputValue || isNaN(Number(inputValue))) return
    onNext(Number(inputValue))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      {/* Safe area */}
      <div className="h-[54px] shrink-0" />

      {/* Progress */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-[#1c1c1e]">
            Weekly Review
          </h1>
          <span className="text-[13px] text-black/30 tabular-nums">
            {progress.current}/{progress.total}
          </span>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex flex-col px-6">
        <div className="bg-white rounded-[28px] p-[28px_24px] shadow-sm">
          {/* Account Name */}
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-black/30 mb-6">
            {account.name}
          </p>

          {/* Budget Today */}
          <p className="text-[11px] uppercase text-black/25 mb-1">
            Budget today
          </p>
          <p className="text-[32px] font-bold text-[#1c1c1e] tabular-nums mb-6">
            {prefix}{formatBudget(budgetBalance)}
          </p>

          {/* Last Actual */}
          {lastActualBalance !== null && lastActualDate && (
            <div className="mb-8">
              <p className="text-[11px] uppercase text-black/25 mb-1">
                Last actual · {lastActualDate}
              </p>
              <p className="text-[32px] font-bold text-black/40 line-through tabular-nums">
                {prefix}{formatBudget(lastActualBalance)}
              </p>
            </div>
          )}
          {lastActualBalance === null && (
            <p className="text-[11px] uppercase text-black/20 mb-8">
              No previous balance
            </p>
          )}

          {/* Input */}
          <div className="mb-6">
            <p className="text-[11px] uppercase text-black/25 mb-2">
              Current Balance
            </p>
            <div className="flex items-center border-b border-black/[0.08] pb-2">
              <span className="text-[42px] font-bold text-black/30 mr-1">
                {prefix}
              </span>
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                className="flex-1 text-[42px] font-bold text-[#1c1c1e] bg-transparent
                  outline-none placeholder:text-black/[0.12] tabular-nums
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                  [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Variance */}
          <div>
            <p className="text-[11px] uppercase text-black/25 mb-1">
              Variance
            </p>
            <p className="text-[15px] font-semibold text-black/40 tabular-nums">
              {variance ? formatVariance(variance) : `${prefix}0.00`}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="px-6 pb-8 flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 h-[54px] rounded-[18px] text-[15px] font-medium text-black/40
            bg-black/[0.04] hover:bg-black/[0.08] transition-colors
            active:scale-[0.98] transition-transform"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={!inputValue || isNaN(Number(inputValue))}
          className="flex-[2] h-[54px] rounded-[18px] text-[17px] font-bold text-white
            bg-[#1c1c1e] hover:bg-black/90 transition-colors
            active:scale-[0.98] transition-transform
            disabled:bg-black/15 disabled:text-black/40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
