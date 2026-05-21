import Decimal from 'decimal.js'
import type { EffectiveChange } from '@/types'
import { toDecimal } from '@/lib/utils/money'
import { parseDate, isOnOrBefore } from '@/lib/utils/dates'

export function getEffectiveAmount(changes: EffectiveChange[], date: Date): Decimal {
  if (changes.length === 0) throw new Error('No effective changes defined')
  const sorted = [...changes].sort((a, b) =>
    parseDate(b.effective_from) > parseDate(a.effective_from) ? 1 : -1
  )
  const match = sorted.find(c => isOnOrBefore(parseDate(c.effective_from), date))
  if (!match) throw new Error('No effective amount for date before first change')
  return toDecimal(match.amount_from)
}

export function getEffectiveAmounts(
  changes: EffectiveChange[],
  date: Date
): { amountFrom: Decimal; amountTo: Decimal } {
  if (changes.length === 0) throw new Error('No effective changes defined')
  const sorted = [...changes].sort((a, b) =>
    parseDate(b.effective_from) > parseDate(a.effective_from) ? 1 : -1
  )
  const match = sorted.find(c => isOnOrBefore(parseDate(c.effective_from), date))
  if (!match) throw new Error('No effective amount for date before first change')
  return {
    amountFrom: toDecimal(match.amount_from),
    amountTo: toDecimal(match.amount_to),
  }
}
