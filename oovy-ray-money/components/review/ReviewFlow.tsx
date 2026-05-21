'use client'

import { useState, useEffect } from 'react'
import Decimal from 'decimal.js'
import type { Account } from '@/types'
import { toDecimal, fromDecimal } from '@/lib/utils/money'
import { getLastActualForAccount } from '@/lib/db/reviews'
import ReviewFlashcard from './ReviewFlashcard'

export interface ReviewEntryData {
  accountId: string
  actualBalance: number | null
  budgetBalance: number
  variance: number | null
  wasSkipped: boolean
}

interface ReviewFlowProps {
  reviewDate: Date
  accounts: Account[]              // Non-Tracking, non-archived, in display_order
  budgetBalances: Map<string, number>  // accountId → Budget at review date
  onComplete: (entries: ReviewEntryData[]) => void
  onCancel: () => void
}

interface LastActual {
  balance: number
  date: string
}

export default function ReviewFlow({
  reviewDate,
  accounts,
  budgetBalances,
  onComplete,
  onCancel,
}: ReviewFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [entries, setEntries] = useState<ReviewEntryData[]>([])
  const [lastActuals, setLastActuals] = useState<Map<string, LastActual | null>>(new Map())
  const [loading, setLoading] = useState(true)

  const total = accounts.length
  const currentAccount = accounts[currentIndex]
  const budgetBalance = budgetBalances.get(currentAccount?.id ?? '') ?? 0

  // Fetch last actuals for all accounts on mount
  useEffect(() => {
    async function fetchAll() {
      const map = new Map<string, LastActual | null>()
      const reviewDateStr = reviewDate.toISOString().split('T')[0]

      for (const account of accounts) {
        const result = await getLastActualForAccount(account.id, reviewDateStr)
        if (result) {
          map.set(account.id, {
            balance: result.actualBalance,
            date: result.reviewDate,
          })
        } else {
          map.set(account.id, null)
        }
      }

      setLastActuals(map)
      setLoading(false)
    }

    fetchAll()
  }, [accounts, reviewDate])

  function handleNext(actualBalance: number) {
    const variance = new Decimal(actualBalance).minus(toDecimal(budgetBalance))

    const entry: ReviewEntryData = {
      accountId: currentAccount.id,
      actualBalance,
      budgetBalance,
      variance: fromDecimal(variance),
      wasSkipped: false,
    }

    const newEntries = [...entries, entry]
    advanceOrComplete(newEntries)
  }

  function handleSkip() {
    const entry: ReviewEntryData = {
      accountId: currentAccount.id,
      actualBalance: null,
      budgetBalance,
      variance: null,
      wasSkipped: true,
    }

    const newEntries = [...entries, entry]
    advanceOrComplete(newEntries)
  }

  function advanceOrComplete(newEntries: ReviewEntryData[]) {
    if (currentIndex + 1 < total) {
      setEntries(newEntries)
      setCurrentIndex(currentIndex + 1)
    } else {
      onComplete(newEntries)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
        <div className="h-[54px] shrink-0" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[17px] font-semibold text-black/40 mb-2">
              No accounts to review
            </p>
            <p className="text-[13px] text-black/25">
              All accounts are either Tracking or archived.
            </p>
            <button
              onClick={onCancel}
              className="mt-6 h-[44px] px-6 rounded-xl bg-[#1c1c1e] text-white text-[15px] font-medium
                hover:bg-black/90 transition-colors active:scale-[0.98]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-[15px] text-black/30">Loading review data...</p>
      </div>
    )
  }

  const lastActual = lastActuals.get(currentAccount.id) ?? null

  return (
    <ReviewFlashcard
      key={currentAccount.id}
      account={currentAccount}
      budgetBalance={budgetBalance}
      lastActualBalance={lastActual?.balance ?? null}
      lastActualDate={lastActual?.date ?? null}
      progress={{ current: currentIndex + 1, total }}
      onNext={handleNext}
      onSkip={handleSkip}
    />
  )
}
