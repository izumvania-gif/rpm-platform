import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
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
// Фаза 12 редизайна 2.1 подтвердила это решение, а не отменила. План предлагал
// слить два графа в один; при разборе оказалось, что сливать нечего — общего у
// них только React Flow. Разные вопросы («как задачи связаны между собой» и
// «сходится ли цепочка»), разные модели узлов, разные жесты, разные таблицы
// раскладок. Один холст с фильтром по типу узла отвечал бы на оба вопроса
// хуже, чем два отвечают на свой. Поэтому из фазы взято то, ради чего она и
// затевалась: **фильтр по типу узла и слоистая раскладка** — здесь, — плюс
// взаимные ссылки между графами.
//
// Pure: the queries live in the page, the writes in lib/actions/product-canvas.ts.
// Everything here is unit-testable without a database or a browser.

export type CanvasKind = 'SEGMENT' | 'JTBD' | 'HYPOTHESIS'

export interface CanvasNodeInput {
  id: string
  kind: CanvasKind
  label: string
  /** Untouched text for the node's tooltip — `label` may be a key phrase. */
  fullLabel: string
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

/** Порядок типов — он же порядок цепочки, он же порядок колонок. */
export const CANVAS_KIND_ORDER: CanvasKind[] = ['SEGMENT', 'JTBD', 'HYPOTHESIS']

/** Единственное число — для выбора типа в форме создания. */
export const canvasKindLabels: Record<CanvasKind, string> = {
  SEGMENT: 'Сегмент',
  JTBD: 'Задача клиента',
  HYPOTHESIS: 'Гипотеза',
}

/** Множественное — для фильтра, который говорит о наборе, а не об экземпляре. */
export const canvasKindPluralLabels: Record<CanvasKind, string> = {
  SEGMENT: 'Сегменты',
  JTBD: 'Задачи',
  HYPOTHESIS: 'Гипотезы',
}

// Колонка на тип, в порядке цепочки: холст читается слева направо как
// сегмент → задача → гипотеза.
const COLUMN_X: Record<CanvasKind, number> = { SEGMENT: 0, JTBD: 340, HYPOTHESIS: 680 }
const ROW_HEIGHT = 130

/**
 * Слоистая раскладка (фаза 12 редизайна 2.1).
 *
 * До неё узлы просто складывались в колонку своего типа по порядку появления:
 * сегмент мог оказаться в одном конце холста, а его задачи в другом, и связи
 * шли через весь экран. Здесь порядок задаёт цепочка — тот же приём, что в
 * `layoutTree` для графа JTBD: самые правые узлы получают строки по очереди, а
 * родитель встаёт по центру своих детей.
 *
 * Задача может принадлежать нескольким сегментам, а узел стоит в одном месте,
 * поэтому её ставит первый сегмент, который её называет. Выбор произвольный,
 * но детерминированный — иначе раскладка бы «прыгала» между перезагрузками.
 *
 * Чистая функция: её результат — только начальное положение. Всё, что человек
 * перетащил руками, лежит в `positions` и всегда побеждает (правка 5 плана).
 */
export function layoutCanvas(
  input: Omit<CanvasGraphInput, 'positions'>
): Record<string, CanvasPosition> {
  const positions: Record<string, CanvasPosition> = {}
  let row = 0
  const nextY = () => row++ * ROW_HEIGHT

  const hypothesesByJtbd = new Map<string, typeof input.hypotheses>()
  for (const hypothesis of input.hypotheses) {
    if (!hypothesis.jtbdId) continue
    const list = hypothesesByJtbd.get(hypothesis.jtbdId) ?? []
    list.push(hypothesis)
    hypothesesByJtbd.set(hypothesis.jtbdId, list)
  }

  const jtbdById = new Map(input.jtbds.map((j) => [j.id, j]))
  const placedJtbds = new Set<string>()
  const placedHypotheses = new Set<string>()

  /** Ставит задачу и её гипотезы, возвращает y задачи — по нему центруется сегмент. */
  function placeJtbd(jtbdId: string): number {
    const childYs: number[] = []
    for (const hypothesis of hypothesesByJtbd.get(jtbdId) ?? []) {
      if (placedHypotheses.has(hypothesis.id)) continue
      const y = nextY()
      positions[nodeKey('HYPOTHESIS', hypothesis.id)] = { x: COLUMN_X.HYPOTHESIS, y }
      placedHypotheses.add(hypothesis.id)
      childYs.push(y)
    }
    const y = childYs.length > 0 ? (childYs[0] + childYs[childYs.length - 1]) / 2 : nextY()
    positions[nodeKey('JTBD', jtbdId)] = { x: COLUMN_X.JTBD, y }
    placedJtbds.add(jtbdId)
    return y
  }

  for (const segment of input.segments) {
    const childYs: number[] = []
    for (const jtbdId of segment.jtbdIds) {
      if (!jtbdById.has(jtbdId) || placedJtbds.has(jtbdId)) continue
      childYs.push(placeJtbd(jtbdId))
    }
    const y = childYs.length > 0 ? (childYs[0] + childYs[childYs.length - 1]) / 2 : nextY()
    positions[nodeKey('SEGMENT', segment.id)] = { x: COLUMN_X.SEGMENT, y }
  }

  // Оставшиеся — те, у кого нет родителя: задача без сегмента, гипотеза без
  // задачи. Именно они и рисуются пунктиром, и прятать их в раскладке нельзя.
  for (const jtbd of input.jtbds) {
    if (!placedJtbds.has(jtbd.id)) placeJtbd(jtbd.id)
  }
  for (const hypothesis of input.hypotheses) {
    if (placedHypotheses.has(hypothesis.id)) continue
    positions[nodeKey('HYPOTHESIS', hypothesis.id)] = { x: COLUMN_X.HYPOTHESIS, y: nextY() }
  }

  return positions
}

export function buildCanvasGraph(input: CanvasGraphInput): {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
} {
  const linkedJtbdIds = new Set(input.segments.flatMap((s) => s.jtbdIds))
  const jtbdsWithHypothesis = new Set(
    input.hypotheses.map((h) => h.jtbdId).filter((id): id is string => Boolean(id))
  )

  // Ручная расстановка всегда побеждает вычисленную; слоистая раскладка — это
  // то, что видно до первого перетаскивания (и то, что возвращает кнопка
  // «Разложить заново»).
  const computed = layoutCanvas(input)

  function place(kind: CanvasKind, id: string): CanvasPosition {
    const key = nodeKey(kind, id)
    return input.positions[key] ?? computed[key] ?? { x: COLUMN_X[kind], y: 0 }
  }

  const nodes: CanvasNode[] = [
    ...input.segments.map((segment) => ({
      id: nodeKey('SEGMENT', segment.id),
      kind: 'SEGMENT' as const,
      label: segment.name,
      fullLabel: segment.name,
      // A segment with no jobs is where the chain breaks first — the same
      // judgement /reports/gaps ranks highest (C3).
      dangling: segment.jtbdIds.length === 0,
      position: place('SEGMENT', segment.id),
    })),
    ...input.jtbds.map((jtbd) => ({
      id: nodeKey('JTBD', jtbd.id),
      kind: 'JTBD' as const,
      label: jtbdKeyPhrase(jtbd.title),
      fullLabel: jtbd.title,
      meta: jtbd.category,
      // Two ways for a job to dangle: nobody it belongs to, or nothing testing
      // it. Either way the chain around it is incomplete.
      dangling: !linkedJtbdIds.has(jtbd.id) || !jtbdsWithHypothesis.has(jtbd.id),
      position: place('JTBD', jtbd.id),
    })),
    ...input.hypotheses.map((hypothesis) => ({
      id: nodeKey('HYPOTHESIS', hypothesis.id),
      kind: 'HYPOTHESIS' as const,
      label: hypothesisKeyPhrase(hypothesis.statement),
      fullLabel: hypothesis.statement,
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
