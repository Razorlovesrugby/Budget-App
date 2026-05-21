import type { Account } from '@/types'
import { formatMoney, toDecimal } from '@/lib/utils/money'

interface AccountCardDetailProps {
  account: Account
  actualBalance: number
  budgetBalance: number
  lastUpdatedDate: string
  comparisonDateLabel?: string
}

export default function AccountCardDetail({
  account,
  actualBalance,
  budgetBalance,
  lastUpdatedDate,
  comparisonDateLabel = 'Today',
}: AccountCardDetailProps) {
  const dActual = toDecimal(actualBalance)
  const dBudget = toDecimal(budgetBalance)
  const variance = dActual.minus(dBudget)

  const formattedDate = new Date(lastUpdatedDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="px-6 mb-4">
      <div
        className="relative w-full h-[140px] rounded-[24px] p-5 px-6 flex flex-col justify-between overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${account.color_from}, ${account.color_to})`,
        }}
      >
        {/* Decorative radial gradient circle */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[200%] h-[200%] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 60%)',
          }}
        />

        {/* Account name */}
        <span className="text-[14px] font-semibold text-white/70 relative z-10">
          {account.name}
        </span>

        {/* Large balance */}
        <span className="text-[36px] font-bold text-white tracking-[-1.2px] tabular-nums relative z-10 text-center">
          {formatMoney(dActual, account.currency)}
        </span>

        {/* Bottom row */}
        <div className="flex justify-between items-end relative z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-white/35 uppercase tracking-wide">
              Last Updated
            </span>
            <span className="text-[14px] font-semibold text-white/80 tabular-nums">
              {formattedDate}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-medium text-white/35 uppercase tracking-wide">
              Expected {comparisonDateLabel}
            </span>
            <span className="text-[14px] font-semibold text-white/80 tabular-nums">
              {formatMoney(dBudget, account.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Variance row below card */}
      <div className="flex justify-between items-center mt-2 px-1">
        <div className="flex gap-4">
          <div>
            <span className="text-[11px] text-black/35">Budget</span>
            <span className="text-[13px] font-semibold text-[#1c1c1e] ml-2 tabular-nums">
              {formatMoney(dBudget, account.currency)}
            </span>
          </div>
        </div>
        <div>
          <span className="text-[11px] text-black/35">Variance</span>
          <span className="text-[13px] font-semibold text-[#1c1c1e] ml-2 tabular-nums">
            {variance.isZero()
              ? `${account.currency === 'NZD' ? 'NZ$' : '£'}0.00`
              : variance.isPositive()
              ? `+${formatMoney(variance, account.currency)}`
              : formatMoney(variance, account.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}
