import { describe, expect, it } from 'vitest'
import { HypothesisStatus, InsightStance } from '@prisma/client'
import {
  MIN_EVIDENCE,
  evidenceBalance,
  hypothesisReadiness,
  unmetConditions,
  type ReadinessInput,
} from '@/lib/hypothesis-readiness'

function input(over: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    status: HypothesisStatus.IN_REVIEW,
    validationCriterion: 'Не менее 3 из 5 банков называют это обязательным',
    insightCount: 3,
    hasSegment: true,
    hasJtbd: true,
    featureCount: 1,
    ...over,
  }
}

const byKey = (r: ReturnType<typeof hypothesisReadiness>, key: string) =>
  r.conditions.find((c) => c.key === key)!

describe('hypothesisReadiness', () => {
  it('counts a fully wired hypothesis as ready', () => {
    const r = hypothesisReadiness(input())
    expect(r).toMatchObject({ met: 4, total: 4, ready: true })
  })

  // Это тот самый инвариант, ради которого модуль вынесен отдельно: экран не
  // должен одновременно говорить «готова к решению» и «решать нечего».
  it('never gives a full score with zero evidence', () => {
    const r = hypothesisReadiness(input({ insightCount: 0 }))
    expect(r.ready).toBe(false)
    expect(byKey(r, 'evidence').met).toBe(false)
    expect(byKey(r, 'evidence').hint).toBe('Ни один инсайт не привязан к этой гипотезе')
  })

  it('is not satisfied one insight short of the minimum', () => {
    const r = hypothesisReadiness(input({ insightCount: MIN_EVIDENCE - 1 }))
    expect(byKey(r, 'evidence').met).toBe(false)
    expect(byKey(r, 'evidence').hint).toContain('нужно ещё 1')
  })

  it('treats an empty or whitespace criterion as absent', () => {
    expect(byKey(hypothesisReadiness(input({ validationCriterion: null })), 'criterion').met).toBe(
      false
    )
    expect(byKey(hypothesisReadiness(input({ validationCriterion: '   ' })), 'criterion').met).toBe(
      false
    )
  })

  it('needs both a segment and a job, and says which one is missing', () => {
    expect(byKey(hypothesisReadiness(input({ hasSegment: false })), 'addressee').hint).toBe(
      'Не указано, для какого сегмента это проверяется'
    )
    expect(byKey(hypothesisReadiness(input({ hasJtbd: false })), 'addressee').hint).toBe(
      'Не указано, какую задачу клиента это закрывает'
    )
    expect(
      byKey(hypothesisReadiness(input({ hasSegment: false, hasJtbd: false })), 'addressee').hint
    ).toBe('Непонятно, для кого и про какую задачу эта гипотеза')
  })

  // Проверенное «нет» — законный результат исследования, а не недоделка.
  it('does not demand a feature from a rejected hypothesis', () => {
    const r = hypothesisReadiness(input({ status: HypothesisStatus.REJECTED, featureCount: 0 }))
    expect(byKey(r, 'feature').applicable).toBe(false)
    expect(r.total).toBe(3)
    expect(r.ready).toBe(true)
  })

  it('still demands a feature from a confirmed one', () => {
    const r = hypothesisReadiness(input({ status: HypothesisStatus.CONFIRMED, featureCount: 0 }))
    expect(byKey(r, 'feature').applicable).toBe(true)
    expect(r).toMatchObject({ met: 3, total: 4, ready: false })
  })

  it('lists only the unmet applicable conditions, in order', () => {
    const r = hypothesisReadiness(
      input({ validationCriterion: null, insightCount: 0, featureCount: 0 })
    )
    expect(unmetConditions(r).map((c) => c.key)).toEqual(['criterion', 'evidence', 'feature'])
  })

  it('offers nothing to do once everything is met', () => {
    expect(unmetConditions(hypothesisReadiness(input()))).toEqual([])
  })
})

describe('evidenceBalance', () => {
  const S = InsightStance.SUPPORTS
  const C = InsightStance.CONTRADICTS

  it('counts each side and the abstainers separately', () => {
    expect(evidenceBalance([S, S, S, C, null])).toMatchObject({
      supports: 3,
      contradicts: 1,
      neutral: 1,
      total: 5,
    })
  })

  // Нейтральные не растворяются в долях: приписать им сторону значило бы
  // придумать мнение, которого никто не высказывал.
  it('computes percentages from those who took a side, not from everyone', () => {
    const b = evidenceBalance([S, S, S, C, null, null, null])
    expect(b.supportsPercent).toBe(75)
    expect(b.contradictsPercent).toBe(25)
  })

  it('returns zero shares rather than 50/50 when nobody took a side', () => {
    expect(evidenceBalance([null, null])).toMatchObject({
      supportsPercent: 0,
      contradictsPercent: 0,
      neutral: 2,
      total: 2,
    })
  })

  it('handles no evidence at all', () => {
    expect(evidenceBalance([])).toMatchObject({
      supports: 0,
      contradicts: 0,
      neutral: 0,
      total: 0,
      supportsPercent: 0,
      contradictsPercent: 0,
    })
  })

  it('always has the two shares add up to 100 when anyone voted', () => {
    // Округление обеих долей по отдельности дало бы 101 % на, например, 1 из 3.
    for (const [s, c] of [
      [1, 2],
      [2, 1],
      [1, 1],
      [5, 0],
      [0, 4],
      [1, 6],
    ]) {
      const b = evidenceBalance([
        ...Array<InsightStance>(s).fill(S),
        ...Array<InsightStance>(c).fill(C),
      ])
      expect(b.supportsPercent + b.contradictsPercent).toBe(100)
    }
  })
})
