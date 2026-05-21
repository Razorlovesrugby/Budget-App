'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Account, RecurringSchedule, Frequency, Currency } from '@/types'
import type { RecurringFormData } from '@/types'
import { getEffectiveAmounts } from '@/lib/forecast/effective-amount'
import { fromDecimal } from '@/lib/utils/money'
import { parseDate, toDateString, getSafeDayOfMonth } from '@/lib/utils/dates'
import { addDays, getDay, startOfDay } from 'date-fns'
import AccountPicker from '@/components/accounts/AccountPicker'
import DatePicker from '@/components/ui/DatePicker'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FormMode = 'add' | 'edit'

export type EditScope = 'this' | 'future' | 'all'

interface RecurringFormProps {
  mode: FormMode
  initialValues?: RecurringSchedule
  onSubmit: (data: RecurringFormData, scope: EditScope, effectiveDate?: string) => Promise<void>
  onCancel: () => void
  onDeleteClick?: () => void
  allAccounts: Account[]
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const CURRENCY_PREFIX: Record<Currency, string> = { GBP: '£', NZD: 'NZ$' }

const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  BIANNUAL: 'Biannual',
}

const FREQUENCY_DESCRIPTIONS: Record<Frequency, string> = {
  WEEKLY: 'Every week on [day]',
  FORTNIGHTLY: 'Every 14 days',
  MONTHLY: 'Every month on [day]',
  QUARTERLY: 'Every 3 months on [day]',
  BIANNUAL: 'Every 6 months on [day]',
}

const DAY_OF_WEEK_LABELS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function snapStartDate(frequency: Frequency, dayOfWeekVal: number | null, dayOfMonthVal: number | null): Date {
  const today = startOfDay(new Date())

  switch (frequency) {
    case 'WEEKLY': {
      if (dayOfWeekVal === null) return today
      const targetDay = dayOfWeekVal
      const currentDay = getDay(today)
      const diff = (targetDay - currentDay + 7) % 7
      return diff === 0 ? today : addDays(today, diff)
    }
    case 'MONTHLY': {
      const targetDay = dayOfMonthVal ?? 1
      const todayDate = new Date()
      const thisMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), getSafeDayOfMonth(todayDate.getFullYear(), todayDate.getMonth() + 1, targetDay))
      if (thisMonth >= startOfDay(today)) return thisMonth
      return new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, getSafeDayOfMonth(todayDate.getFullYear(), todayDate.getMonth() + 2, targetDay))
    }
    case 'FORTNIGHTLY':
      return today
    case 'QUARTERLY':
    case 'BIANNUAL': {
      const targetDay2 = dayOfMonthVal ?? 1
      const today2 = new Date()
      const thisMonth2 = new Date(today2.getFullYear(), today2.getMonth(), getSafeDayOfMonth(today2.getFullYear(), today2.getMonth() + 1, targetDay2))
      if (thisMonth2 >= startOfDay(today)) return thisMonth2
      return new Date(today2.getFullYear(), today2.getMonth() + 1, getSafeDayOfMonth(today2.getFullYear(), today2.getMonth() + 2, targetDay2))
    }
  }
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RecurringForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  onDeleteClick,
  allAccounts,
}: RecurringFormProps) {
  const isEdit = mode === 'edit'

  // ─── Form State ──────────────────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? '')
  const [amount, setAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromAccount, setFromAccount] = useState<Account | null>(null)
  const [toAccount, setToAccount] = useState<Account | null>(null)
  const [frequency, setFrequency] = useState<Frequency>(initialValues?.frequency ?? 'MONTHLY')
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialValues?.day_of_week ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState<number>(initialValues?.day_of_month ?? 1)
  const [weekdayOnly, setWeekdayOnly] = useState(initialValues?.weekday_only ?? false)
  const [startDate, setStartDate] = useState<Date>(
    initialValues ? parseDate(initialValues.start_date) : snapStartDate('MONTHLY', null, 1)
  )
  const [scope, setScope] = useState<EditScope>(isEdit ? 'future' : 'all')
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date())

  // ─── Picker visibility
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false)
  const [showDayOfWeekPicker, setShowDayOfWeekPicker] = useState(false)
  const [showDayOfMonthPicker, setShowDayOfMonthPicker] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEffectiveDatePicker, setShowEffectiveDatePicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Derived ─────────────────────────────────────────────────────────────
  const isCrossCurrency = useMemo(() => {
    if (!fromAccount || !toAccount) return false
    return fromAccount.currency !== toAccount.currency
  }, [fromAccount, toAccount])

  const isDayOfWeekField = frequency === 'WEEKLY'
  const isDayOfMonthField = frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'BIANNUAL'

  const accountsForFrom = allAccounts.filter(a => a.id !== toAccount?.id)
  const accountsForTo = allAccounts.filter(a => a.id !== fromAccount?.id)

  // Init from initialValues (edit mode)
  useEffect(() => {
    if (!initialValues || mode !== 'edit') return
    const fromAcct = allAccounts.find(a => a.id === initialValues.from_account_id)
    const toAcct = allAccounts.find(a => a.id === initialValues.to_account_id)
    if (fromAcct) setFromAccount(fromAcct)
    if (toAcct) setToAccount(toAcct)

    const amounts = getEffectiveAmounts(initialValues.effective_changes, new Date())
    setAmount(fromDecimal(amounts.amountFrom).toString())
    if (initialValues.currency_from !== initialValues.currency_to) {
      setToAmount(fromDecimal(amounts.amountTo).toString())
    }
  }, [initialValues, mode, allAccounts])

  // Snap start date when frequency/anchors change (add mode only)
  useEffect(() => {
    if (mode !== 'add') return
    const d = snapStartDate(
      frequency,
      isDayOfWeekField ? dayOfWeek : null,
      isDayOfMonthField ? dayOfMonth : null
    )
    setStartDate(d)
  }, [frequency, dayOfWeek, dayOfMonth, mode, isDayOfWeekField, isDayOfMonthField])

  // ─── Validation ──────────────────────────────────────────────────────────
  const canSubmit = useMemo(() => {
    if (!fromAccount || !toAccount) return false
    if (fromAccount.id === toAccount.id) return false
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return false
    if (isCrossCurrency) {
      const toAmountNum = parseFloat(toAmount)
      if (isNaN(toAmountNum) || toAmountNum <= 0) return false
    }
    return true
  }, [fromAccount, toAccount, amount, toAmount, isCrossCurrency])

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || !fromAccount || !toAccount) return
    setSubmitting(true)
    setError(null)

    try {
      const formData: RecurringFormData = {
        name: name.trim() || null,
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount: parseFloat(amount),
        to_amount: isCrossCurrency ? parseFloat(toAmount) : null,
        currency_from: fromAccount.currency,
        currency_to: toAccount.currency,
        frequency,
        day_of_week: isDayOfWeekField ? dayOfWeek : null,
        day_of_month: isDayOfMonthField ? dayOfMonth : null,
        weekday_only: weekdayOnly,
        start_date: toDateString(startDate),
      }

      await onSubmit(
        formData,
        isEdit ? scope : 'all',
        scope === 'future' ? toDateString(effectiveDate) : undefined
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-8 px-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <h1 className="text-[22px] font-bold text-[#1c1c1e]">
            {mode === 'add' ? 'Add Recurring' : 'Edit Recurring'}
          </h1>
          <div className="w-[52px]" />
        </div>

        {/* Scope selector (edit mode only) */}
        {isEdit && (
          <div className="bg-white rounded-[18px] px-5 py-4 mb-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] font-semibold text-black/25 uppercase tracking-wide mb-3">Scope</p>
            <div className="flex flex-col gap-2">
              <ScopeOption label="This occurrence only" selected={scope === 'this'} onSelect={() => setScope('this')} />
              <ScopeOption
                label="All future"
                selected={scope === 'future'}
                onSelect={() => setScope('future')}
                detail={
                  scope === 'future' ? (
                    <button onClick={() => setShowEffectiveDatePicker(true)} className="text-[13px] text-black/45 underline ml-1">
                      from {toDateString(effectiveDate)}
                    </button>
                  ) : undefined
                }
              />
              <ScopeOption label="Entire series (all occurrences)" selected={scope === 'all'} onSelect={() => setScope('all')} />
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="flex flex-col gap-[10px]">
          {/* Name */}
          <div className="bg-white rounded-[18px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">Name</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Optional"
                className="text-right text-[15px] text-black/45 bg-transparent outline-none placeholder:text-black/20"
              />
            </div>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-[18px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">Amount</span>
              <div className="flex items-center gap-1">
                <span className="text-[15px] text-black/25">
                  {fromAccount ? CURRENCY_PREFIX[fromAccount.currency] : '£'}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-[100px] text-right text-[15px] text-[#1c1c1e] bg-transparent outline-none placeholder:text-black/20"
                />
              </div>
            </div>

            {/* Cross-currency: second amount */}
            {isCrossCurrency && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.04]">
                <span className="text-[15px] font-medium text-[#1c1c1e]">To Amount</span>
                <div className="flex items-center gap-1">
                  <span className="text-[15px] text-black/25">
                    {toAccount ? CURRENCY_PREFIX[toAccount.currency] : '£'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={toAmount}
                    onChange={e => setToAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-[100px] text-right text-[15px] text-[#1c1c1e] bg-transparent outline-none placeholder:text-black/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* From account */}
          <button
            onClick={() => setShowFromPicker(true)}
            className="bg-white rounded-[18px] px-5 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-black/[0.01] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">From</span>
              <span className="text-[15px] text-black/45">
                {fromAccount ? fromAccount.name : 'Select account'}
              </span>
            </div>
          </button>

          {/* To account */}
          <button
            onClick={() => setShowToPicker(true)}
            className="bg-white rounded-[18px] px-5 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-black/[0.01] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">To</span>
              <span className="text-[15px] text-black/45">
                {toAccount ? toAccount.name : 'Select account'}
              </span>
            </div>
          </button>

          {/* Frequency */}
          <button
            onClick={() => setShowFrequencyPicker(true)}
            className="bg-white rounded-[18px] px-5 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-black/[0.01] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">Frequency</span>
              <span className="text-[15px] text-black/45">{FREQUENCY_LABELS[frequency]}</span>
            </div>
          </button>

          {/* Day of week (WEEKLY) */}
          {isDayOfWeekField && (
            <button
              onClick={() => setShowDayOfWeekPicker(true)}
              className="bg-white rounded-[18px] px-5 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-black/[0.01] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#1c1c1e]">Day of Week</span>
                <span className="text-[15px] text-black/45">{DAY_OF_WEEK_LABELS[dayOfWeek]}</span>
              </div>
            </button>
          )}

          {/* Day of month (MONTHLY/QUARTERLY/BIANNUAL) */}
          {isDayOfMonthField && (
            <button
              onClick={() => setShowDayOfMonthPicker(true)}
              className="bg-white rounded-[18px] px-5 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-black/[0.01] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#1c1c1e]">Day of Month</span>
                <span className="text-[15px] text-black/45">{dayOfMonth}{ordinalSuffix(dayOfMonth)}</span>
              </div>
            </button>
          )}

          {/* Start Date */}
          <button
            onClick={() => setShowStartDatePicker(true)}
            className="bg-white rounded-[18px] px-5 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-black/[0.01] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">Start Date</span>
              <span className="text-[15px] text-black/45">
                {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </button>

          {/* Weekday only toggle */}
          {(scope === 'all' || mode === 'add') ? (
            <div className="bg-white rounded-[18px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[15px] font-medium text-[#1c1c1e]">Weekday only</span>
                  {weekdayOnly && (
                    <p className="text-[12px] text-black/25 mt-0.5">
                      When ON, moves weekend occurrences to the Friday before
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setWeekdayOnly(!weekdayOnly)}
                  className={`w-[51px] h-[31px] rounded-full relative transition-colors ${weekdayOnly ? 'bg-[#34c759]' : 'bg-black/[0.12]'}`}
                >
                  <div className={`w-[27px] h-[27px] rounded-full bg-white shadow absolute top-[2px] transition-transform ${weekdayOnly ? 'translate-x-[21px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>
            </div>
          ) : scope === 'future' ? (
            <div className="bg-white rounded-[18px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] opacity-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[15px] font-medium text-[#1c1c1e]">Weekday only</span>
                  <p className="text-[12px] text-black/25 mt-0.5">
                    {weekdayOnly ? 'ON' : 'OFF'} · Change in Entire Series mode
                  </p>
                </div>
                <div className={`w-[51px] h-[31px] rounded-full relative ${weekdayOnly ? 'bg-[#34c759]/50' : 'bg-black/[0.06]'}`}>
                  <div className={`w-[27px] h-[27px] rounded-full bg-white shadow absolute top-[2px] ${weekdayOnly ? 'translate-x-[21px]' : 'translate-x-[2px]'}`} />
                </div>
              </div>
            </div>
          ) : null}

          {/* Error */}
          {error && <p className="text-[14px] text-red-500 text-center">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="mt-2 w-full h-[50px] rounded-[14px] bg-[#1c1c1e] text-white text-[17px] font-semibold hover:bg-black/90 transition-colors disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-transform"
          >
            {submitting ? 'Saving...' : mode === 'add' ? 'Add Recurring' : 'Save Changes'}
          </button>

          {/* Delete button (edit mode) */}
          {isEdit && onDeleteClick && (
            <button
              onClick={onDeleteClick}
              className="w-full h-[50px] rounded-[14px] bg-transparent text-[15px] text-red-500 font-medium hover:bg-red-50 transition-colors active:scale-[0.98] transition-transform"
            >
              Delete Recurring Transaction...
            </button>
          )}
        </div>
      </div>

      {/* ─── Pickers ─────────────────────────────────────────────────────── */}

      {showFromPicker && (
        <AccountPicker
          accounts={accountsForFrom}
          selectedId={fromAccount?.id ?? null}
          excludeId={toAccount?.id ?? null}
          onSelect={(account) => { setFromAccount(account); setShowFromPicker(false) }}
          onClose={() => setShowFromPicker(false)}
          showExternal={true}
        />
      )}

      {showToPicker && (
        <AccountPicker
          accounts={accountsForTo}
          selectedId={toAccount?.id ?? null}
          excludeId={fromAccount?.id ?? null}
          onSelect={(account) => { setToAccount(account); setShowToPicker(false) }}
          onClose={() => setShowToPicker(false)}
          showExternal={true}
        />
      )}

      {showFrequencyPicker && (
        <PickerSheet title="Frequency" onClose={() => setShowFrequencyPicker(false)}>
          <div className="mx-4 rounded-2xl overflow-hidden bg-black/[0.02]">
            {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL'] as Frequency[]).map((freq) => (
              <button
                key={freq}
                onClick={() => { setFrequency(freq); setShowFrequencyPicker(false) }}
                className={`w-full flex items-center justify-between px-5 h-[52px] hover:bg-black/[0.03] transition-colors ${frequency === freq ? 'bg-black/[0.04]' : ''}`}
              >
                <div>
                  <span className="text-[14px] font-medium text-[#1c1c1e]">{FREQUENCY_LABELS[freq]}</span>
                  <p className="text-[12px] text-black/25">{FREQUENCY_DESCRIPTIONS[freq]}</p>
                </div>
                {frequency === freq && <Checkmark />}
              </button>
            ))}
          </div>
        </PickerSheet>
      )}

      {showDayOfWeekPicker && (
        <PickerSheet title="Day of Week" onClose={() => setShowDayOfWeekPicker(false)}>
          <div className="mx-4 rounded-2xl overflow-hidden bg-black/[0.02]">
            {DAY_OF_WEEK_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => { setDayOfWeek(idx); setShowDayOfWeekPicker(false) }}
                className={`w-full flex items-center justify-between px-5 h-[52px] hover:bg-black/[0.03] transition-colors ${dayOfWeek === idx ? 'bg-black/[0.04]' : ''}`}
              >
                <span className="text-[14px] font-medium text-[#1c1c1e]">{label}</span>
                {dayOfWeek === idx && <Checkmark />}
              </button>
            ))}
          </div>
        </PickerSheet>
      )}

      {showDayOfMonthPicker && (
        <PickerSheet title="Day of Month" onClose={() => setShowDayOfMonthPicker(false)}>
          <div className="grid grid-cols-7 gap-1 mx-4">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                onClick={() => { setDayOfMonth(d); setShowDayOfMonthPicker(false) }}
                className={`h-[44px] rounded-xl flex items-center justify-center text-[15px] font-medium transition-colors ${dayOfMonth === d ? 'bg-[#1c1c1e] text-white' : 'text-[#1c1c1e] hover:bg-black/[0.04]'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-center text-[12px] text-black/20 mt-3">Last day of month is always safe</p>
        </PickerSheet>
      )}

      {showStartDatePicker && (
        <DatePicker
          value={startDate}
          onChange={(d) => { setStartDate(d); setShowStartDatePicker(false) }}
          onClose={() => setShowStartDatePicker(false)}
        />
      )}

      {showEffectiveDatePicker && (
        <DatePicker
          value={effectiveDate}
          onChange={(d) => { setEffectiveDate(d); setShowEffectiveDatePicker(false) }}
          onClose={() => setShowEffectiveDatePicker(false)}
        />
      )}
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ScopeOption({
  label,
  selected,
  onSelect,
  detail,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  detail?: React.ReactNode
}) {
  return (
    <button onClick={onSelect} className="flex items-start gap-2 text-left">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${selected ? 'border-[#1c1c1e]' : 'border-black/[0.12]'}`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e]" />}
      </div>
      <span className="text-[14px] text-[#1c1c1e]">{label}</span>
      {detail}
    </button>
  )
}

function Checkmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PickerSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up pb-8">
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <h2 className="text-[17px] font-semibold text-[#1c1c1e]">{title}</h2>
          <button onClick={onClose} className="text-[15px] text-black/45 hover:text-black/70">Done</button>
        </div>
        <div className="flex justify-center pb-2 shrink-0">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        <div className="h-8 shrink-0" />
      </div>
      <style jsx>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
      `}</style>
    </div>
  )
}
