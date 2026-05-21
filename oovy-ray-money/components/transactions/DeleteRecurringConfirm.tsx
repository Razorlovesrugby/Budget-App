'use client'

import { useState } from 'react'
import type { RecurringSchedule, Account } from '@/types'
import type { EditScope } from '@/components/transactions/RecurringForm'
import { getNextOccurrenceDate, formatNextOccurrence } from '@/lib/forecast/next-occurrence'
import { getEffectiveAmounts } from '@/lib/forecast/effective-amount'
import { fromDecimal } from '@/lib/utils/money'
import { toDateString } from '@/lib/utils/dates'
import DatePicker from '@/components/ui/DatePicker'

interface DeleteRecurringConfirmProps {
  schedule: RecurringSchedule
  accounts: Account[]
  onDelete: (scope: EditScope, effectiveDate?: string) => Promise<void>
  onCancel: () => void
}

const FREQUENCY_LABEL: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  BIANNUAL: 'Biannual',
}

const CURRENCY_PREFIX: Record<string, string> = {
  GBP: '£',
  NZD: 'NZ$',
}

export default function DeleteRecurringConfirm({
  schedule,
  onDelete,
  onCancel,
}: DeleteRecurringConfirmProps) {
  const [scope, setScope] = useState<EditScope>('future')
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextOccurrence = getNextOccurrenceDate(schedule)
  const nextLabel = formatNextOccurrence(nextOccurrence)

  // Current amount display
  const amounts = getEffectiveAmounts(schedule.effective_changes, new Date())
  const amountDisplay = fromDecimal(amounts.amountFrom)
  const currency = schedule.currency_from

  const handleDelete = async () => {
    setConfirming(true)
    setError(null)
    try {
      const dateForScope =
        scope === 'this'
          ? nextOccurrence ? toDateString(nextOccurrence) : toDateString(new Date())
          : scope === 'future'
          ? toDateString(effectiveDate)
          : undefined

      await onDelete(scope, dateForScope)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-[20px] mx-5 max-w-[340px] w-full p-6 shadow-xl animate-scale-in">
        <h2 className="text-[18px] font-bold text-[#1c1c1e] mb-2">
          Delete Recurring Transaction?
        </h2>

        {/* Schedule summary */}
        <p className="text-[14px] font-medium text-[#1c1c1e]">
          {schedule.name || 'Untitled'}
        </p>
        <p className="text-[13px] text-black/35 mb-4">
          {CURRENCY_PREFIX[currency]}{amountDisplay.toLocaleString('en-GB', { minimumFractionDigits: 2 })} · {FREQUENCY_LABEL[schedule.frequency] || schedule.frequency}
        </p>

        {/* Scope options */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Scope 1: Skip this occurrence */}
          <DeleteScopeOption
            label="Skip this occurrence"
            detail={nextLabel ? `(${nextLabel})` : ''}
            selected={scope === 'this'}
            onSelect={() => setScope('this')}
          />

          {/* Scope 2: End series */}
          <DeleteScopeOption
            label="End series after"
            selected={scope === 'future'}
            onSelect={() => setScope('future')}
            detail={
              <button
                onClick={() => setShowDatePicker(true)}
                className="text-[13px] text-black/45 underline ml-1"
              >
                {toDateString(effectiveDate)}
              </button>
            }
          />

          {/* Scope 3: Delete entire series */}
          <DeleteScopeOption
            label="Delete entire series"
            selected={scope === 'all'}
            onSelect={() => setScope('all')}
            destructive
          />
        </div>

        {/* Warning for Scope 3 */}
        {scope === 'all' && (
          <p className="text-[12px] text-red-500 mb-4">
            This will remove all history for this transaction. This cannot be undone.
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="text-[14px] text-red-500 text-center mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 h-[44px] rounded-xl bg-black/[0.04] text-[15px] font-medium text-[#1c1c1e]
              hover:bg-black/[0.08] transition-colors
              active:scale-[0.98] transition-transform
              disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirming}
            className={`flex-1 h-[44px] rounded-xl text-[15px] font-medium text-white
              transition-colors active:scale-[0.98] transition-transform
              disabled:opacity-30
              ${scope === 'all'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#1c1c1e] hover:bg-black/90'
              }`}
          >
            {confirming
              ? 'Deleting...'
              : scope === 'all'
              ? 'Delete All'
              : 'Delete'}
          </button>
        </div>
      </div>

      {/* Date picker for Scope 2 */}
      {showDatePicker && (
        <DatePicker
          value={effectiveDate}
          onChange={(d) => {
            setEffectiveDate(d)
            setShowDatePicker(false)
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.92);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function DeleteScopeOption({
  label,
  selected,
  onSelect,
  detail,
  destructive,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  detail?: React.ReactNode
  destructive?: boolean
}) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-2 text-left"
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0
          ${selected
            ? destructive
              ? 'border-red-500'
              : 'border-[#1c1c1e]'
            : 'border-black/[0.12]'
          }`}
      >
        {selected && (
          <div className={`w-2.5 h-2.5 rounded-full ${destructive ? 'bg-red-500' : 'bg-[#1c1c1e]'}`} />
        )}
      </div>
      <span className={`text-[14px] ${destructive ? 'text-red-500' : 'text-[#1c1c1e]'}`}>
        {label}
      </span>
      {detail}
    </button>
  )
}
