'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { toDateString } from '@/lib/utils/dates'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Account, TransactionType, NewTransaction } from '@/types'
import AccountPicker from '@/components/accounts/AccountPicker'
import DatePicker from '@/components/ui/DatePicker'
import { useForecastStore } from '@/hooks/useForecast'
import { useQueryClient } from '@tanstack/react-query'

export default function AddTransactionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  // Context from URL
  const fromAccountId = searchParams.get('fromAccountId')
  const prefillDate = searchParams.get('date')
  const returnTo = searchParams.get('returnTo') || '/'

  // State
  const [accounts, setAccounts] = useState<Account[]>([])
  const [amount, setAmount] = useState('')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [selectedFromId, setSelectedFromId] = useState<string | null>(fromAccountId)
  const [selectedToId, setSelectedToId] = useState<string | null>(null)
  const [date, setDate] = useState<Date>(() => {
    if (prefillDate) {
      const d = new Date(prefillDate)
      return isNaN(d.getTime()) ? new Date() : d
    }
    return new Date()
  })
  const [note, setNote] = useState('')
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invalidate = useForecastStore((s) => s.invalidate)

  // Fetch accounts
  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .eq('is_system', false)
        .order('display_order')
      if (data) setAccounts(data as Account[])
    }
    fetchAccounts()
  }, [supabase])

  // Selected account objects
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === selectedFromId) || null,
    [accounts, selectedFromId]
  )
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === selectedToId) || null,
    [accounts, selectedToId]
  )

  // Cross-currency detection
  const isCrossCurrency = useMemo(() => {
    if (!fromAccount || !toAccount) return false
    return fromAccount.currency !== toAccount.currency
  }, [fromAccount, toAccount])

  // Currency prefix for single-currency mode
  const currencyPrefix = fromAccount
    ? fromAccount.currency === 'NZD' ? 'NZ$' : '£'
    : '£'

  // Validation
  const isValid = useMemo(() => {
    if (isCrossCurrency) {
      const af = parseFloat(amountFrom)
      const at = parseFloat(amountTo)
      return (
        !isNaN(af) && af > 0 &&
        !isNaN(at) && at > 0 &&
        selectedFromId !== null &&
        selectedToId !== null &&
        selectedFromId !== selectedToId
      )
    }
    const a = parseFloat(amount)
    return (
      !isNaN(a) && a > 0 &&
      selectedFromId !== null &&
      selectedToId !== null &&
      selectedFromId !== selectedToId
    )
  }, [amount, amountFrom, amountTo, selectedFromId, selectedToId, isCrossCurrency])

  // Switch between single/cross-currency modes when accounts change
  useEffect(() => {
    if (isCrossCurrency && amount && !amountFrom && !amountTo) {
      setAmountFrom(amount)
      setAmountTo('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCrossCurrency])

  // Determine transaction type
  const determineType = useCallback((): TransactionType => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const txDate = new Date(date)
    txDate.setHours(0, 0, 0, 0)

    if (txDate > today) return 'ONE_OFF'
    return 'TRANSFER'
  }, [date])

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !fromAccount || !toAccount) return

    setIsSubmitting(true)
    setError(null)

    try {
      const txDate = toDateString(date)

      const amountFromVal = isCrossCurrency
        ? parseFloat(amountFrom)
        : parseFloat(amount)
      const amountToVal = isCrossCurrency
        ? parseFloat(amountTo)
        : parseFloat(amount)

      const newTx: NewTransaction = {
        name: note.trim() || null,
        type: determineType(),
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount_from: amountFromVal,
        amount_to: amountToVal,
        currency_from: fromAccount.currency,
        currency_to: toAccount.currency,
        transaction_date: txDate,
        recurring_id: null,
        is_adjustment: false,
        note: note.trim() || null,
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTx)

      if (insertError) throw insertError

      // Invalidate React Query cache and legacy forecast store
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      invalidate()

      // Navigate back
      router.push(returnTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push(returnTo)
  }

  // Date display format
  const dateDisplay = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.getTime() === today.getTime()) return `Today, ${format(date, 'd MMM yyyy')}`
    if (d.getTime() === yesterday.getTime()) return `Yesterday, ${format(date, 'd MMM yyyy')}`
    if (d.getTime() === tomorrow.getTime()) return `Tomorrow, ${format(date, 'd MMM yyyy')}`
    return format(date, 'd MMM yyyy')
  })()

  // Get display name for selected account
  const getAccountDisplayName = (account: Account | null) => {
    if (!account) return 'Select'
    return account.name
  }

  return (
    <main className="min-h-screen bg-[#f2f2f7] flex flex-col">
      {/* Header */}
      <div className="h-[54px] shrink-0" />
      <div className="flex items-center justify-between px-6 pb-6 shrink-0">
        <h1 className="text-[22px] font-bold tracking-[-0.5px] text-[#1c1c1e]">
          Add Transaction
        </h1>
        <button
          onClick={handleCancel}
          className="text-[16px] text-black/45 hover:text-black/70 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        {/* Amount */}
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-[38px] font-bold tracking-[-1px] text-[#1c1c1e]">
              {currencyPrefix}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={isCrossCurrency ? amountFrom : amount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '')
                if (isCrossCurrency) {
                  setAmountFrom(v)
                } else {
                  setAmount(v)
                }
              }}
              placeholder="0.00"
              autoFocus
              className="flex-1 text-[38px] font-bold tracking-[-1px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/15"
            />
          </div>
          {isCrossCurrency && (
            <div className="flex items-baseline mt-3">
              <span className="text-[38px] font-bold tracking-[-1px] text-[#1c1c1e]">
                {toAccount ? (toAccount.currency === 'NZD' ? 'NZ$' : '£') : '£'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountTo}
                onChange={(e) => setAmountTo(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="flex-1 text-[38px] font-bold tracking-[-1px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/15"
              />
            </div>
          )}
          {isCrossCurrency && (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-[12px] uppercase text-black/35 font-medium">
                Amount Out → Amount In
              </p>
            </div>
          )}
        </div>

        {/* From / To */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm overflow-hidden mb-3">
          <button
            onClick={() => setShowFromPicker(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-[15px] text-black/45">From</span>
            <span className="text-[15px] font-medium text-[#1c1c1e]">
              {getAccountDisplayName(fromAccount)}
            </span>
          </button>
          <div className="h-px bg-black/5 mx-5" />
          <button
            onClick={() => setShowToPicker(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-[15px] text-black/45">To</span>
            <span className="text-[15px] font-medium text-[#1c1c1e]">
              {getAccountDisplayName(toAccount)}
            </span>
          </button>
        </div>

        {/* Date */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm overflow-hidden mb-3">
          <button
            onClick={() => setShowDatePicker(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-[15px] text-black/45">Date</span>
            <span className="text-[15px] font-medium text-[#1c1c1e]">
              {dateDisplay}
            </span>
          </button>
        </div>

        {/* Note */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm overflow-hidden mb-8">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
            className="w-full px-5 py-4 text-[15px] text-[#1c1c1e] bg-transparent border-none outline-none placeholder:text-black/25"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-[13px] text-red-500 text-center mb-4">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full h-[58px] rounded-[18px] bg-[#1c1c1e] text-white text-[17px] font-bold
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:bg-black/90 transition-colors
            active:scale-[0.98] transition-transform"
        >
          {isSubmitting ? 'Adding...' : 'Add Transaction'}
        </button>
      </div>

      {/* Account Pickers */}
      {showFromPicker && (
        <AccountPicker
          accounts={accounts}
          selectedId={selectedFromId}
          excludeId={selectedToId}
          onSelect={(account) => {
            setSelectedFromId(account.id)
            setShowFromPicker(false)
          }}
          onClose={() => setShowFromPicker(false)}
          showExternal={false}
        />
      )}

      {showToPicker && (
        <AccountPicker
          accounts={accounts}
          selectedId={selectedToId}
          excludeId={selectedFromId}
          onSelect={(account) => {
            setSelectedToId(account.id)
            setShowToPicker(false)
          }}
          onClose={() => setShowToPicker(false)}
          showExternal={true}
        />
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DatePicker
          value={date}
          onChange={(d) => {
            setDate(d)
            setShowDatePicker(false)
          }}
          onClose={() => setShowDatePicker(false)}
          minDate={fromAccount ? new Date(fromAccount.opening_date) : new Date('2024-08-01')}
        />
      )}
    </main>
  )
}
