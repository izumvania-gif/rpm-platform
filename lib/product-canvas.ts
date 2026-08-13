// The product canvas (plans/2.0-product-leap-plan.md, C2).
//
// The JTBD graph answers "how do these jobs relate to each other" — hierarchy,
// sequence, one layout per segment view. This answers a different question:
// **does the discovery chain hold together?** Segment -> JTBD -> Hypothesis on
// one surface, where a segment with no jobs or a job with no hypotheses is
// visible as a dangling node rather than as a row in a report.
//
// Both canvases stay: collapsing them would lose the JTBD graph's hierarchy,
// sequence edges and per-segment layouts, none of which mean anything for a
// cross-model view.
//
// Pure: the queries live in the page, the writes in lib/actions/product-canvas.ts.
// Everything here is unit-testable without a database or a browser.

export type CanvasKind = 'SEGMENT' | 'JTBD' | 'HYPOTHESIS'

export interface CanvasNodeInput {
  id: string
  kind: CanvasKind
  label: string
  /** Small second line — category for a job, status for a hypothesis. */
  meta?: string
  /** Drives the "unfinished chain" accent; see danglingReason below. */
  dangling?: boolean
}

export interface CanvasPosition {
  x: number
  y: number
}

export interface CanvasGraphInput {
  segments: { id: string; name: string; jtbdIds: string[] }[]
  jtbds: { id: string; title: string; category: string; confirmed: boolean }[]
  hypotheses: { id: string; statement: string; status: string; jtbdId: string | null }[]
  positions: Record<string, CanvasPosition>
}

export interface CanvasNode extends CanvasNodeInput {
  position: CanvasPosition
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
  /** Which real relation this edge stands for — the unlink action needs it. */
  relation: 'segment-jtbd' | 'jtbd-hypothesis'
}

/** Node ids must be unique across kinds; record ids are only unique per model. */
export function nodeKey(kind: CanvasKind, id: string): string {
  return `${kind}:${id}`
}

export function parseNodeKey(key: string): { kind: CanvasKind; id: string } | null {
  const at = key.indexOf(':')
  if (at < 0) return null
  const kind = key.slice(0, at)
  const id = key.slice(at + 1)
  if (kind !== 'SEGMENT' && kind !== 'JTBD' && kind !== 'HYPOTHESIS') return null
  if (!id) return null
  return { kind, id }
}

/**
 * Which drags mean something. Direction matters: the chain runs
 * segment -> job -> hypothesis, and a link dragged the other way is a mistake
 * rather than a different relation, so it is rejected instead of guessed at.
 */
export function canLink(source: CanvasKind, target: CanvasKind): boolean {
  return (
    (source === 'SEGMENT' && target === 'JTBD') || (source === 'JTBD' && target === 'HYPOTHESIS')
  )
}

export function relationFor(source: CanvasKind, target: CanvasKind): CanvasEdge['relation'] | null {
  if (source === 'SEGMENT' && target === 'JTBD') return 'segment-jtbd'
  if (source === 'JTBD' && target === 'HYPOTHESIS') return 'jtbd-hypothesis'
  return null
}

// Fallback layout: one column per kind, in chain order, so an untouched canvas
// already reads left-to-right as segment -> job -> hypothesis instead of
// piling every node on the origin.
const COLUMN_X: Record<CanvasKind, number> = { SEGMENT: 0, JTBD: 340, HYPOTHESIS: 680 }
const ROW_HEIGHT = 130

export function buildCanvasGraph(input: CanvasGraphInput): {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
} {
  const linkedJtbdIds = new Set(input.segments.flatMap((s) => s.jtbdIds))
  const jtbdsWithHypothesis = new Set(
    input.hypotheses.map((h) => h.jtbdId).filter((id): id is string => Boolean(id))
  )

  const perKindCount: Record<CanvasKind, number> = { SEGMENT: 0, JTBD: 0, HYPOTHESIS: 0 }

  function place(kind: CanvasKind, id: string): CanvasPosition {
    const saved = input.positions[nodeKey(kind, id)]
    if (saved) return saved
    const row = perKindCount[kind]++
    return { x: COLUMN_X[kind], y: row * ROW_HEIGHT }
  }

  const nodes: CanvasNode[] = [
    ...input.segments.map((segment) => ({
      id: nodeKey('SEGMENT', segment.id),
      kind: 'SEGMENT' as const,
      label: segment.name,
      // A segment with no jobs is where the chain breaks first — the same
      // judgement /reports/gaps ranks highest (C3).
      dangling: segment.jtbdIds.length === 0,
      position: place('SEGMENT', segment.id),
    })),
    ...input.jtbds.map((jtbd) => ({
      id: nodeKey('JTBD', jtbd.id),
      kind: 'JTBD' as const,
      label: jtbd.title,
      meta: jtbd.category,
      // Two ways for a job to dangle: nobody it belongs to, or nothing testing
      // it. Either way the chain around it is incomplete.
      dangling: !linkedJtbdIds.has(jtbd.id) || !jtbdsWithHypothesis.has(jtbd.id),
      position: place('JTBD', jtbd.id),
    })),
    ...input.hypotheses.map((hypothesis) => ({
      id: nodeKey('HYPOTHESIS', hypothesis.id),
      kind: 'HYPOTHESIS' as const,
      label: hypothesis.statement,
      meta: hypothesis.status,
      dangling: hypothesis.jtbdId === null,
      position: place('HYPOTHESIS', hypothesis.id),
    })),
  ]

  const jtbdIds = new Set(input.jtbds.map((j) => j.id))
  const edges: CanvasEdge[] = [
    ...input.segments.flatMap((segment) =>
      segment.jtbdIds
        .filter((jtbdId) => jtbdIds.has(jtbdId))
        .map((jtbdId) => ({
          id: `sj-${segment.id}-${jtbdId}`,
          source: nodeKey('SEGMENT', segment.id),
          target: nodeKey('JTBD', jtbdId),
          relation: 'segment-jtbd' as const,
        }))
    ),
    ...input.hypotheses
      .filter((h) => h.jtbdId && jtbdIds.has(h.jtbdId))
      .map((h) => ({
        id: `jh-${h.jtbdId}-${h.id}`,
        source: nodeKey('JTBD', h.jtbdId as string),
        target: nodeKey('HYPOTHESIS', h.id),
        relation: 'jtbd-hypothesis' as const,
      })),
  ]

  // Segment -> Hypothesis is a real column on the model, but drawing it here
  // would put a second edge beside almost every jtbd-hypothesis one (a
  // hypothesis usually names both the job and that job's segment) and turn the
  // chain into a mesh. The canvas is about the chain; the hypothesis's own page
  // still shows its segment.
  return { nodes, edges }
}

/** Why a node is drawn as unfinished — shown as the node's tooltip. */
export function danglingReason(kind: CanvasKind): string {
  switch (kind) {
    case 'SEGMENT':
      return 'У сегмента нет ни одной задачи клиента'
    case 'JTBD':
      return 'Задача не привязана к сегменту или не проверяется гипотезой'
    case 'HYPOTHESIS':
      return 'Гипотеза не привязана к задаче клиента'
  }
}
