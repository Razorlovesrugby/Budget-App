'use client'

import type { Account } from '@/types'
import AccountCard from './AccountCard'

interface AccountStackProps {
  accounts: Account[]
  actualBalances: Map<string, number>
  budgetBalances: Map<string, number>
  lastUpdatedDates: Map<string, string>
}

export default function AccountStack({
  accounts,
  actualBalances,
  budgetBalances,
  lastUpdatedDates,
}: AccountStackProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-sm font-medium text-black/25">No accounts yet</p>
          <p className="text-xs text-black/15 mt-1">Add accounts in Settings</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden px-6 pb-6"
      style={{
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex flex-col">
        {accounts.map((account, i) => {
          const isLast = i === accounts.length - 1
          return (
            <div
              key={account.id}
              style={{ marginBottom: isLast ? 0 : -52 }}
              className="relative"
            >
              <AccountCard
                account={account}
                actualBalance={actualBalances.get(account.id) ?? account.opening_balance}
                budgetBalance={budgetBalances.get(account.id) ?? account.opening_balance}
                lastUpdatedDate={lastUpdatedDates.get(account.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
