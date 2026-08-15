// The link matrices (Связи).
//
// Every entry surface built so far — the wizard, the bulk panel, the CSV
// import, the quick-capture modal, the inbox — creates *records*. None of them
// creates a *link*, and the links are what the rest of the app reads: the
// discovery chain, the Сегменты × JTBD matrix, the gaps report, /marketing-hub's
// "что мы можем сказать" chain and /cpo's cross-product correlations all count
// attachments, not rows.
//
// Attaching them today means the record's own edit form: open, scroll to the
// checkbox list, tick one box, save, get redirected, go back. Three
// many-to-many relations × one form visit per record. This page is the same
// data as one grid of checkboxes.
//
// Pure on purpose — no Prisma here — so the axis rules and the "what is still
// unattached" verdict are unit tested without a database. The writes live in
// lib/actions/links.ts.

/** The three implicit many-to-many relations in schema.prisma. */
export type LinkKind = 'segment-jtbd' | 'jtbd-feature' | 'feature-rtb'

export interface LinkMatrixMeta {
  kind: LinkKind
  title: string
  hint: string
  /**
   * The side the `connect`/`disconnect` is written from, and the side that
   * gets one row. Rows are the long axis: a matrix scrolls down comfortably
   * and sideways badly, so the axis expected to grow is the vertical one.
   */
  rowModel: 'jtbd' | 'feature'
  colModel: 'segment' | 'jtbd' | 'rtb'
  rowHeader: string
  colHeader: string
  /** Named precisely so an empty axis says which module to go fill. */
  emptyMessage: string
}

export const LINK_MATRICES: LinkMatrixMeta[] = [
  {
    kind: 'segment-jtbd',
    title: 'JTBD × Сегменты',
    hint: 'Чья это задача. Без сегмента JTBD не попадёт ни в матрицу покрытия, ни в «Маркетинг».',
    rowModel: 'jtbd',
    colModel: 'segment',
    rowHeader: 'JTBD',
    colHeader: 'Сегменты',
    emptyMessage: 'Нужны и JTBD, и сегменты — сейчас есть не всё.',
  },
  {
    kind: 'jtbd-feature',
    title: 'Фичи × JTBD',
    hint: 'Какую задачу закрывает фича. Фича без JTBD попадает в отчёт «Пробелы».',
    rowModel: 'feature',
    colModel: 'jtbd',
    rowHeader: 'Фича',
    colHeader: 'JTBD',
    emptyMessage: 'Нужны и фичи, и JTBD — сейчас есть не всё.',
  },
  {
    kind: 'feature-rtb',
    title: 'Фичи × RTB',
    hint: 'На какую фичу опирается обещание. RTB без фичи — обещание без основания.',
    rowModel: 'feature',
    colModel: 'rtb',
    rowHeader: 'Фича',
    colHeader: 'RTB',
    emptyMessage: 'Нужны и фичи, и RTB — сейчас есть не всё.',
  },
]

export function linkMatrixByKind(kind: LinkKind): LinkMatrixMeta {
  const meta = LINK_MATRICES.find((m) => m.kind === kind)
  // Loud rather than a blank grid: a typo'd kind must not render as "nothing
  // to link here", which is indistinguishable from an empty product.
  if (!meta) throw new Error(`Unknown link matrix kind: ${kind}`)
  return meta
}

/** One cell's identity. Also the key the client holds its optimistic set by. */
export function linkKey(rowId: string, colId: string): string {
  return `${rowId}::${colId}`
}

export interface MatrixAxisItem {
  id: string
  /** Possibly the key phrase — short enough to read in a header or a row. */
  label: string
  /** The untouched text, for the title attribute. */
  fullLabel?: string
  href?: string
}

/**
 * The verdict in the section header.
 *
 * Counts rows with no link at all, because that is the number every report
 * downstream is actually reacting to — a row linked to one column is fine, a
 * row linked to none is the gap. Deliberately not a percentage: at these
 * counts «4 без связи» is more actionable than «73%».
 */
export function unlinkedRowCount(rows: MatrixAxisItem[], linked: Iterable<string>): number {
  const withLink = new Set<string>()
  for (const key of linked) {
    const rowId = key.slice(0, key.indexOf('::'))
    if (rowId) withLink.add(rowId)
  }
  return rows.filter((row) => !withLink.has(row.id)).length
}

/** Per-column totals, shown in the footer so a never-used column is visible. */
export function columnCounts(
  cols: MatrixAxisItem[],
  linked: Iterable<string>
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const col of cols) counts[col.id] = 0
  for (const key of linked) {
    const colId = key.slice(key.indexOf('::') + 2)
    if (colId in counts) counts[colId] += 1
  }
  return counts
}

/**
 * Column headers are rotated to vertical, so their length is the table's
 * height. A JTBD key phrase can still run 80 characters, and three matrices
 * stack on this page — at the full length the header band was the largest
 * thing on screen, above four rows of data. Past this the label is cut and
 * the full text stays in the header's title attribute.
 */
export const MAX_HEADER_CHARS = 22

export function truncateHeader(text: string, max = MAX_HEADER_CHARS): string {
  const clean = text.trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trimEnd() + '…'
}

/**
 * How tall the rotated header band has to be, from the longest label.
 *
 * A character-count heuristic rather than a measurement: the labels are all
 * one font at one size, and measuring would mean a layout pass on mount and a
 * visible reflow. A fixed height instead wastes ~120px above every short-label
 * matrix — three of them stack on this page, so that is a screenful.
 */
export function headerHeightPx(cols: MatrixAxisItem[]): number {
  const longest = cols.reduce((max, col) => Math.max(max, truncateHeader(col.label).length), 0)
  // ~7.2px per character at text-xs, plus the cell's own vertical padding.
  return Math.min(220, Math.max(56, Math.round(longest * 7.2) + 16))
}
