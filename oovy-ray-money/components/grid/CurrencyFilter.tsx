'use client'

import type { Currency } from '@/types'

interface CurrencyFilterProps {
  activeCurrencies: Set<Currency>
  onToggle: (currency: Currency) => void
  onAll: () => void
}

export function CurrencyFilter({ activeCurrencies, onToggle, onAll }: CurrencyFilterProps) {
  const gbpActive = activeCurrencies.has('GBP')
  const nzdActive = activeCurrencies.has('NZD')
  const allActive = gbpActive && nzdActive

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-black/25 hidden lg:inline">
        Show
      </span>
      <div className="flex gap-0.5 bg-black/[0.06] rounded-[10px] p-0.5">
        <button
          onClick={() => onToggle('GBP')}
          className={`px-3 py-1 rounded-[8px] text-[12px] font-semibold transition-all ${
            gbpActive ? 'bg-white shadow-sm text-[#1c1c1e]' : 'text-black/35'
          }`}
        >
          GBP
        </button>
        <button
          onClick={() => onToggle('NZD')}
          className={`px-3 py-1 rounded-[8px] text-[12px] font-semibold transition-all ${
            nzdActive ? 'bg-white shadow-sm text-[#1c1c1e]' : 'text-black/35'
          }`}
        >
          NZD
        </button>
        <button
          onClick={onAll}
          className={`px-3 py-1 rounded-[8px] text-[12px] font-semibold transition-all ${
            allActive ? 'bg-white shadow-sm text-[#1c1c1e]' : 'text-black/35'
          }`}
        >
          All
        </button>
      </div>
    </div>
  )
}
