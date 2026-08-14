import { describe, expect, it } from 'vitest'
import {
  MAX_ROWS,
  attentionSummary,
  buildModuleRows,
  type OverviewRow,
} from '@/lib/product-overview'

// Ranking for the product page's module cards. The card shows five rows out of
// however many exist, so which five it picks is the whole feature: if a segment
// with no jobs falls off the bottom, the card has quietly hidden the one row
// worth acting on.

const row = (label: string, attentionHint?: string): OverviewRow => ({
  href: `/x/${label}`,
  label,
  attentionHint,
})

describe('buildModuleRows', () => {
  it('puts rows needing attention first', () => {
    const data = buildModuleRows([row('a'), row('b', 'нет задач'), row('c')])
    expect(data.rows.map((r) => r.label)).toEqual(['b', 'a', 'c'])
  })

  it('keeps the caller’s order within each group', () => {
    // The incoming order is recency and carries meaning — the partition must
    // be stable, not a sort that reshuffles equals.
    const data = buildModuleRows([
      row('a1', 'x'),
      row('b1'),
      row('a2', 'x'),
      row('b2'),
      row('a3', 'x'),
    ])
    expect(data.rows.map((r) => r.label)).toEqual(['a1', 'a2', 'a3', 'b1', 'b2'])
  })

  it('caps the visible rows and reports how many are hidden', () => {
    const data = buildModuleRows(Array.from({ length: 9 }, (_, i) => row(`s${i}`)))
    expect(data.rows).toHaveLength(MAX_ROWS)
    expect(data.total).toBe(9)
    expect(data.hiddenCount).toBe(4)
  })

  it('never drops a row that needs attention in favour of one that does not', () => {
    // Six quiet rows first, one problem row last: without ranking, the problem
    // row would be exactly the one the cap cuts.
    const rows = [...Array.from({ length: 6 }, (_, i) => row(`ok${i}`)), row('проблема', 'сломано')]
    expect(buildModuleRows(rows).rows[0].label).toBe('проблема')
  })

  it('counts attention across all rows, not just the visible ones', () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(`s${i}`, 'нет задач'))
    const data = buildModuleRows(rows)
    expect(data.rows).toHaveLength(MAX_ROWS)
    expect(data.attentionCount).toBe(8)
  })

  it('handles an empty module without special-casing at the call site', () => {
    expect(buildModuleRows([])).toEqual({
      rows: [],
      total: 0,
      attentionCount: 0,
      hiddenCount: 0,
    })
  })
})

describe('attentionSummary', () => {
  it('builds the header verdict from the count and the caller’s noun', () => {
    const data = buildModuleRows([row('a', 'нет задач'), row('b', 'нет задач'), row('c')])
    expect(attentionSummary(data, 'без задач')).toBe('2 без задач')
  })

  it('says nothing when nothing is wrong', () => {
    // A verdict that always renders stops being a signal.
    expect(attentionSummary(buildModuleRows([row('a'), row('b')]), 'без задач')).toBeNull()
  })
})
