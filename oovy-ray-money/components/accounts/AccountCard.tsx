'use client'

import { memo, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Account } from '@/types'
import { formatMoney, toDecimal } from '@/lib/utils/money'

interface AccountCardProps {
  account: Account
  actualBalance: number
  budgetBalance: number
  lastUpdatedDate?: string
  onPress?: (accountId: string) => void
}

const AccountCard = memo(function AccountCard({
  account,
  actualBalance,
  budgetBalance,
  lastUpdatedDate,
}: AccountCardProps) {
  const router = useRouter()

  const dActual = useMemo(() => toDecimal(actualBalance), [actualBalance])
  const dBudget = useMemo(() => toDecimal(budgetBalance), [budgetBalance])

  const formattedDate = useMemo(() => {
    if (!lastUpdatedDate) return ''
    return new Date(lastUpdatedDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }, [lastUpdatedDate])

  const handlePress = useCallback(() => {
    router.push(`/accounts/${account.id}`)
  }, [router, account.id])

  useEffect(() => {
    router.prefetch(`/accounts/${account.id}`)
  }, [router, account.id])

  return (
    <button
      onClick={handlePress}
      className="w-full h-[88px] rounded-[20px] p-4 px-5 border border-white/10 text-left
        active:scale-[0.98] transition-transform duration-100 select-none
        flex flex-col justify-between relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${account.color_from}, ${account.color_to})`,
      }}
    >
      {/* Top row: name + actual */}
      <div className="flex justify-between items-start">
        <span className="text-[13px] font-semibold text-white/85 truncate flex-1 mr-2">
          {account.name}
        </span>
        <span className="text-[17px] font-bold text-white tabular-nums shrink-0">
          {formatMoney(dActual, account.currency)}
        </span>
      </div>

      {/* Bottom row: updated + expected */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          {formattedDate && (
            <span className="text-[11px] text-white/40 leading-tight">
              Updated: {formattedDate}
            </span>
          )}
        </div>
        <span className="text-[11px] text-white/40 tabular-nums">
          Expected: {formatMoney(dBudget, account.currency)}
        </span>
      </div>
    </button>
  )
})

export default AccountCard
