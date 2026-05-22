'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Transaction, Account } from '@/types'

function formatAmount(amount: number, currency: string) {
  const prefix = currency === 'GBP' ? '£' : 'NZ$'
  return `${prefix}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function OneOffCard({
  tx,
  accounts,
  onDelete,
}: {
  tx: Transaction
  accounts: Account[]
  onDelete: (id: string) => void
}) {
  const [swiped, setSwiped] = useState(false)
  const fromAccount = accounts.find((a) => a.id === tx.from_account_id)
  const toAccount = accounts.find((a) => a.id === tx.to_account_id)

  const dateLabel = format(new Date(tx.transaction_date + 'T00:00:00'), 'd MMM yyyy')
  const amountLabel = formatAmount(tx.amount_from, tx.currency_from)
  const fromLabel = fromAccount?.name ?? 'Unknown'
  const toLabel = toAccount?.name ?? 'Unknown'

  if (swiped) {
    return (
      <div className="flex rounded-[18px] overflow-hidden">
        <div
          className="flex-1 bg-white px-5 py-4 cursor-pointer"
          onClick={() => setSwiped(false)}
        >
          <p className="text-[16px] font-semibold text-[#1c1c1e]">{tx.name ?? 'One-off'}</p>
          <p className="text-[14px] font-medium text-black/50 mt-0.5">
            {amountLabel} · {dateLabel}
          </p>
          <p className="text-[13px] text-black/35 mt-0.5">{fromLabel} → {toLabel}</p>
        </div>
        <button
          onClick={() => onDelete(tx.id)}
          className="w-24 bg-red-500 text-white text-[15px] font-semibold flex items-center justify-center"
        >
          Delete
        </button>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-[18px] px-5 py-4 cursor-pointer active:bg-black/[0.02] transition-colors select-none"
      onClick={() => setSwiped(true)}
    >
      <p className="text-[16px] font-semibold text-[#1c1c1e]">{tx.name ?? 'One-off'}</p>
      <p className="text-[14px] font-medium text-black/50 mt-0.5">
        {amountLabel} · {dateLabel}
      </p>
      <p className="text-[13px] text-black/35 mt-0.5">{fromLabel} → {toLabel}</p>
    </div>
  )
}

export default function PlannedOneOffsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [oneOffs, setOneOffs] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('type', 'ONE_OFF')
        .gte('transaction_date', todayStr)
        .order('transaction_date')
        .returns<Transaction[]>(),
      supabase
        .from('accounts')
        .select('*')
        .returns<Account[]>(),
    ]).then(([txRes, accRes]) => {
      if (txRes.data) setOneOffs(txRes.data)
      if (accRes.data) setAccounts(accRes.data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setOneOffs((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-12 px-5">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <Link
            href="/add?type=one_off"
            className="w-8 h-8 rounded-full bg-[#1c1c1e] flex items-center justify-center text-white text-lg font-medium hover:bg-black/80 transition-colors"
          >
            +
          </Link>
        </div>

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-6">
          Planned One-offs
        </h1>

        {oneOffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[16px] font-medium text-black/35">No planned one-offs</p>
            <p className="text-[14px] text-black/25 mt-1">
              Tap{' '}
              <Link href="/add?type=one_off" className="text-[#1c1c1e] font-medium">
                +
              </Link>{' '}
              to add a future transaction
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {oneOffs.map((tx) => (
              <OneOffCard
                key={tx.id}
                tx={tx}
                accounts={accounts}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
