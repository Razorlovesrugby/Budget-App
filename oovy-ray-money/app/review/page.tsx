'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Account,
  Transaction,
  RecurringSchedule,
  RecurringSkip,
  RecurringOverride,
  Settings,
} from '@/types'
import { fromDecimal } from '@/lib/utils/money'
import { calculateAllBudgets } from '@/lib/forecast/engine'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getLastReviewDate, saveReview, type ReviewEntryData } from '@/lib/db/reviews'
import ReviewDateConfirm from '@/components/review/ReviewDateConfirm'
import ReviewFlow from '@/components/review/ReviewFlow'
import ReviewSummary from '@/components/review/ReviewSummary'

type Phase = 'date-confirm' | 'review-flow' | 'summary' | 'saving'

export default function ReviewPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [phase, setPhase] = useState<Phase>('date-confirm')
  const [reviewDate, setReviewDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<ReviewEntryData[]>([])
  const [error, setError] = useState<string | null>(null)

  // Data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [skips, setSkips] = useState<RecurringSkip[]>([])
  const [overrides, setOverrides] = useState<RecurringOverride[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [lastReviewDate, setLastReviewDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      try {
        // Check auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const [
          { data: accData },
          { data: txData },
          { data: schedData },
          { data: skipData },
          { data: ovrData },
          { data: settingsData },
          lastReviewDateVal,
        ] = await Promise.all([
          supabase
            .from('accounts')
            .select('*')
            .eq('is_archived', false)
            .eq('is_system', false)
            .order('display_order'),
          supabase
            .from('transactions')
            .select('*'),
          supabase
            .from('recurring_schedules')
            .select('*')
            .eq('is_active', true),
          supabase
            .from('recurring_skips')
            .select('*'),
          supabase
            .from('recurring_overrides')
            .select('*'),
          supabase
            .from('settings')
            .select('*')
            .single(),
          getLastReviewDate(),
        ])

        setAccounts((accData as Account[]) ?? [])
        setTransactions((txData as Transaction[]) ?? [])
        setSchedules((schedData as RecurringSchedule[]) ?? [])
        setSkips((skipData as RecurringSkip[]) ?? [])
        setOverrides((ovrData as RecurringOverride[]) ?? [])
        setSettings(settingsData as Settings ?? null)
        setLastReviewDate(lastReviewDateVal)
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  // Filter to reviewable accounts: non-Tracking, non-EXTERNAL
  const reviewableAccounts = accounts.filter(
    a => a.type !== 'TRACKING' && a.type !== 'EXTERNAL'
  )

  // Compute budgets for all reviewable accounts at the review date
  const budgetBalances = new Map<string, number>()
  if (reviewableAccounts.length > 0) {
    const allBudgets = calculateAllBudgets(
      reviewableAccounts,
      reviewDate,
      transactions,
      schedules,
      skips,
      overrides,
    )
    for (const account of reviewableAccounts) {
      const budget = allBudgets.get(account.id)
      budgetBalances.set(account.id, budget ? fromDecimal(budget) : account.opening_balance)
    }
  }

  function handleDateContinue(date: Date) {
    setReviewDate(date)
    setPhase('review-flow')
  }

  async function handleFlowComplete(completedEntries: ReviewEntryData[]) {
    setEntries(completedEntries)
    setPhase('saving')

    try {
      await saveReview({
        reviewDate: reviewDate.toISOString().split('T')[0],
        entries: completedEntries.map(e => ({
          account_id: e.accountId,
          actual_balance: e.actualBalance,
          budget_balance: e.budgetBalance,
          variance: e.variance,
          was_skipped: e.wasSkipped,
        })),
      })
      setPhase('summary')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save review')
      setPhase('review-flow') // Allow retry
    }
  }

  function handleCancel() {
    if (phase === 'review-flow' && entries.length > 0) {
      if (confirm('Discard this review? All progress will be lost.')) {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-[15px] text-black/30">Loading...</p>
      </div>
    )
  }

  if (error && phase === 'date-confirm') {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center px-6">
        <p className="text-[17px] font-semibold text-red-500 mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="h-[44px] px-6 rounded-xl bg-[#1c1c1e] text-white text-[15px] font-medium"
        >
          Go Back
        </button>
      </div>
    )
  }

  switch (phase) {
    case 'date-confirm':
      return (
        <ReviewDateConfirm
          lastReviewDate={lastReviewDate}
          onContinue={handleDateContinue}
        />
      )

    case 'review-flow':
      return (
        <ReviewFlow
          reviewDate={reviewDate}
          accounts={reviewableAccounts}
          budgetBalances={budgetBalances}
          onComplete={handleFlowComplete}
          onCancel={handleCancel}
        />
      )

    case 'saving':
      return (
        <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
          <div className="text-center">
            <p className="text-[17px] font-semibold text-black/40">
              Saving review...
            </p>
          </div>
        </div>
      )

    case 'summary':
      return (
        <ReviewSummary
          entries={entries}
          accounts={reviewableAccounts}
          summaryTargetDate={settings?.summary_target_date ?? null}
          storedTransactions={transactions}
          recurringSchedules={schedules}
          recurringSkips={skips}
          recurringOverrides={overrides}
          onDone={() => router.push('/')}
        />
      )

    default:
      return null
  }
}
