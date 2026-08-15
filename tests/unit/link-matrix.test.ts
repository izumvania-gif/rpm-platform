import { describe, expect, it } from 'vitest'
import {
  LINK_MATRICES,
  MAX_HEADER_CHARS,
  columnCounts,
  headerHeightPx,
  linkKey,
  linkMatrixByKind,
  truncateHeader,
  unlinkedRowCount,
  type MatrixAxisItem,
} from '@/lib/link-matrix'

const rows: MatrixAxisItem[] = [
  { id: 'j1', label: 'Продлить сертификат' },
  { id: 'j2', label: 'Выдать доступ новому сотруднику' },
  { id: 'j3', label: 'Отозвать доступ уволенному' },
]
const cols: MatrixAxisItem[] = [
  { id: 's1', label: 'Банки' },
  { id: 's2', label: 'Госзаказчики' },
]

describe('LINK_MATRICES', () => {
  it('covers exactly the three many-to-many relations in the schema', () => {
    expect(LINK_MATRICES.map((m) => m.kind)).toEqual([
      'segment-jtbd',
      'jtbd-feature',
      'feature-rtb',
    ])
  })

  it('writes each link from a model the ownership table knows', () => {
    // setLink calls denyUnowned with both of these; a model name that is not
    // in OWNERSHIP would throw at runtime, not at build time.
    for (const meta of LINK_MATRICES) {
      expect(['jtbd', 'feature']).toContain(meta.rowModel)
      expect(['segment', 'jtbd', 'rtb']).toContain(meta.colModel)
    }
  })

  it('throws on an unknown kind rather than rendering an empty grid', () => {
    // A blank matrix is indistinguishable from a product with no records —
    // exactly the wrong failure mode for a page about missing links.
    // @ts-expect-error deliberately invalid
    expect(() => linkMatrixByKind('segment-rtb')).toThrow(/segment-rtb/)
  })
})

describe('unlinkedRowCount', () => {
  it('counts rows with no link at all, not missing cells', () => {
    // j1 is linked once, j2 twice, j3 never: one row is the gap, not five
    // empty cells.
    const linked = [linkKey('j1', 's1'), linkKey('j2', 's1'), linkKey('j2', 's2')]
    expect(unlinkedRowCount(rows, linked)).toBe(1)
  })

  it('is the full row count when nothing is linked', () => {
    expect(unlinkedRowCount(rows, [])).toBe(3)
  })

  it('ignores links whose row is not on this axis', () => {
    expect(unlinkedRowCount(rows, [linkKey('gone', 's1')])).toBe(3)
  })
})

describe('columnCounts', () => {
  it('reports zero for a column nobody links to', () => {
    // The point of the footer: a segment with no JTBD at all is invisible in
    // the grid itself, since an all-empty column looks like every other
    // sparse one.
    expect(columnCounts(cols, [linkKey('j1', 's1')])).toEqual({ s1: 1, s2: 0 })
  })

  it('skips links pointing at a column that is not shown', () => {
    expect(columnCounts(cols, [linkKey('j1', 's9')])).toEqual({ s1: 0, s2: 0 })
  })
})

describe('linkKey', () => {
  it('round-trips through the two parsers that read it back', () => {
    const key = linkKey('row-1', 'col-2')
    expect(unlinkedRowCount([{ id: 'row-1', label: 'x' }], [key])).toBe(0)
    expect(columnCounts([{ id: 'col-2', label: 'y' }], [key])).toEqual({ 'col-2': 1 })
  })
})

describe('truncateHeader', () => {
  it('leaves a header that already fits untouched', () => {
    expect(truncateHeader('Банки топ-30')).toBe('Банки топ-30')
  })

  it('cuts a long one to the cap, ellipsis included', () => {
    const long = 'а'.repeat(MAX_HEADER_CHARS + 10)
    const result = truncateHeader(long)
    expect(result).toHaveLength(MAX_HEADER_CHARS)
    expect(result.endsWith('…')).toBe(true)
  })

  it('does not leave a dangling space before the ellipsis', () => {
    expect(truncateHeader('Выпуск и продление сертификата', 20)).toBe('Выпуск и продление…')
  })
})

describe('headerHeightPx', () => {
  it('shrinks the rotated band to the longest label', () => {
    const short = headerHeightPx([{ id: 'a', label: 'Банки' }])
    const long = headerHeightPx([{ id: 'a', label: 'Страховые компании и платёжные системы' }])
    expect(short).toBeLessThan(long)
  })

  it('never collapses below a readable minimum', () => {
    // Three matrices stack on the page, so an empty or one-letter axis must
    // not produce a header band that looks like a rendering bug.
    expect(headerHeightPx([])).toBe(56)
    expect(headerHeightPx([{ id: 'a', label: 'X' }])).toBe(56)
  })

  it('is capped by the truncation, not by the raw label', () => {
    const capped = headerHeightPx([{ id: 'a', label: 'а'.repeat(200) }])
    expect(capped).toBe(headerHeightPx([{ id: 'b', label: 'а'.repeat(MAX_HEADER_CHARS) }]))
  })
})
