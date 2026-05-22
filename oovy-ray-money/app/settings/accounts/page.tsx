'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Account } from '@/types'

export default function ManageAccountsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    supabase
      .from('accounts')
      .select('*')
      .eq('is_archived', false)
      .eq('is_system', false)
      .order('display_order')
      .returns<Account[]>()
      .then(({ data }) => { if (data) setAccounts(data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

        {accounts.length === 0 && (
          <p className="text-[15px] text-black/30 text-center py-20">No accounts</p>
        )}

        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => router.push(`/settings/accounts/${account.id}`)}
              className="w-full rounded-[14px] border border-black/[0.06] bg-white px-4 py-3.5 text-left flex items-center justify-between active:bg-black/[0.02] transition-colors"
            >
              <div>
                <p className="text-[16px] font-medium text-[#1c1c1e]">{account.name}</p>
                <p className="text-[13px] text-black/35 mt-0.5">
                  {account.currency} · {account.type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${account.color_from}, ${account.color_to})` }}
                />
                <span className="text-[14px] text-black/20">›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
