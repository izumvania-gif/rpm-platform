// The discovery chain: how much of what you have is actually wired together.
//
// The platform's whole claim over a Notion table is that the links are real
// (docs/user-guide/README.md). Every page can show its own links, but nothing
// answered "how connected is the base as a whole" — you had to open records
// one by one to notice a segment nobody wrote a JTBD for.
//
// Deliberately NOT drawn as a funnel. A funnel promises each stage is a subset
// of the one before it, and here it is not: a hypothesis is not a subset of a
// JTBD, and features hang off JTBD directly rather than off hypotheses. What
// each stage really is, is one ratio against a limit — attached vs total —
// which the dataviz skill's form table answers with a meter, so this is a row
// of five meters, not a funnel. See also the widget component.
//
// Pure module: the counting lives in lib/dashboard-metrics.ts, same split as
// lib/nav-disclosure.ts / lib/nav-stage.ts.

export type ChainStageKey = 'segment' | 'jtbd' | 'hypothesis' | 'feature' | 'rtb'

export type ChainStage = {
  key: ChainStageKey
  /** Plural noun for the row label. */
  label: string
  /** What "attached" means for this stage, in the user's words. */
  attachedTo: string
  href: string
}

/**
 * Order follows the methodology, not the schema: who the customer is, what
 * job they have, what we believe, what we built, what we claim.
 */
export const CHAIN_STAGES: ChainStage[] = [
  { key: 'segment', label: 'Сегменты', attachedTo: 'есть хотя бы один JTBD', href: '/segments' },
  { key: 'jtbd', label: 'JTBD', attachedTo: 'привязан к сегменту', href: '/jtbd' },
  { key: 'hypothesis', label: 'Гипотезы', attachedTo: 'привязана к JTBD', href: '/hypotheses' },
  { key: 'feature', label: 'Фичи', attachedTo: 'закрывает хотя бы один JTBD', href: '/features' },
  { key: 'rtb', label: 'Маркетинг', attachedTo: 'опирается на фичу', href: '/marketing' },
]

export type StageCounts = { total: number; attached: number }
export type ChainCounts = Record<ChainStageKey, StageCounts>

export type ChainRow = ChainStage & StageCounts & { percent: number }

/** 0 when there is nothing yet — never NaN, and never 100% for an empty stage. */
export function attachedPercent(attached: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((attached / total) * 100)
}

export function buildChainRows(counts: ChainCounts): ChainRow[] {
  return CHAIN_STAGES.map((stage) => {
    const { total, attached } = counts[stage.key]
    return { ...stage, total, attached, percent: attachedPercent(attached, total) }
  })
}

/**
 * The stage to point at: the weakest link that actually has records.
 *
 * An empty stage is not a broken link — it is a stage you have not started,
 * and calling it "0% связано" would send someone to fix the wrong thing. Ties
 * go to the earliest stage, since fixing an upstream break usually dissolves
 * the ones below it.
 */
export function weakestStage(rows: ChainRow[]): ChainRow | null {
  const withRecords = rows.filter((row) => row.total > 0)
  if (withRecords.length === 0) return null

  let weakest = withRecords[0]
  for (const row of withRecords) {
    if (row.percent < weakest.percent) weakest = row
  }
  return weakest.percent === 100 ? null : weakest
}

export function chainIsEmpty(rows: ChainRow[]): boolean {
  return rows.every((row) => row.total === 0)
}
