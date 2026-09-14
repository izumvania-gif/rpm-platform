import { describe, expect, it } from 'vitest'
import { buildGapTasks, gapsQueuePath, totalGapTasks, type GapTasksInput } from '@/lib/gap-tasks'

const product = { id: 'p1', name: 'Продукт А' }

function input(overrides: Partial<GapTasksInput> = {}): GapTasksInput {
  return {
    segmentsWithoutJtbd: [],
    productsWithoutRecentResearch: [],
    stuckHypotheses: [],
    unconfirmedJtbds: [],
    ...overrides,
  }
}

describe('buildGapTasks', () => {
  it('ranks groups by how much they block, not by input order', () => {
    const groups = buildGapTasks(
      input({
        // Deliberately supplied in reverse of the expected queue order.
        unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }],
        stuckHypotheses: [{ id: 'h1', statement: 'Гипотеза', product }],
        productsWithoutRecentResearch: [product],
        segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }],
      })
    )
    expect(groups.map((g) => g.kind)).toEqual([
      'segment-without-jtbd',
      'product-without-research',
      'stuck-hypothesis',
      'unconfirmed-jtbd',
    ])
  })

  it('omits groups that have no tasks, so the queue shows only real work', () => {
    const groups = buildGapTasks(
      input({ segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }] })
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('segment-without-jtbd')
    expect(groups[0].count).toBe(1)
  })

  it('is empty when nothing is missing', () => {
    expect(buildGapTasks(input())).toEqual([])
  })

  it('prefills both product and segment on the add-JTBD link', () => {
    const [group] = buildGapTasks(
      input({ segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }] })
    )
    expect(group.tasks[0].href).toBe('/jtbd/new?productId=p1&segmentId=s1')
    expect(group.tasks[0].actionLabel).toBe('Добавить JTBD')
  })

  it('points a stale product at a new research, prefilled', () => {
    const [group] = buildGapTasks(input({ productsWithoutRecentResearch: [product] }))
    expect(group.tasks[0].href).toBe('/research/new?productId=p1')
  })

  it('offers quick actions only where one click resolves the gap without inventing a fact', () => {
    const groups = buildGapTasks(
      input({
        stuckHypotheses: [{ id: 'h1', statement: 'Гипотеза', product }],
        unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }],
        segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }],
      })
    )
    // A stuck hypothesis moves to review; an unconfirmed JTBD gets a research
    // picker (the research is chosen, never invented). A segment without a JTBD
    // needs a new record and therefore a form, so it has no quick action.
    const quick = groups.flatMap((g) => g.tasks).filter((t) => t.quickAction)
    expect(quick.map((t) => [t.kind, t.quickAction])).toEqual([
      ['stuck-hypothesis', 'hypothesis-to-review'],
      ['unconfirmed-jtbd', 'jtbd-confirm'],
    ])
  })

  it('confirms an unconfirmed JTBD only through a research picker, never a bare button', () => {
    // Confirming claims research backing; a one-click button here would let
    // the queue rubber-stamp the metric it exists to measure. The picker asks
    // which research first (фаза 25 плана 2.4), so the claim is made, not
    // skipped — and the card stays one link away for everything else.
    const [group] = buildGapTasks(
      input({ unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }] })
    )
    expect(group.tasks[0].quickAction).toBe('jtbd-confirm')
    expect(group.tasks[0].href).toBe('/jtbd/j1')
    expect(group.tasks[0].actionLabel).toBe('Открыть')
  })

  it('carries the queue as `from` so every action can come back (фаза 25)', () => {
    const returnTo = '/reports/gaps?productId=p1'
    const groups = buildGapTasks(
      input({
        segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }],
        productsWithoutRecentResearch: [product],
        stuckHypotheses: [{ id: 'h1', statement: 'Гипотеза', product }],
        unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }],
      }),
      { returnTo }
    )
    const hrefs = Object.fromEntries(groups.map((g) => [g.kind, g.tasks[0].href]))
    const from = `from=${encodeURIComponent(returnTo)}`
    // Form actions: `&` after the prefilled params; card actions: `?`.
    expect(hrefs['segment-without-jtbd']).toBe(`/jtbd/new?productId=p1&segmentId=s1&${from}`)
    expect(hrefs['product-without-research']).toBe(`/research/new?productId=p1&${from}`)
    expect(hrefs['stuck-hypothesis']).toBe(`/hypotheses/h1?${from}`)
    expect(hrefs['unconfirmed-jtbd']).toBe(`/jtbd/j1?${from}`)
  })

  it('names the product on every task, for the row pickers', () => {
    const groups = buildGapTasks(
      input({
        segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }],
        unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }],
      })
    )
    for (const task of groups.flatMap((g) => g.tasks)) expect(task.productId).toBe('p1')
  })

  it('gives every task an id unique across kinds', () => {
    // Record ids are only unique per model, so a segment and a JTBD can share
    // one — the kind prefix is what keeps React keys distinct.
    const groups = buildGapTasks(
      input({
        segmentsWithoutJtbd: [{ id: 'same', name: 'Банки', product }],
        unconfirmedJtbds: [{ id: 'same', title: 'JTBD', product }],
      })
    )
    const ids = groups.flatMap((g) => g.tasks).map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('shows the key phrase but carries the untouched record text alongside it', () => {
    const [group] = buildGapTasks(
      input({
        stuckHypotheses: [
          { id: 'h1', statement: 'Если убрать визит в офис, то онбординг ускорится', product },
        ],
      })
    )
    // The queue is scanned, so the row leads with the intervention; the full
    // sentence still travels with it for the row's tooltip.
    expect(group.tasks[0].title).toBe('Убрать визит в офис')
    expect(group.tasks[0].fullTitle).toBe('Если убрать визит в офис, то онбординг ускорится')
    expect(group.tasks[0].productName).toBe('Продукт А')
  })

  it('leaves a name-like title alone in both fields', () => {
    const [group] = buildGapTasks(
      input({ segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }] })
    )
    expect(group.tasks[0].title).toBe('Банки')
    expect(group.tasks[0].fullTitle).toBe('Банки')
  })

  it('states a directive in the imperative, not a label', () => {
    const [group] = buildGapTasks(
      input({ segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }] })
    )
    expect(group.directive).toBe('Добавьте хотя бы одну задачу клиента')
    expect(group.heading).toBe('Сегменты без единого JTBD')
    expect(group.why).not.toBe('')
  })
})

describe('totalGapTasks', () => {
  it('sums across groups', () => {
    const groups = buildGapTasks(
      input({
        segmentsWithoutJtbd: [
          { id: 's1', name: 'A', product },
          { id: 's2', name: 'B', product },
        ],
        unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }],
      })
    )
    expect(totalGapTasks(groups)).toBe(3)
  })

  it('is zero for an empty queue', () => {
    expect(totalGapTasks([])).toBe(0)
  })
})

describe('gapsQueuePath', () => {
  it('accepts only the queue itself, with or without a scope', () => {
    expect(gapsQueuePath('/reports/gaps')).toBe('/reports/gaps')
    expect(gapsQueuePath('/reports/gaps?productId=p1')).toBe('/reports/gaps?productId=p1')
    expect(gapsQueuePath('/reports/gaps?productId=all')).toBe('/reports/gaps?productId=all')
  })

  it('rejects anything that is not the queue — the link is labelled «К очереди»', () => {
    expect(gapsQueuePath('/reports/gapsx')).toBeNull()
    expect(gapsQueuePath('/reports/segments-jtbd')).toBeNull()
    expect(gapsQueuePath('https://evil.example/reports/gaps')).toBeNull()
    expect(gapsQueuePath('/reports/gaps?x=\\evil')).toBeNull()
    expect(gapsQueuePath(undefined)).toBeNull()
  })
})
