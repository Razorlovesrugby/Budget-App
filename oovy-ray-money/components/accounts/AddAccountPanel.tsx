'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AccountType, Currency } from '@/types'

const DEFAULT_GRADIENTS = [
  { from: '#1a1a2e', to: '#0f3460' },
  { from: '#2d1b69', to: '#11998e' },
  { from: '#0d4f2f', to: '#1a8a4a' },
  { from: '#4a1942', to: '#c74b50' },
  { from: '#1a237e', to: '#283593' },
  { from: '#1b4332', to: '#2d6a4f' },
  { from: '#3d1c4d', to: '#7b2d8e' },
  { from: '#4a3520', to: '#8b6914' },
]

function getDefaultGradient(order: number) {
  return DEFAULT_GRADIENTS[order % DEFAULT_GRADIENTS.length]
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'CURRENT', label: 'Current' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'TRACKING', label: 'Tracking' },
  { value: 'DEBT', label: 'Debt' },
]

const ALWAYS_ON_TYPES: AccountType[] = ['CURRENT', 'SAVINGS', 'CREDIT', 'DEBT']

interface AddAccountPanelProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddAccountPanel({ onClose, onSuccess }: AddAccountPanelProps) {
  const supabase = createSupabaseBrowserClient()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [type, setType] = useState<AccountType>('CURRENT')
  const [includeInCashBalance, setIncludeInCashBalance] = useState(true)
  const [includeInReview, setIncludeInReview] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alwaysOn = ALWAYS_ON_TYPES.includes(type)

  const handleTypeChange = (t: AccountType) => {
    setType(t)
    if (ALWAYS_ON_TYPES.includes(t)) {
      setIncludeInCashBalance(true)
      setIncludeInReview(true)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Account name is required')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const { data: last } = await supabase
        .from('accounts')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextOrder = (last?.display_order ?? 0) + 1
      const gradient = getDefaultGradient(nextOrder)

      const { error: insertError } = await supabase.from('accounts').insert({
        name: name.trim(),
        type,
        currency,
        include_in_cash_balance: includeInCashBalance,
        include_in_review: includeInReview,
        display_order: nextOrder,
        opening_balance: 0,
        opening_date: '2024-08-01',
        color_from: gradient.from,
        color_to: gradient.to,
        is_archived: false,
        is_system: false,
      })

      if (insertError) throw insertError
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-y-auto"
        style={{ width: 320, borderRadius: '20px 0 0 20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">New Account</h2>
          <button onClick={onClose} className="text-[22px] text-black/30 hover:text-black/60 transition-colors leading-none w-8 h-8 flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="flex-1 px-6 pb-6 flex flex-col gap-5">
          {/* Name */}
          <div>
            <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wide block mb-2">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Holiday Fund"
              className="w-full px-4 py-3 rounded-xl bg-black/[0.04] text-[15px] text-[#1c1c1e] placeholder:text-black/20 outline-none focus:ring-2 focus:ring-black/10"
              autoFocus
            />
          </div>

          {/* Currency */}
          <div>
            <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wide block mb-2">
              Currency
            </label>
            <div className="flex gap-2">
              {(['GBP', 'NZD'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                    currency === c
                      ? 'bg-[#1c1c1e] text-white'
                      : 'bg-black/[0.05] text-black/50 hover:bg-black/[0.08]'
                  }`}
                >
                  {c === 'GBP' ? 'GBP £' : 'NZD $'}
                </button>
              ))}
            </div>
          </div>

          {/* Account Type */}
          <div>
            <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wide block mb-2">
              Account Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPES.map((at) => (
                <button
                  key={at.value}
                  onClick={() => handleTypeChange(at.value)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    type === at.value
                      ? 'bg-[#1c1c1e] text-white'
                      : 'bg-black/[0.05] text-black/50 hover:bg-black/[0.08]'
                  }`}
                >
                  {at.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-black/[0.06]" />

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#1c1c1e]">Include in Cash Balance</p>
                <p className="text-[11px] text-black/35">Counts toward total</p>
              </div>
              <button
                disabled={alwaysOn}
                onClick={() => !alwaysOn && setIncludeInCashBalance(!includeInCashBalance)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  includeInCashBalance ? 'bg-[#1c1c1e]' : 'bg-black/15'
                } ${alwaysOn ? 'opacity-50' : ''}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  includeInCashBalance ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#1c1c1e]">Include in Review</p>
                <p className="text-[11px] text-black/35">Appears in weekly review</p>
              </div>
              <button
                disabled={alwaysOn}
                onClick={() => !alwaysOn && setIncludeInReview(!includeInReview)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  includeInReview ? 'bg-[#1c1c1e]' : 'bg-black/15'
                } ${alwaysOn ? 'opacity-50' : ''}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  includeInReview ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="w-full h-[52px] rounded-[16px] bg-[#1c1c1e] text-white text-[16px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/90 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>

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
