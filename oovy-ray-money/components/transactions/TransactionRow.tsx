import type { Transaction, Currency } from '@/types'
import type { RecurringOccurrence } from '@/lib/forecast/recurring'
import { formatMoney, formatDebit, toDecimal } from '@/lib/utils/money'

export type TransactionUnion =
  | { kind: 'stored'; data: Transaction }
  | { kind: 'recurring'; data: RecurringOccurrence }

interface TransactionRowProps {
  item: TransactionUnion
  isFuture: boolean
  viewingAccountId: string
  accountNames: Map<string, string>
}

export default function TransactionRow({
  item,
  isFuture,
  viewingAccountId,
  accountNames,
}: TransactionRowProps) {
  let isCredit: boolean
  let amount: number
  let currency: Currency
  let name: string | null
  let counterpartyId: string

  if (item.kind === 'stored') {
    const tx = item.data
    isCredit = tx.to_account_id === viewingAccountId
    amount = isCredit ? tx.amount_to : tx.amount_from
    currency = isCredit ? tx.currency_to : tx.currency_from
    name = tx.name
    counterpartyId = isCredit ? tx.from_account_id : tx.to_account_id
  } else {
    const occ = item.data
    isCredit = occ.to_account_id === viewingAccountId
    amount = isCredit ? occ.amount_to.toNumber() : occ.amount_from.toNumber()
    currency = isCredit ? occ.currency_to : occ.currency_from
    name = occ.name
    counterpartyId = isCredit ? occ.from_account_id : occ.to_account_id
  }

  const dAmount = toDecimal(amount)
  const counterpartyName = accountNames.get(counterpartyId) ?? 'Untitled'
  const displayName = name || counterpartyName

  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-black/5 min-h-[44px] ${
        isFuture ? 'opacity-50' : ''
      }`}
    >
      {/* Left: arrow + name */}
      <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
        <span className="text-[11px] text-black/25 shrink-0">
          {isCredit ? '←' : '→'}
        </span>
        <span className="text-[14px] font-medium text-[#1c1c1e] truncate">
          {isCredit ? displayName : displayName}
        </span>
      </div>

      {/* Right: amount */}
      <span className="text-[15px] font-semibold text-[#1c1c1e] tabular-nums shrink-0">
        {isCredit
          ? formatMoney(dAmount, currency)
          : formatDebit(dAmount, currency)}
      </span>
    </div>
  )
}
