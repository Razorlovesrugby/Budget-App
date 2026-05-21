import { describe, it, expect } from 'vitest'
import { getEffectiveAmount, getEffectiveAmounts } from '@/lib/forecast/effective-amount'
import type { EffectiveChange } from '@/types'

const changes: EffectiveChange[] = [
  { effective_from: '2025-01-01', amount_from: 100, amount_to: 100 },
  { effective_from: '2025-06-01', amount_from: 200, amount_to: 200 },
]

describe('getEffectiveAmount', () => {
  it('single change returns for any date', () => {
    const single: EffectiveChange[] = [{ effective_from: '2024-01-01', amount_from: 50, amount_to: 50 }]
    const result = getEffectiveAmount(single, new Date(2030, 0, 1))
    expect(result.toString()).toBe('50')
  })

  it('date before second change → first amount', () => {
    const result = getEffectiveAmount(changes, new Date(2025, 2, 1))
    expect(result.toString()).toBe('100')
  })

  it('date after second change → second amount', () => {
    const result = getEffectiveAmount(changes, new Date(2025, 6, 1))
    expect(result.toString()).toBe('200')
  })

  it('exact effective_from date → that change applies', () => {
    const result = getEffectiveAmount(changes, new Date(2025, 5, 1))
    expect(result.toString()).toBe('200')
  })

  it('empty changes → throws', () => {
    expect(() => getEffectiveAmount([], new Date())).toThrow('No effective changes defined')
  })

  it('all changes in future → throws', () => {
    const future: EffectiveChange[] = [{ effective_from: '2030-01-01', amount_from: 100, amount_to: 100 }]
    expect(() => getEffectiveAmount(future, new Date(2025, 0, 1))).toThrow('No effective amount')
  })
})

describe('getEffectiveAmounts', () => {
  it('returns both from and to amounts', () => {
    const mixed: EffectiveChange[] = [
      { effective_from: '2025-01-01', amount_from: 100, amount_to: 120 },
    ]
    const result = getEffectiveAmounts(mixed, new Date(2025, 5, 1))
    expect(result.amountFrom.toString()).toBe('100')
    expect(result.amountTo.toString()).toBe('120')
  })

  it('three changes — middle date returns correct entry', () => {
    const three: EffectiveChange[] = [
      { effective_from: '2024-01-01', amount_from: 50, amount_to: 50 },
      { effective_from: '2025-01-01', amount_from: 100, amount_to: 100 },
      { effective_from: '2026-01-01', amount_from: 150, amount_to: 150 },
    ]
    const result = getEffectiveAmounts(three, new Date(2025, 5, 1))
    expect(result.amountFrom.toString()).toBe('100')
  })
})
