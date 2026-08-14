import { describe, expect, it } from 'vitest'
import {
  formatImpactCount,
  pluralRu,
  summarizeImpact,
  totalImpact,
  type ImpactCount,
} from '@/lib/delete-impact'

// The delete dialog (plans/2.0-hardening-plan.md, B4) exists to put a real
// number in front of a cascade. A number rendered as «5 сегмента» undercuts
// exactly the credibility it is there to buy, and Russian plurals are not a
// two-case ternary — hence a test rather than a glance.

describe('pluralRu', () => {
  const forms: [string, string, string] = ['сегмент', 'сегмента', 'сегментов']

  it('uses the singular form for 1 and anything ending in 1', () => {
    for (const n of [1, 21, 101, 131, 1001]) expect(pluralRu(n, forms), `${n}`).toBe('сегмент')
  })

  it('uses the paucal form for 2-4 and anything ending in them', () => {
    for (const n of [2, 3, 4, 22, 34, 102]) expect(pluralRu(n, forms), `${n}`).toBe('сегмента')
  })

  it('uses the genitive plural for 0, 5-9 and anything ending in them', () => {
    for (const n of [0, 5, 9, 25, 100, 1000]) expect(pluralRu(n, forms), `${n}`).toBe('сегментов')
  })

  it('uses the genitive plural for the whole 11-14 exception', () => {
    // The case a naive `n % 10` rule gets wrong: 11 ends in 1 and 12-14 end in
    // 2-4, yet all four take the third form («11 сегментов», not «11 сегмент»).
    for (const n of [11, 12, 13, 14, 111, 112, 1013]) {
      expect(pluralRu(n, forms), `${n}`).toBe('сегментов')
    }
  })
})

describe('formatImpactCount', () => {
  it('pairs the count with the right form of its noun', () => {
    expect(formatImpactCount({ key: 'segment', count: 9 })).toBe('9 сегментов')
    expect(formatImpactCount({ key: 'hypothesis', count: 1 })).toBe('1 гипотеза')
    expect(formatImpactCount({ key: 'conversation', count: 3 })).toBe('3 разговора')
  })

  it('leaves an invariant abbreviation alone in every form', () => {
    expect(formatImpactCount({ key: 'jtbd', count: 1 })).toBe('1 JTBD')
    expect(formatImpactCount({ key: 'jtbd', count: 6 })).toBe('6 JTBD')
  })
})

describe('summarizeImpact', () => {
  const counts: ImpactCount[] = [
    { key: 'segment', count: 9 },
    { key: 'competitor', count: 0 },
    { key: 'hypothesis', count: 5 },
    { key: 'research', count: 0 },
    { key: 'jtbd', count: 6 },
  ]

  it('drops the zero rows', () => {
    expect(summarizeImpact(counts).map((c) => c.key)).not.toContain('competitor')
    expect(summarizeImpact(counts)).toHaveLength(3)
  })

  it('puts the biggest number first', () => {
    expect(summarizeImpact(counts).map((c) => c.count)).toEqual([9, 6, 5])
  })

  it('sinks bookkeeping rows below real records regardless of size', () => {
    // Measured on the seeded product: 10 status-history rows outnumbered every
    // content row, so size-only sorting opened the dialog with the one line
    // nobody would act on.
    expect(
      summarizeImpact([
        { key: 'statusChange', count: 10 },
        { key: 'segment', count: 9 },
        { key: 'sequenceEdge', count: 3 },
        { key: 'jtbd', count: 6 },
      ]).map((c) => c.key)
    ).toEqual(['segment', 'jtbd', 'statusChange', 'sequenceEdge'])
  })

  it('returns an empty list rather than throwing on nothing at all', () => {
    expect(summarizeImpact([])).toEqual([])
    expect(summarizeImpact([{ key: 'insight', count: 0 }])).toEqual([])
  })
})

describe('totalImpact', () => {
  it('counts both consequences together', () => {
    expect(
      totalImpact({
        deleted: [{ key: 'segment', count: 9 }],
        unlinked: [{ key: 'insight', count: 2 }],
      })
    ).toBe(11)
  })

  it('is zero for a record nothing hangs off', () => {
    expect(totalImpact({ deleted: [], unlinked: [] })).toBe(0)
  })
})
