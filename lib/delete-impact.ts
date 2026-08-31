// What a delete actually costs (plans/2.0-hardening-plan.md, B4).
//
// The schema has 38 `onDelete: Cascade` relations, and deleting one seeded
// product takes 41 direct child records with it. Until now the only warning
// was a native `confirm('Удалить безвозвратно?')` — one line, not a single
// number in it, and nothing to undo it with afterwards.
//
// This file is the pure half: the vocabulary and the formatting. The counting
// lives in lib/actions/delete-impact.ts, so this stays unit-testable and
// importable from a client component. Same split as
// lib/nav-disclosure.ts / lib/nav-stage.ts.

import { pluralizeRu } from '@/lib/plural'

/** Everything a delete can take with it or detach from. */
export type ImpactKey =
  | 'product'
  | 'segment'
  | 'jtbd'
  | 'childJtbd'
  | 'hypothesis'
  | 'research'
  | 'feature'
  | 'conversation'
  | 'rtb'
  | 'insight'
  | 'competitor'
  | 'competitorNews'
  | 'productResource'
  | 'roadmapItem'
  | 'process'
  | 'processStep'
  | 'processEdge'
  | 'actionPlan'
  | 'teamMember'
  | 'statusChange'
  | 'sequenceEdge'

/** [1 штука, 2–4 штуки, 5 штук] — the three Russian plural forms. */
const NOUNS: Record<ImpactKey, [string, string, string]> = {
  product: ['продукт', 'продукта', 'продуктов'],
  segment: ['сегмент', 'сегмента', 'сегментов'],
  jtbd: ['JTBD', 'JTBD', 'JTBD'],
  childJtbd: ['дочерний JTBD', 'дочерних JTBD', 'дочерних JTBD'],
  hypothesis: ['гипотеза', 'гипотезы', 'гипотез'],
  research: ['исследование', 'исследования', 'исследований'],
  feature: ['фича', 'фичи', 'фич'],
  conversation: ['разговор', 'разговора', 'разговоров'],
  rtb: ['маркетинговое обещание', 'маркетинговых обещания', 'маркетинговых обещаний'],
  insight: ['инсайт', 'инсайта', 'инсайтов'],
  competitor: ['конкурент', 'конкурента', 'конкурентов'],
  competitorNews: ['новость конкурента', 'новости конкурентов', 'новостей конкурентов'],
  productResource: ['материал', 'материала', 'материалов'],
  roadmapItem: ['пункт роадмапа', 'пункта роадмапа', 'пунктов роадмапа'],
  process: ['процесс', 'процесса', 'процессов'],
  processStep: ['шаг процесса', 'шага процесса', 'шагов процесса'],
  processEdge: ['связь между шагами', 'связи между шагами', 'связей между шагами'],
  actionPlan: ['экшн-план', 'экшн-плана', 'экшн-планов'],
  teamMember: ['участник команды', 'участника команды', 'участников команды'],
  statusChange: ['запись истории статусов', 'записи истории статусов', 'записей истории статусов'],
  sequenceEdge: ['связь в графе JTBD', 'связи в графе JTBD', 'связей в графе JTBD'],
}

export type ImpactCount = { key: ImpactKey; count: number }

/**
 * Two honestly different consequences.
 *
 * `deleted` is what the cascade removes for good; `unlinked` is what survives
 * but loses a reference (`onDelete: SetNull` and many-to-many detaches). The
 * dialog must not blur the two — «5 гипотез» reads very differently when they
 * are about to disappear than when they merely lose their segment.
 */
export type DeleteImpact = { deleted: ImpactCount[]; unlinked: ImpactCount[] }

export const EMPTY_IMPACT: DeleteImpact = { deleted: [], unlinked: [] }

/** «9 сегментов», «1 гипотеза», «2 разговора». */
export function formatImpactCount({ key, count }: ImpactCount): string {
  return pluralizeRu(count, NOUNS[key])
}

/**
 * Bookkeeping rows the user never created by hand — status history, graph
 * edges. They are honest to show (they really are deleted) but they are not
 * what makes someone stop: for the seeded product the status history is the
 * single biggest number, and sorting by size alone pushed «9 сегментов» below
 * it. Same reasoning as GROUP_ORDER in lib/gap-tasks.ts — rank by weight,
 * then by size, never by size alone.
 */
const DERIVED: ReadonlySet<ImpactKey> = new Set(['statusChange', 'sequenceEdge', 'processEdge'])

/** Drops zero rows, then puts the rows worth reading first. */
export function summarizeImpact(counts: ImpactCount[]): ImpactCount[] {
  return counts
    .filter((c) => c.count > 0)
    .sort((a, b) => {
      const weight = Number(DERIVED.has(a.key)) - Number(DERIVED.has(b.key))
      return weight !== 0 ? weight : b.count - a.count
    })
}

export function totalImpact(impact: DeleteImpact): number {
  const sum = (counts: ImpactCount[]) => counts.reduce((acc, c) => acc + c.count, 0)
  return sum(impact.deleted) + sum(impact.unlinked)
}
