import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

// Gaps as a work queue (plans/2.0-product-leap-plan.md, C3).
//
// /reports/gaps already knew what was missing; it just listed it. This turns
// each row into a task with the action that resolves it, and — the part that
// makes it a queue rather than four lists — ranks the groups so the page can
// answer "what do I do first" instead of "here is everything at once".
//
// Pure on purpose: the queries stay in lib/dashboard-metrics.ts, this shapes
// their output, so the ordering and the wording are unit-testable without a DB.

export type GapKind =
  'segment-without-jtbd' | 'product-without-research' | 'stuck-hypothesis' | 'unconfirmed-jtbd'

export interface GapTask {
  /** Stable and kind-prefixed: record ids are only unique within their model. */
  id: string
  kind: GapKind
  recordId: string
  /**
   * What the row shows. For a JTBD or a hypothesis this is the key phrase
   * (lib/key-phrase.ts) rather than the full templated sentence — the queue is
   * scanned top to bottom, and «Когда …» / «Если …» openers made every row
   * look alike exactly where the differences matter.
   */
  title: string
  /** The record's own name exactly as the PM wrote it, for the row's tooltip. */
  fullTitle: string
  productName: string
  /** Where the resolving action starts — prefilled wherever the data allows. */
  href: string
  actionLabel: string
  /**
   * A single unambiguous next state that can be applied straight from the
   * queue. Only stuck hypotheses have one — see the note on the ordering
   * below for why unconfirmed JTBD deliberately does not.
   */
  quickAction?: 'hypothesis-to-review'
}

export interface GapGroup {
  kind: GapKind
  heading: string
  /** Imperative — what to do about this group, not what it is. */
  directive: string
  /** Why the group sits where it does in the queue. */
  why: string
  count: number
  tasks: GapTask[]
}

/**
 * Queue order, most blocking first. This is a real sequence — the reason to
 * rank at all is that these gaps are not equally urgent:
 *
 * 1. A segment with no JTBD blocks the entire chain below it: no jobs means no
 *    hypotheses, no features, and a coverage report with nothing to measure.
 * 2. A product with no recent research means the discovery practice itself has
 *    stopped, which is upstream of every individual record.
 * 3. A hypothesis stuck in draft is work already started and now frozen.
 * 4. An unconfirmed JTBD is a quality gap, not a blocker — the model still
 *    works, it is just not yet backed by evidence.
 */
const GROUP_ORDER: GapKind[] = [
  'segment-without-jtbd',
  'product-without-research',
  'stuck-hypothesis',
  'unconfirmed-jtbd',
]

const GROUP_COPY: Record<GapKind, { heading: string; directive: string; why: string }> = {
  'segment-without-jtbd': {
    heading: 'Сегменты без единого JTBD',
    directive: 'Добавьте хотя бы одну задачу клиента',
    why: 'Без задач клиента у сегмента не может появиться ни гипотез, ни фич — дальше цепочка обрывается.',
  },
  'product-without-research': {
    heading: 'Продукты без исследований за 3 месяца',
    directive: 'Запланируйте исследование',
    why: 'Остановилась сама практика дискавери, а не отдельная запись.',
  },
  'stuck-hypothesis': {
    heading: 'Гипотезы, зависшие в черновике',
    directive: 'Отправьте на проверку или закройте',
    why: 'Работа начата и замерла дольше 14 дней.',
  },
  'unconfirmed-jtbd': {
    heading: 'JTBD без подтверждения исследованием',
    directive: 'Привяжите исследование',
    why: 'Не блокер: модель работает, но на неё пока нельзя опереться как на проверенную.',
  },
}

interface WithProduct {
  id: string
  product: { id: string; name: string }
}

export interface GapTasksInput {
  segmentsWithoutJtbd: (WithProduct & { name: string })[]
  productsWithoutRecentResearch: { id: string; name: string }[]
  stuckHypotheses: (WithProduct & { statement: string })[]
  unconfirmedJtbds: (WithProduct & { title: string })[]
}

function buildTasks(input: GapTasksInput, kind: GapKind): GapTask[] {
  switch (kind) {
    case 'segment-without-jtbd':
      return input.segmentsWithoutJtbd.map((segment) => ({
        id: `segment-without-jtbd:${segment.id}`,
        kind,
        recordId: segment.id,
        title: segment.name,
        fullTitle: segment.name,
        productName: segment.product.name,
        // Both the product and the segment are known here, so the form opens
        // already pointed at them — the gap names the missing link, the link
        // should not have to be re-entered by hand.
        href: `/jtbd/new?productId=${segment.product.id}&segmentId=${segment.id}`,
        actionLabel: 'Добавить JTBD',
      }))
    case 'product-without-research':
      return input.productsWithoutRecentResearch.map((product) => ({
        id: `product-without-research:${product.id}`,
        kind,
        recordId: product.id,
        title: product.name,
        fullTitle: product.name,
        productName: product.name,
        href: `/research/new?productId=${product.id}`,
        actionLabel: 'Запланировать исследование',
      }))
    case 'stuck-hypothesis':
      return input.stuckHypotheses.map((hypothesis) => ({
        id: `stuck-hypothesis:${hypothesis.id}`,
        kind,
        recordId: hypothesis.id,
        title: hypothesisKeyPhrase(hypothesis.statement),
        fullTitle: hypothesis.statement,
        productName: hypothesis.product.name,
        href: `/hypotheses/${hypothesis.id}`,
        actionLabel: 'Открыть',
        // Status is a workflow field, not a claim about evidence, so moving a
        // frozen draft forward one step straight from the queue is honest.
        quickAction: 'hypothesis-to-review',
      }))
    case 'unconfirmed-jtbd':
      return input.unconfirmedJtbds.map((jtbd) => ({
        id: `unconfirmed-jtbd:${jtbd.id}`,
        kind,
        recordId: jtbd.id,
        title: jtbdKeyPhrase(jtbd.title),
        fullTitle: jtbd.title,
        productName: jtbd.product.name,
        // Deliberately a link, not a one-click "Подтвердить": confirming means
        // "backed by research", and a button here would invite rubber-stamping
        // the exact metric this gap exists to measure. Same reasoning that
        // keeps JTBD out of bulk entry (A1) and the Inbox (B1).
        href: `/jtbd/${jtbd.id}`,
        actionLabel: 'Привязать исследование',
      }))
  }
}

/** Non-empty groups only, most blocking first. */
export function buildGapTasks(input: GapTasksInput): GapGroup[] {
  return GROUP_ORDER.map((kind) => {
    const tasks = buildTasks(input, kind)
    return { kind, ...GROUP_COPY[kind], count: tasks.length, tasks }
  }).filter((group) => group.count > 0)
}

export function totalGapTasks(groups: GapGroup[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0)
}
