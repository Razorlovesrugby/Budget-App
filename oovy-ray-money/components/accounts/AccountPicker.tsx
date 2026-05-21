'use client'

import type { Account, Currency } from '@/types'

interface AccountPickerProps {
  accounts: Account[]
  selectedId: string | null
  excludeId: string | null
  onSelect: (account: Account) => void
  onClose: () => void
  showExternal: boolean
}

function groupByCurrency(accounts: Account[]): Map<Currency, Account[]> {
  const map = new Map<Currency, Account[]>()
  map.set('GBP', [])
  map.set('NZD', [])
  for (const a of accounts) {
    map.get(a.currency)!.push(a)
  }
  return map
}

export default function AccountPicker({
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onClose,
  showExternal,
}: AccountPickerProps) {
  // Filter out: External (unless showExternal), archived, and the excludeId
  const filtered = accounts.filter((a) => {
    if (!showExternal && a.type === 'EXTERNAL') return false
    if (excludeId && a.id === excludeId) return false
    return true
  })

  const grouped = groupByCurrency(filtered)

  // Section order: GBP first, then NZD
  const sections: { currency: Currency; accounts: Account[] }[] = [
    { currency: 'GBP', accounts: grouped.get('GBP') || [] },
    { currency: 'NZD', accounts: grouped.get('NZD') || [] },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <h2 className="text-[17px] font-semibold text-[#1c1c1e]">Select Account</h2>
          <button
            onClick={onClose}
            className="text-[15px] text-black/45 hover:text-black/70 transition-colors"
          >
            Done
          </button>
        </div>

        {/* Handle bar */}
        <div className="flex justify-center pb-2 shrink-0">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {sections.map(({ currency, accounts: groupAccounts }) => {
            if (groupAccounts.length === 0) return null
            return (
              <div key={currency} className="mb-2">
                <p className="px-6 py-2 text-[11px] font-semibold uppercase text-black/30 tracking-wide">
                  {currency}
                </p>
                <div className="mx-4 rounded-2xl overflow-hidden bg-black/[0.02]">
                  {groupAccounts.map((account) => {
                    const isSelected = account.id === selectedId
                    const isTracking = account.type === 'TRACKING'

                    return (
                      <button
                        key={account.id}
                        onClick={() => onSelect(account)}
                        className={`w-full flex items-center justify-between px-5 h-[52px]
                          hover:bg-black/[0.03] transition-colors
                          ${isSelected ? 'bg-black/[0.04]' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-[#1c1c1e]">
                            {account.name}
                          </span>
                          {isTracking && (
                            <span className="text-[10px] text-black/25 font-medium">
                              Tracking
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-black/25 font-medium">
                            {account.currency === 'NZD' ? 'NZ$' : '£'}
                          </span>
                          {isSelected && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              className="text-[#1c1c1e]"
                            >
                              <path
                                d="M3 8.5L6.5 12L13 5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <p className="text-center py-12 text-[14px] text-black/25">
              No accounts available
            </p>
          )}
        </div>

        {/* Safe area bottom */}
        <div className="h-8 shrink-0" />
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  )
}
