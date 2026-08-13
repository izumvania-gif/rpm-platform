import { describe, expect, it } from 'vitest'
import { buildGapTasks, totalGapTasks, type GapTasksInput } from '@/lib/gap-tasks'

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

  it('offers a one-click move only for a stuck hypothesis', () => {
    const groups = buildGapTasks(
      input({
        stuckHypotheses: [{ id: 'h1', statement: 'Гипотеза', product }],
        unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }],
        segmentsWithoutJtbd: [{ id: 's1', name: 'Банки', product }],
      })
    )
    const quick = groups.flatMap((g) => g.tasks).filter((t) => t.quickAction)
    expect(quick).toHaveLength(1)
    expect(quick[0].kind).toBe('stuck-hypothesis')
    expect(quick[0].quickAction).toBe('hypothesis-to-review')
  })

  it('never offers a one-click confirm for an unconfirmed JTBD', () => {
    // Confirming claims research backing; a button here would let the queue
    // rubber-stamp the metric it exists to measure.
    const [group] = buildGapTasks(
      input({ unconfirmedJtbds: [{ id: 'j1', title: 'JTBD', product }] })
    )
    expect(group.tasks[0].quickAction).toBeUndefined()
    expect(group.tasks[0].href).toBe('/jtbd/j1')
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

  it('carries the record title and its product through', () => {
    const [group] = buildGapTasks(
      input({ stuckHypotheses: [{ id: 'h1', statement: 'Если A, то B', product }] })
    )
    expect(group.tasks[0].title).toBe('Если A, то B')
    expect(group.tasks[0].productName).toBe('Продукт А')
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
