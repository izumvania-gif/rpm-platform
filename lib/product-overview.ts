// Ranking and trimming for the product page's module cards.
//
// The page listed every record in full: a JTBD row was the whole
// «Когда … я хочу … чтобы …» sentence, a hypothesis row the whole «Если … то …».
// Measured on the seeded product: 688 words and 2715px of page for ten cards,
// with 41 list items — and not one of them carried the state the app already
// knows (confirmed, статус, давно не обновлялось, ни с чем не связано). Reading
// it end to end told you what exists; it never told you what to do.
//
// So a row here is a line, not a body: one truncated label, one short piece of
// state, and a mark when it needs attention. Cards lead with the rows that need
// attention rather than with the newest ones, and stop at five — the module's
// own page is one click away and is the right place for the full list.
//
// Pure module: every call site passes rows it has already fetched.

/** Five is where a card still reads as a glance rather than as a list. */
export const MAX_ROWS = 5

export type OverviewRow = {
  href: string
  label: string
  /** Short right-hand state: «4 JTBD», «12 марта», «На проверке». */
  meta?: string
  /** Set only when the row is the reason someone should open this card. */
  attentionHint?: string
}

export type ModuleRows = {
  /** At most MAX_ROWS, attention first. */
  rows: OverviewRow[]
  total: number
  attentionCount: number
  hiddenCount: number
}

/**
 * Attention first, then whatever order the caller passed (recency, usually).
 *
 * A stable partition rather than a sort: within each group the caller's order
 * is meaningful and must survive.
 */
export function buildModuleRows(rows: OverviewRow[], limit = MAX_ROWS): ModuleRows {
  const needsAttention = rows.filter((row) => row.attentionHint)
  const rest = rows.filter((row) => !row.attentionHint)
  const ranked = [...needsAttention, ...rest]

  return {
    rows: ranked.slice(0, limit),
    total: rows.length,
    attentionCount: needsAttention.length,
    hiddenCount: Math.max(0, rows.length - limit),
  }
}

/**
 * The card header's one-phrase verdict, e.g. «3 без задач».
 *
 * Returns null when nothing needs attention — a card with nothing wrong says
 * nothing, so the phrase stays a signal instead of decoration.
 */
export function attentionSummary(data: ModuleRows, label: string): string | null {
  return data.attentionCount > 0 ? `${data.attentionCount} ${label}` : null
}
