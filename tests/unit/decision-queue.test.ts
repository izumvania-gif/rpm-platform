import { HypothesisStatus, InsightStance } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { buildDecisionQueue, type DecisionInput } from '@/lib/decision-queue'

/** Гипотеза, у которой собрано всё: критерий, 3 инсайта, адресат, фича. */
function ready(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    id: 'h1',
    statement: 'Если выпускать удалённо, то банки согласятся на пилот',
    productName: 'Рутокен',
    status: HypothesisStatus.IN_REVIEW,
    validationCriterion: 'Три из пяти банков подтвердят готовность',
    stances: [InsightStance.SUPPORTS, InsightStance.SUPPORTS, InsightStance.CONTRADICTS],
    hasSegment: true,
    hasJtbd: true,
    featureCount: 1,
    ...overrides,
  }
}

describe('what gets into the queue', () => {
  it('takes a hypothesis that has everything', () => {
    expect(buildDecisionQueue([ready()]).map((i) => i.id)).toEqual(['h1'])
  })

  // Обещание очереди — «по каждой строке можно решить прямо сейчас».
  // Недобор по любому из условий это обещание ломает.
  it.each([
    ['без критерия', { validationCriterion: null }],
    ['без доказательств', { stances: [] }],
    ['с двумя доказательствами вместо трёх', { stances: [InsightStance.SUPPORTS, null] }],
    ['без сегмента', { hasSegment: false }],
    ['без задачи', { hasJtbd: false }],
    ['без фичи', { featureCount: 0 }],
  ])('leaves out a hypothesis %s', (_name, overrides) => {
    expect(buildDecisionQueue([ready(overrides as Partial<DecisionInput>)])).toEqual([])
  })

  // Решение уже принято — решать нечего.
  it.each([HypothesisStatus.CONFIRMED, HypothesisStatus.REJECTED])(
    'leaves out a %s hypothesis even when it has everything',
    (status) => {
      expect(buildDecisionQueue([ready({ status })])).toEqual([])
    }
  )

  it('takes both open statuses', () => {
    const queue = buildDecisionQueue([
      ready({ id: 'draft', status: HypothesisStatus.DRAFT }),
      ready({ id: 'review', status: HypothesisStatus.IN_REVIEW }),
    ])
    expect(queue.map((i) => i.id).sort()).toEqual(['draft', 'review'])
  })
})

describe('what a row says', () => {
  it('leads with the key phrase and keeps the original for the tooltip', () => {
    const [item] = buildDecisionQueue([ready()])
    // «Если X, то …» → «X»: очередь просматривают сверху вниз, а предсказания
    // у гипотез рифмуются.
    expect(item.label).toBe('Выпускать удалённо')
    expect(item.fullLabel).toBe('Если выпускать удалённо, то банки согласятся на пилот')
  })

  it('counts the sides, keeping the stance-less ones separate', () => {
    const [item] = buildDecisionQueue([
      ready({
        stances: [InsightStance.SUPPORTS, InsightStance.SUPPORTS, InsightStance.CONTRADICTS, null],
      }),
    ])
    expect(item.balance.supports).toBe(2)
    expect(item.balance.contradicts).toBe(1)
    expect(item.balance.neutral).toBe(1)
    // Доли считаются от высказавшихся, а не от всех.
    expect(item.balance.supportsPercent).toBe(67)
  })

  it('links straight at the hypothesis card', () => {
    expect(buildDecisionQueue([ready({ id: 'abc' })])[0].href).toBe('/hypotheses/abc')
  })
})

describe('order', () => {
  it('puts the best-evidenced first', () => {
    const queue = buildDecisionQueue([
      ready({ id: 'three', stances: Array(3).fill(InsightStance.SUPPORTS) }),
      ready({ id: 'seven', stances: Array(7).fill(InsightStance.SUPPORTS) }),
      ready({ id: 'five', stances: Array(5).fill(InsightStance.SUPPORTS) }),
    ])
    expect(queue.map((i) => i.id)).toEqual(['seven', 'five', 'three'])
  })

  it('is stable on a tie', () => {
    const queue = buildDecisionQueue([
      ready({ id: 'b', statement: 'Если бета, то результат' }),
      ready({ id: 'a', statement: 'Если альфа, то результат' }),
    ])
    expect(queue.map((i) => i.id)).toEqual(['a', 'b'])
  })
})
