'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Account } from '@/types'
import Decimal from 'decimal.js'

const PRESET_GRADIENTS = [
  { from: '#1a1a2e', to: '#0f3460', name: 'Deep Navy' },
  { from: '#2d1b69', to: '#11998e', name: 'Purple Teal' },
  { from: '#0d4f2f', to: '#1a8a4a', name: 'Forest' },
  { from: '#4a1942', to: '#c74b50', name: 'Burgundy' },
  { from: '#1a237e', to: '#283593', name: 'Indigo' },
  { from: '#1b4332', to: '#2d6a4f', name: 'Deep Teal' },
  { from: '#3d1c4d', to: '#7b2d8e', name: 'Plum' },
  { from: '#4a3520', to: '#8b6914', name: 'Bronze' },
]

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-[#1c1c1e]' : 'bg-black/20'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function AccountSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [account, setAccount] = useState<Account | null>(null)
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single<Account>()
      .then(({ data }) => {
        if (data) {
          setAccount(data)
          setName(data.name)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function updateAccount(patch: Partial<Account>) {
    if (!account) return
    const { data } = await supabase
      .from('accounts')
      .update(patch)
      .eq('id', account.id)
      .select()
      .single<Account>()
    if (data) setAccount(data)
  }

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed || !account) return
    setEditingName(false)
    await updateAccount({ name: trimmed })
  }

  async function handleArchive() {
    if (!account) return
    setSaving(true)
    await updateAccount({ is_archived: true })
    setSaving(false)
    router.push('/settings/accounts')
  }

  const isTracking = account?.type === 'TRACKING'
  const balance = account ? new Decimal(account.opening_balance) : new Decimal(0)
  const hasBalance = balance.abs().gt(0)

  if (!account) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-black/30 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-12 px-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Accounts
        </button>

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-6">
          {account.name}
        </h1>

        {/* Name */}
        <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white mb-6">
          <div className="px-4 py-3.5 border-b border-black/[0.05]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 mb-1.5">
              Name
            </p>
            {editingName ? (
              <input
                autoFocus
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName() }}
                className="w-full text-[16px] font-medium text-[#1c1c1e] bg-transparent outline-none border-b border-black/20 pb-0.5"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="w-full text-left text-[16px] font-medium text-[#1c1c1e] flex items-center justify-between"
              >
                {account.name}
                <span className="text-[13px] text-black/25">Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Colour */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 px-1 mb-2">
          Colour
        </p>
        <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white mb-6 p-4">
          {/* Preview strip */}
          <div
            className="w-full h-10 rounded-xl mb-4"
            style={{ background: `linear-gradient(135deg, ${account.color_from}, ${account.color_to})` }}
          />

          {/* Preset swatches */}
          <div className="grid grid-cols-8 gap-2 mb-4">
            {PRESET_GRADIENTS.map((g) => {
              const selected = account.color_from === g.from && account.color_to === g.to
              return (
                <button
                  key={g.name}
                  onClick={() => updateAccount({ color_from: g.from, color_to: g.to })}
                  title={g.name}
                  className={`w-full aspect-square rounded-lg ${selected ? 'ring-2 ring-black ring-offset-1' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                />
              )
            })}
          </div>

          {/* Custom inputs */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[11px] text-black/35 mb-1">From</p>
              <input
                type="color"
                value={account.color_from}
                onChange={(e) => updateAccount({ color_from: e.target.value })}
                className="w-full h-9 rounded-lg border border-black/10 cursor-pointer"
              />
            </div>
            <span className="text-black/25 mt-4">→</span>
            <div className="flex-1">
              <p className="text-[11px] text-black/35 mb-1">To</p>
              <input
                type="color"
                value={account.color_to}
                onChange={(e) => updateAccount({ color_to: e.target.value })}
                className="w-full h-9 rounded-lg border border-black/10 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 px-1 mb-2">
          Visibility
        </p>
        <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white mb-6">
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-black/[0.05]">
            <span className="text-[16px] font-medium text-[#1c1c1e]">Include in Cash Balance</span>
            <Toggle
              checked={account.include_in_cash_balance}
              onChange={(v) => updateAccount({ include_in_cash_balance: v })}
              disabled={!isTracking}
            />
          </div>
          <div className="flex items-center justify-between px-4 h-[52px]">
            <span className="text-[16px] font-medium text-[#1c1c1e]">Include in Review</span>
            <Toggle
              checked={account.include_in_review}
              onChange={(v) => updateAccount({ include_in_review: v })}
              disabled={!isTracking}
            />
          </div>
        </div>

        {/* Archive */}
        <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white">
          <button
            onClick={() => {
              if (hasBalance) {
                setShowArchiveConfirm(true)
              } else {
                handleArchive()
              }
            }}
            disabled={saving}
            className="w-full h-[52px] flex items-center justify-center text-[16px] font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Archive Account
          </button>
        </div>
      </div>

      {/* Archive confirmation */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowArchiveConfirm(false)} />
          <div className="relative bg-white rounded-[20px] p-6 w-full max-w-sm">
            <h2 className="text-[17px] font-semibold text-[#1c1c1e] mb-2">Archive Account?</h2>
            <p className="text-[14px] text-black/50 mb-6">
              This account has a balance of {account.currency === 'GBP' ? '£' : 'NZ$'}
              {Math.abs(account.opening_balance).toFixed(2)}.
              Archive anyway?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 h-[44px] rounded-xl bg-black/[0.05] text-[15px] font-medium text-[#1c1c1e]"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowArchiveConfirm(false); handleArchive() }}
                disabled={saving}
                className="flex-1 h-[44px] rounded-xl bg-red-500 text-[15px] font-medium text-white disabled:opacity-50"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
