'use client'

import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toDateString } from '@/lib/utils/dates'
import type { Account, Frequency, NewTransaction, RecurringFormData } from '@/types'
import AccountPicker from '@/components/accounts/AccountPicker'
import DatePicker from '@/components/ui/DatePicker'
import { createRecurringSchedule } from '@/lib/db/recurring'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'BIANNUAL', label: 'Biannual' },
]

interface GridAddTransactionPanelProps {
  accounts: Account[]
  prefilledAccountId: string
  prefilledDate: Date
  onClose: () => void
  onSuccess: () => void
}

export function GridAddTransactionPanel({
  accounts,
  prefilledAccountId,
  prefilledDate,
  onClose,
  onSuccess,
}: GridAddTransactionPanelProps) {
  const supabase = createSupabaseBrowserClient()

  const [amount, setAmount] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [fromId, setFromId] = useState<string | null>(prefilledAccountId || null)
  const [toId, setToId] = useState<string | null>(null)
  const [date, setDate] = useState<Date>(prefilledDate)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY')
  const [weekdayOnly, setWeekdayOnly] = useState(false)
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromAccount = useMemo(() => accounts.find((a) => a.id === fromId) ?? null, [accounts, fromId])
  const toAccount = useMemo(() => accounts.find((a) => a.id === toId) ?? null, [accounts, toId])
  const isCrossCurrency = !!(fromAccount && toAccount && fromAccount.currency !== toAccount.currency)
  const currencyPrefix = fromAccount?.currency === 'NZD' ? 'NZ$' : '£'

  const isValid = useMemo(() => {
    const a = parseFloat(isCrossCurrency ? amount : amount)
    const hasAmount = !isNaN(a) && a > 0
    const hasAmountTo = isCrossCurrency ? (!isNaN(parseFloat(amountTo)) && parseFloat(amountTo) > 0) : true
    return hasAmount && hasAmountTo && fromId !== null && toId !== null && fromId !== toId
  }, [amount, amountTo, fromId, toId, isCrossCurrency])

  const handleSubmit = useCallback(async () => {
    if (!isValid || !fromAccount || !toAccount) return
    setIsSubmitting(true)
    setError(null)

    try {
      const dateISO = toDateString(date)
      const amountFromVal = parseFloat(amount)
      const amountToVal = isCrossCurrency ? parseFloat(amountTo) : amountFromVal

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const txDate = new Date(date)
      txDate.setHours(0, 0, 0, 0)
      const txType = txDate > today ? 'ONE_OFF' : 'TRANSFER'

      let recurringId: string | null = null

      if (isRecurring) {
        const formData: RecurringFormData = {
          name: name.trim() || null,
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount: amountFromVal,
          to_amount: isCrossCurrency ? amountToVal : null,
          currency_from: fromAccount.currency,
          currency_to: toAccount.currency,
          frequency,
          day_of_week: null,
          day_of_month: frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'BIANNUAL'
            ? date.getDate()
            : null,
          weekday_only: weekdayOnly,
          start_date: dateISO,
        }
        recurringId = await createRecurringSchedule(formData)
      }

      const newTx: NewTransaction = {
        name: name.trim() || null,
        type: txType,
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount_from: amountFromVal,
        amount_to: amountToVal,
        currency_from: fromAccount.currency,
        currency_to: toAccount.currency,
        transaction_date: dateISO,
        recurring_id: recurringId,
        is_adjustment: false,
        note: note.trim() || null,
      }

      const { error: insertError } = await supabase.from('transactions').insert(newTx)
      if (insertError) throw insertError

      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add transaction')
    } finally {
      setIsSubmitting(false)
    }
  }, [isValid, fromAccount, toAccount, date, amount, amountTo, isCrossCurrency, name, note, isRecurring, frequency, weekdayOnly, supabase, onSuccess])

  const dateDisplay = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) return `Today, ${format(date, 'd MMM yyyy')}`
    return format(date, 'd MMM yyyy')
  })()

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
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">Add Transaction</h2>
          <button
            onClick={onClose}
            className="text-[22px] text-black/30 hover:text-black/60 transition-colors leading-none w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 px-6 pb-6 flex flex-col gap-4">
          {/* Amount */}
          <div className="flex items-baseline pt-2">
            <span className="text-[32px] font-bold tracking-[-1px] text-[#1c1c1e]">{currencyPrefix}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              autoFocus
              className="flex-1 text-[32px] font-bold tracking-[-1px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/15"
            />
          </div>

          {isCrossCurrency && (
            <div className="flex items-baseline">
              <span className="text-[24px] font-bold text-[#1c1c1e]">
                {toAccount?.currency === 'NZD' ? 'NZ$' : '£'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountTo}
                onChange={(e) => setAmountTo(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="flex-1 text-[24px] font-bold text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/15"
              />
            </div>
          )}

          {/* From / To */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            <button
              onClick={() => setShowFromPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.03] transition-colors"
            >
              <span className="text-[13px] text-black/40">From</span>
              <span className="text-[14px] font-medium text-[#1c1c1e]">
                {fromAccount?.name ?? 'Select account'}
              </span>
            </button>
            <div className="h-px bg-black/5 mx-4" />
            <button
              onClick={() => setShowToPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.03] transition-colors"
            >
              <span className="text-[13px] text-black/40">To</span>
              <span className="text-[14px] font-medium text-[#1c1c1e]">
                {toAccount?.name ?? 'Select account'}
              </span>
            </button>
          </div>

          {/* Date */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            <button
              onClick={() => setShowDatePicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.03] transition-colors"
            >
              <span className="text-[13px] text-black/40">Date</span>
              <span className="text-[14px] font-medium text-[#1c1c1e]">{dateDisplay}</span>
            </button>
          </div>

          {/* Name */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full px-4 py-3.5 text-[14px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/25"
            />
          </div>

          {/* Note */}
          <div className="rounded-2xl bg-black/[0.04] overflow-hidden">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full px-4 py-3.5 text-[14px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/25"
            />
          </div>

          {/* Recurring toggle */}
          <div className="rounded-2xl bg-black/[0.04] px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#1c1c1e]">Make recurring</p>
                <p className="text-[11px] text-black/35">Create a schedule</p>
              </div>
              <button
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isRecurring ? 'bg-[#1c1c1e]' : 'bg-black/15'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {isRecurring && (
              <div className="mt-4 flex flex-col gap-3">
                {/* Frequency */}
                <div className="flex flex-wrap gap-1.5">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFrequency(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                        frequency === f.value
                          ? 'bg-[#1c1c1e] text-white'
                          : 'bg-black/[0.06] text-black/50 hover:bg-black/[0.10]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Weekday only */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1c1c1e]">Weekday only</span>
                  <button
                    onClick={() => setWeekdayOnly(!weekdayOnly)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${weekdayOnly ? 'bg-[#1c1c1e]' : 'bg-black/15'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${weekdayOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full h-[52px] rounded-[16px] bg-[#1c1c1e] text-white text-[16px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/90 transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Transaction'}
          </button>
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
