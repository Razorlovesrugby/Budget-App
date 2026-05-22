'use client'

import { useState, useMemo } from 'react'
import { format, isBefore, startOfDay } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { parseDate, toDateString } from '@/lib/utils/dates'
import { formatMoney, toDecimal } from '@/lib/utils/money'
import type { Account, Transaction, RecurringSchedule } from '@/types'
import type { EditScope } from '@/components/transactions/RecurringForm'
import AccountPicker from '@/components/accounts/AccountPicker'
import DatePicker from '@/components/ui/DatePicker'
import {
  createOverride,
  appendEffectiveChange,
  updateRecurringSchedule,
  createSkip,
  endSeriesAfter,
  deleteSchedule,
} from '@/lib/db/recurring'

interface TransactionDetailPanelProps {
  transaction: Transaction
  accounts: Account[]
  schedules: RecurringSchedule[]
  readOnly: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

type DeleteFlow = 'none' | 'confirming'

export function TransactionDetailPanel({
  transaction,
  accounts,
  schedules,
  readOnly,
  onClose,
  onSave,
  onDelete,
}: TransactionDetailPanelProps) {
  const supabase = createSupabaseBrowserClient()

  const schedule = useMemo(
    () => (transaction.recurring_id ? schedules.find((s) => s.id === transaction.recurring_id) : null),
    [transaction, schedules]
  )

  const [amount, setAmount] = useState(String(transaction.amount_from))
  const [txName, setTxName] = useState(transaction.name ?? '')
  const [fromId, setFromId] = useState(transaction.from_account_id)
  const [toId, setToId] = useState(transaction.to_account_id)
  const [date, setDate] = useState<Date>(parseDate(transaction.transaction_date))
  const [editScope, setEditScope] = useState<EditScope>('this')
  const [deleteFlow, setDeleteFlow] = useState<DeleteFlow>('none')
  const [deleteScope, setDeleteScope] = useState<EditScope>('this')
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromAccount = accounts.find((a) => a.id === fromId)
  const toAccount = accounts.find((a) => a.id === toId)
  const isCrossCurrency = !!(fromAccount && toAccount && fromAccount.currency !== toAccount.currency)

  const isPast = isBefore(startOfDay(parseDate(transaction.transaction_date)), startOfDay(new Date()))
  const effectiveReadOnly = readOnly || isPast

  const amountDisplay = formatMoney(toDecimal(transaction.amount_from), transaction.currency_from)

  const handleSave = async () => {
    if (effectiveReadOnly) return
    setIsSaving(true)
    setError(null)

    try {
      const amountFromVal = parseFloat(amount)
      const amountToVal = isCrossCurrency ? transaction.amount_to : amountFromVal
      const dateISO = toDateString(date)

      if (schedule && transaction.recurring_id) {
        if (editScope === 'this') {
          await createOverride(transaction.recurring_id, {
            original_date: transaction.transaction_date,
            amount_from: amountFromVal,
            amount_to: amountToVal,
            name: txName.trim() || null,
            override_date: dateISO,
          })
        } else if (editScope === 'future') {
          await appendEffectiveChange(transaction.recurring_id, dateISO, {
            amount_from: amountFromVal,
            amount_to: amountToVal,
          })
        } else {
          await updateRecurringSchedule(transaction.recurring_id, {
            name: txName.trim() || null,
          })
        }
      }

      // Update the transaction row itself
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          name: txName.trim() || null,
          from_account_id: fromId,
          to_account_id: toId,
          amount_from: amountFromVal,
          amount_to: amountToVal,
          transaction_date: dateISO,
        })
        .eq('id', transaction.id)

      if (updateError) throw updateError
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (effectiveReadOnly) return
    setIsDeleting(true)
    setError(null)

    try {
      if (schedule && transaction.recurring_id) {
        const dateISO = transaction.transaction_date
        if (deleteScope === 'this') {
          await createSkip(transaction.recurring_id, dateISO)
        } else if (deleteScope === 'future') {
          await endSeriesAfter(transaction.recurring_id, dateISO)
        } else {
          await deleteSchedule(transaction.recurring_id)
        }
      }

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      if (deleteError) throw deleteError
      onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-y-auto"
        style={{ width: 360, borderRadius: '20px 0 0 20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">
            {effectiveReadOnly ? 'Transaction' : 'Edit Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-[22px] text-black/30 hover:text-black/60 transition-colors leading-none w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 px-6 pb-6 flex flex-col gap-4">
          {/* Amount display */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-black/30 uppercase tracking-wide mb-1">Amount</p>
            {effectiveReadOnly ? (
              <p className="text-[28px] font-bold text-[#1c1c1e] tabular-nums">{amountDisplay}</p>
            ) : (
              <div className="flex items-baseline">
                <span className="text-[28px] font-bold text-[#1c1c1e]">
                  {fromAccount?.currency === 'NZD' ? 'NZ$' : '£'}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 text-[28px] font-bold text-[#1c1c1e] bg-transparent border-none outline-none"
                />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            {effectiveReadOnly ? (
              <div className="px-4 py-3.5">
                <p className="text-[13px] text-black/40 mb-0.5">Name</p>
                <p className="text-[14px] font-medium text-[#1c1c1e]">{transaction.name || 'Untitled'}</p>
              </div>
            ) : (
              <input
                type="text"
                value={txName}
                onChange={(e) => setTxName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full px-4 py-3.5 text-[14px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/25"
              />
            )}
          </div>

          {/* Date */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            <button
              disabled={effectiveReadOnly}
              onClick={() => !effectiveReadOnly && setShowDatePicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors disabled:cursor-default hover:bg-black/[0.02]"
            >
              <span className="text-[13px] text-black/40">Date</span>
              <span className="text-[14px] font-medium text-[#1c1c1e]">
                {format(date, 'd MMM yyyy')}
              </span>
            </button>
          </div>

          {/* From / To */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            <button
              disabled={effectiveReadOnly}
              onClick={() => !effectiveReadOnly && setShowFromPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-black/[0.02] disabled:cursor-default"
            >
              <span className="text-[13px] text-black/40">From</span>
              <span className="text-[14px] font-medium text-[#1c1c1e]">
                {fromAccount?.name ?? fromId}
              </span>
            </button>
            <div className="h-px bg-black/5 mx-4" />
            <button
              disabled={effectiveReadOnly}
              onClick={() => !effectiveReadOnly && setShowToPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-black/[0.02] disabled:cursor-default"
            >
              <span className="text-[13px] text-black/40">To</span>
              <span className="text-[14px] font-medium text-[#1c1c1e]">
                {toAccount?.name ?? toId}
              </span>
            </button>
          </div>

          {/* Recurring edit scope */}
          {schedule && !effectiveReadOnly && (
            <div className="rounded-2xl bg-black/[0.04] px-4 py-4">
              <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wide mb-3">
                Recurring — Edit scope
              </p>
              <div className="flex flex-col gap-2.5">
                {([
                  { value: 'this' as EditScope, label: 'This occurrence only' },
                  { value: 'future' as EditScope, label: 'All future from this date' },
                  { value: 'all' as EditScope, label: 'Entire series' },
                ] as { value: EditScope; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditScope(opt.value)}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      editScope === opt.value ? 'border-[#1c1c1e]' : 'border-black/15'
                    }`}>
                      {editScope === opt.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e]" />
                      )}
                    </div>
                    <span className="text-[13px] text-[#1c1c1e]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delete scope for recurring */}
          {deleteFlow === 'confirming' && schedule && (
            <div className="rounded-2xl bg-red-50 px-4 py-4">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-3">
                Delete — Choose scope
              </p>
              <div className="flex flex-col gap-2.5 mb-4">
                {([
                  { value: 'this' as EditScope, label: 'Skip this occurrence' },
                  { value: 'future' as EditScope, label: 'End series from this date' },
                  { value: 'all' as EditScope, label: 'Delete entire series' },
                ] as { value: EditScope; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDeleteScope(opt.value)}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      deleteScope === opt.value ? 'border-red-500' : 'border-black/15'
                    }`}>
                      {deleteScope === opt.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      )}
                    </div>
                    <span className={`text-[13px] ${deleteScope === opt.value && opt.value === 'all' ? 'text-red-500' : 'text-[#1c1c1e]'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteFlow('none')}
                  className="flex-1 h-10 rounded-xl bg-black/[0.06] text-[14px] font-medium text-[#1c1c1e]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 h-10 rounded-xl bg-red-500 text-[14px] font-medium text-white disabled:opacity-40"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          )}

          {effectiveReadOnly && (
            <div className="rounded-xl bg-black/[0.04] px-4 py-3">
              <p className="text-[12px] text-black/40 text-center">
                Past transactions are read-only
              </p>
            </div>
          )}

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          {/* Actions */}
          {!effectiveReadOnly && deleteFlow === 'none' && (
            <div className="flex gap-2 mt-auto pt-2">
              <button
                onClick={() => {
                  if (schedule) {
                    setDeleteFlow('confirming')
                  } else {
                    handleDelete()
                  }
                }}
                disabled={isDeleting}
                className="flex-1 h-[48px] rounded-[14px] bg-red-500/10 text-red-500 text-[15px] font-semibold disabled:opacity-40 hover:bg-red-500/15 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-[48px] rounded-[14px] bg-[#1c1c1e] text-white text-[15px] font-semibold disabled:opacity-40 hover:bg-black/90 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showFromPicker && (
        <AccountPicker
          accounts={accounts}
          selectedId={fromId}
          excludeId={toId}
          onSelect={(acc) => { setFromId(acc.id); setShowFromPicker(false) }}
          onClose={() => setShowFromPicker(false)}
          showExternal={false}
        />
      )}

      {showToPicker && (
        <AccountPicker
          accounts={accounts}
          selectedId={toId}
          excludeId={fromId}
          onSelect={(acc) => { setToId(acc.id); setShowToPicker(false) }}
          onClose={() => setShowToPicker(false)}
          showExternal={true}
        />
      )}

      {showDatePicker && (
        <DatePicker
          value={date}
          onChange={(d) => { setDate(d); setShowDatePicker(false) }}
          onClose={() => setShowDatePicker(false)}
          minDate={new Date('2024-08-01')}
        />
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  )
}
