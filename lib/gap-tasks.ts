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
  productId: string
  /** Where the resolving action starts — prefilled wherever the data allows. */
  href: string
  actionLabel: string
  /**
   * Resolution straight from the queue, without leaving it (фаза 25 плана
   * 2.4). `hypothesis-to-review` is a single unambiguous next state and a
   * button; `jtbd-confirm` is a research picker, never a bare button —
   * confirming claims research backing, and the row asks for that research
   * before it will confirm anything (see the ordering note below).
   */
  quickAction?: 'hypothesis-to-review' | 'jtbd-confirm'
}

/**
 * Where the queue lives, for the links that leave it (фаза 25 плана 2.4).
 *
 * Every row's action used to be a one-way trip: the form saved onto the new
 * record, the card had no way back, and a review of ten rows meant finding the
 * queue ten times. Form actions now carry the queue as `from` so saving
 * returns here; card actions carry it so the card can show «← К очереди».
 */
export interface GapTasksOptions {
  /** The queue's own path with its scope, e.g. `/reports/gaps?productId=…`. */
  returnTo?: string
}

const GAPS_PATH = '/reports/gaps'

/**
 * The queue path a card was opened from, or null.
 *
 * The value comes from the address bar, so it is accepted only when it is the
 * queue itself — a same-origin path is not enough, since the link is rendered
 * as «← К очереди» and must lead to the queue, not anywhere a link could point.
 */
export function gapsQueuePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value !== GAPS_PATH && !value.startsWith(`${GAPS_PATH}?`)) return null
  if (/[\s\\]/.test(value)) return null
  return value
}

function withReturn(href: string, returnTo: string | undefined): string {
  if (!returnTo) return href
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}from=${encodeURIComponent(returnTo)}`
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

function buildTasks(input: GapTasksInput, kind: GapKind, returnTo?: string): GapTask[] {
  switch (kind) {
    case 'segment-without-jtbd':
      return input.segmentsWithoutJtbd.map((segment) => ({
        id: `segment-without-jtbd:${segment.id}`,
        kind,
        recordId: segment.id,
        title: segment.name,
        fullTitle: segment.name,
        productName: segment.product.name,
        productId: segment.product.id,
        // Both the product and the segment are known here, so the form opens
        // already pointed at them — the gap names the missing link, the link
        // should not have to be re-entered by hand.
        href: withReturn(
          `/jtbd/new?productId=${segment.product.id}&segmentId=${segment.id}`,
          returnTo
        ),
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
        productId: product.id,
        href: withReturn(`/research/new?productId=${product.id}`, returnTo),
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
        productId: hypothesis.product.id,
        href: withReturn(`/hypotheses/${hypothesis.id}`, returnTo),
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
        productId: jtbd.product.id,
        href: withReturn(`/jtbd/${jtbd.id}`, returnTo),
        actionLabel: 'Открыть',
        // A picker, not a one-click "Подтвердить": confirming means "backed by
        // research", and a bare button would invite rubber-stamping the exact
        // metric this gap exists to measure. The row asks which research —
        // and only then confirms — so the claim is made, not skipped. Same
        // reasoning keeps JTBD out of bulk entry (A1) and the Inbox (B1).
        quickAction: 'jtbd-confirm',
      }))
  }
}

/** Non-empty groups only, most blocking first. */
export function buildGapTasks(input: GapTasksInput, options: GapTasksOptions = {}): GapGroup[] {
  return GROUP_ORDER.map((kind) => {
    const tasks = buildTasks(input, kind, options.returnTo)
    return { kind, ...GROUP_COPY[kind], count: tasks.length, tasks }
  }).filter((group) => group.count > 0)
}

export function totalGapTasks(groups: GapGroup[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0)
}
