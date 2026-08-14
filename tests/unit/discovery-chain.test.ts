import { describe, expect, it } from 'vitest'
import {
  CHAIN_STAGES,
  attachedPercent,
  buildChainRows,
  chainIsEmpty,
  weakestStage,
  type ChainCounts,
} from '@/lib/discovery-chain'

// The chain widget's arithmetic. The numbers are a claim about the user's own
// data — «слабое звено — гипотезы» sends someone to go fix something, so
// pointing at the wrong stage costs them real work.

const empty: ChainCounts = {
  segment: { total: 0, attached: 0 },
  jtbd: { total: 0, attached: 0 },
  hypothesis: { total: 0, attached: 0 },
  feature: { total: 0, attached: 0 },
  rtb: { total: 0, attached: 0 },
}

function counts(partial: Partial<ChainCounts>): ChainCounts {
  return { ...empty, ...partial }
}

describe('attachedPercent', () => {
  it('rounds to whole percent', () => {
    expect(attachedPercent(1, 3)).toBe(33)
    expect(attachedPercent(2, 3)).toBe(67)
  })

  it('is 0 for an empty stage rather than NaN or 100', () => {
    // 0/0 is the "not started" case; both NaN (renders as a broken bar) and
    // 100% ("all connected!") would be lies.
    expect(attachedPercent(0, 0)).toBe(0)
  })

  it('never exceeds 100 or drops below 0', () => {
    expect(attachedPercent(0, 5)).toBe(0)
    expect(attachedPercent(5, 5)).toBe(100)
  })
})

describe('buildChainRows', () => {
  it('keeps the methodological order, not the schema order', () => {
    expect(buildChainRows(empty).map((r) => r.key)).toEqual([
      'segment',
      'jtbd',
      'hypothesis',
      'feature',
      'rtb',
    ])
  })

  it('carries counts and percent through for every stage', () => {
    const rows = buildChainRows(counts({ segment: { total: 26, attached: 9 } }))
    const segment = rows.find((r) => r.key === 'segment')
    expect(segment).toMatchObject({ total: 26, attached: 9, percent: 35 })
    expect(rows).toHaveLength(CHAIN_STAGES.length)
  })
})

describe('weakestStage', () => {
  it('picks the lowest percentage among stages that have records', () => {
    const rows = buildChainRows(
      counts({
        segment: { total: 10, attached: 9 },
        jtbd: { total: 10, attached: 3 },
        hypothesis: { total: 10, attached: 7 },
      })
    )
    expect(weakestStage(rows)?.key).toBe('jtbd')
  })

  it('ignores stages with no records at all', () => {
    // A stage you have not started is not a broken link — naming it would
    // send the user to "fix" an empty module instead of the real gap.
    const rows = buildChainRows(
      counts({ segment: { total: 4, attached: 2 }, rtb: { total: 0, attached: 0 } })
    )
    expect(weakestStage(rows)?.key).toBe('segment')
  })

  it('returns null when everything present is fully connected', () => {
    const rows = buildChainRows(
      counts({ segment: { total: 3, attached: 3 }, jtbd: { total: 5, attached: 5 } })
    )
    expect(weakestStage(rows)).toBeNull()
  })

  it('returns null for a completely empty base', () => {
    expect(weakestStage(buildChainRows(empty))).toBeNull()
  })

  it('breaks ties toward the earliest stage', () => {
    // Fixing an upstream break often dissolves the ones below it, so the tie
    // goes to the segment, not the feature.
    const rows = buildChainRows(
      counts({ segment: { total: 10, attached: 5 }, feature: { total: 10, attached: 5 } })
    )
    expect(weakestStage(rows)?.key).toBe('segment')
  })
})

describe('chainIsEmpty', () => {
  it('is true only when no stage has a single record', () => {
    expect(chainIsEmpty(buildChainRows(empty))).toBe(true)
    expect(chainIsEmpty(buildChainRows(counts({ rtb: { total: 1, attached: 0 } })))).toBe(false)
  })
})
