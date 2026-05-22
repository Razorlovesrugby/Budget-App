'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AddAccountPanel } from '@/components/accounts/AddAccountPanel'
import type { Account } from '@/types'

function GradientSwatch({ from, to }: { from: string; to: string }) {
  return (
    <div
      className="w-7 h-7 rounded-lg shrink-0"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    />
  )
}

function AccountRow({ account, onPress }: { account: Account; onPress: () => void }) {
  const isTracking = account.type === 'TRACKING'
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-3 px-4 h-[56px] bg-white border-b border-black/[0.05] last:border-0 active:bg-black/[0.02] transition-colors text-left ${
        account.is_archived ? 'opacity-50' : ''
      }`}
    >
      <GradientSwatch from={account.color_from} to={account.color_to} />
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[16px] font-medium text-[#1c1c1e] truncate">{account.name}</span>
        {isTracking && (
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-black/40 bg-black/[0.06] rounded px-1.5 py-0.5">
            TRACKING
          </span>
        )}
      </div>
      <span className="text-[14px] text-black/20">›</span>
    </button>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 px-1 mb-2 mt-6 first:mt-0">
      {title}
    </p>
  )
}

export default function ManageAccountsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddPanel, setShowAddPanel] = useState(false)

  async function loadAccounts() {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_system', false)
      .order('display_order')
      .returns<Account[]>()
    if (data) setAccounts(data)
  }

  useEffect(() => {
    loadAccounts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeGBP = accounts.filter((a) => !a.is_archived && a.currency === 'GBP')
  const activeNZD = accounts.filter((a) => !a.is_archived && a.currency === 'NZD')
  const archived = accounts.filter((a) => a.is_archived)

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
          Settings
        </button>

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-6">
          Manage Accounts
        </h1>

        {activeGBP.length > 0 && (
          <>
            <SectionHeader title="GBP Accounts" />
            <div className="rounded-[14px] overflow-hidden border border-black/[0.06]">
              {activeGBP.map((a) => (
                <AccountRow key={a.id} account={a} onPress={() => router.push(`/settings/accounts/${a.id}`)} />
              ))}
            </div>
          </>
        )}

        {activeNZD.length > 0 && (
          <>
            <SectionHeader title="NZD Accounts" />
            <div className="rounded-[14px] overflow-hidden border border-black/[0.06]">
              {activeNZD.map((a) => (
                <AccountRow key={a.id} account={a} onPress={() => router.push(`/settings/accounts/${a.id}`)} />
              ))}
            </div>
          </>
        )}

        {archived.length > 0 && (
          <>
            <SectionHeader title="Archived" />
            <div className="rounded-[14px] overflow-hidden border border-black/[0.06]">
              {archived.map((a) => (
                <AccountRow key={a.id} account={a} onPress={() => router.push(`/settings/accounts/${a.id}`)} />
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setShowAddPanel(true)}
          className="mt-8 w-full h-[52px] rounded-[14px] border border-black/[0.06] bg-white text-[16px] font-medium text-[#1c1c1e] flex items-center justify-center gap-2 active:bg-black/[0.02] transition-colors"
        >
          <span className="text-[20px] font-light leading-none text-black/40">+</span>
          Add New Account
        </button>
      </div>

      {showAddPanel && (
        <AddAccountPanel
          onClose={() => setShowAddPanel(false)}
          onSuccess={() => { setShowAddPanel(false); loadAccounts() }}
        />
      )}
    </div>
  )
}
