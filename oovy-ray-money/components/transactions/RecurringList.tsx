'use client'

import type { RecurringSchedule, Account } from '@/types'
import RecurringListItem from './RecurringListItem'
import { useRouter } from 'next/navigation'

interface RecurringListProps {
  schedules: RecurringSchedule[]
  accounts: Account[]
}

export default function RecurringList({ schedules, accounts }: RecurringListProps) {
  const router = useRouter()

  // Build account lookup maps
  const accountMap = new Map<string, Account>()
  const nameMap = new Map<string, string>()
  for (const a of accounts) {
    accountMap.set(a.id, a)
    nameMap.set(a.id, a.name)
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-1 mb-1">
        <h1 className="text-[22px] font-bold text-[#1c1c1e]">
          Recurring Transactions
        </h1>
        <button
          onClick={() => router.push('/recurring/add')}
          className="w-9 h-9 rounded-full bg-black/[0.06] flex items-center justify-center
            hover:bg-black/[0.10] transition-colors
            active:scale-[0.95] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 3.75V14.25M3.75 9H14.25"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-[#1c1c1e]"
            />
          </svg>
        </button>
      </div>

      {/* List */}
      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-[16px] font-medium text-black/25 mb-2">
            No recurring transactions
          </p>
          <p className="text-[14px] text-black/25">
            Tap [+] to add one
          </p>
        </div>
      ) : (
        schedules.map((schedule) => {
          const fromAccount = accountMap.get(schedule.from_account_id)
          const toAccount = accountMap.get(schedule.to_account_id)
          return (
            <RecurringListItem
              key={schedule.id}
              schedule={schedule}
              fromAccountName={fromAccount?.name ?? 'Unknown'}
              toAccountName={toAccount?.name ?? 'Unknown'}
              fromCurrency={fromAccount?.currency ?? 'GBP'}
            />
          )
        })
      )}
    </div>
  )
}
