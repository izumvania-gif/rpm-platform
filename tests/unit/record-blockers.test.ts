import { describe, expect, it } from 'vitest'
import { recordBlockers } from '@/lib/record-blockers'

const DAY = 24 * 60 * 60 * 1000

describe('segment', () => {
  it('names both gaps when the segment is bare', () => {
    const blockers = recordBlockers({
      kind: 'segment',
      id: 's1',
      productId: 'p1',
      jtbdCount: 0,
      conversationCount: 0,
    })
    expect(blockers.map((b) => b.key)).toEqual(['no-jtbd', 'no-conversations'])
  })

  it('says nothing when the segment has jobs and talks behind it', () => {
    expect(
      recordBlockers({
        kind: 'segment',
        id: 's1',
        productId: 'p1',
        jtbdCount: 2,
        conversationCount: 1,
      })
    ).toEqual([])
  })

  // Правило из чек-листа готовности: чинится на этой странице — якорь,
  // требует другой — ссылка. Секция задач живёт прямо на карточке сегмента.
  it('points the jobs gap at the section on this page', () => {
    const [jobs] = recordBlockers({
      kind: 'segment',
      id: 's1',
      productId: 'p1',
      jtbdCount: 0,
      conversationCount: 3,
    })
    expect(jobs.actionHref).toBe('#jtbds')
  })
})

describe('jtbd', () => {
  // Одно условие, а не два: «не отмечен подтверждённым» и «нет исследования» —
  // одна проблема с двух сторон, и двумя строками она читалась бы как две.
  it('says a job with no study is unconfirmed, once', () => {
    const blockers = recordBlockers({
      kind: 'jtbd',
      id: 'j1',
      productId: 'p1',
      confirmed: false,
      hasResearch: false,
    })
    expect(blockers).toHaveLength(1)
    expect(blockers[0].label).toBe('Не подтверждён исследованием')
  })

  it('changes the wording when the study is there but the flag is not', () => {
    const [blocker] = recordBlockers({
      kind: 'jtbd',
      id: 'j1',
      productId: 'p1',
      confirmed: false,
      hasResearch: true,
    })
    expect(blocker.key).toBe('unconfirmed')
    expect(blocker.label).toContain('не отмечена подтверждённой')
    expect(blocker.actionLabel).toBe('Отметить подтверждённой')
  })

  it('is silent on a confirmed job', () => {
    expect(
      recordBlockers({
        kind: 'jtbd',
        id: 'j1',
        productId: 'p1',
        confirmed: true,
        hasResearch: true,
      })
    ).toEqual([])
  })

  /**
   * Связи с сегментом, гипотезой и фичей показывает лента цепочки, и с фазы 7
   * чинит их прямо в слоте. Повторять их здесь — та же ошибка, что в фазе 3,
   * где чек-лист и блок «Что можно сделать» пересказывали друг друга.
   */
  it('does not repeat what the chain ribbon already shows', () => {
    const keys = recordBlockers({
      kind: 'jtbd',
      id: 'j1',
      productId: 'p1',
      confirmed: false,
      hasResearch: false,
    }).map((b) => b.key)
    expect(keys).not.toContain('no-segment')
    expect(keys).not.toContain('no-hypothesis')
    expect(keys).not.toContain('no-feature')
  })
})

describe('feature', () => {
  it('names the one link the ribbon does not carry', () => {
    const blockers = recordBlockers({
      kind: 'feature',
      id: 'f1',
      productId: 'p1',
      hypothesisCount: 0,
    })
    expect(blockers.map((b) => b.key)).toEqual(['no-hypothesis'])
    // Матрица «Фичи × Гипотезы» — там связь ставится одним кликом.
    expect(blockers[0].actionHref).toBe('/products/p1/links')
  })

  it('is silent once a hypothesis is attached', () => {
    expect(
      recordBlockers({ kind: 'feature', id: 'f1', productId: 'p1', hypothesisCount: 1 })
    ).toEqual([])
  })
})

describe('rtb', () => {
  it('calls a promise with no feature under it groundless', () => {
    const blockers = recordBlockers({ kind: 'rtb', id: 'r1', productId: 'p1', featureCount: 0 })
    expect(blockers.map((b) => b.key)).toEqual(['no-features'])
  })
})

describe('competitor', () => {
  const base = { kind: 'competitor', id: 'c1', productId: 'p1' } as const

  it('names all three gaps at once', () => {
    const blockers = recordBlockers({
      ...base,
      hasPositioning: false,
      featureCount: 0,
      lastCheckedAt: null,
    })
    expect(blockers.map((b) => b.key)).toEqual(['no-positioning', 'no-features', 'never-checked'])
  })

  // «Давно не проверяли» — неверное утверждение про конкурента, которого не
  // проверяли ни разу. Разные факты, разные слова.
  it('separates never-checked from stale', () => {
    const never = recordBlockers({
      ...base,
      hasPositioning: true,
      featureCount: 1,
      lastCheckedAt: null,
    })
    expect(never.map((b) => b.key)).toEqual(['never-checked'])

    const stale = recordBlockers({
      ...base,
      hasPositioning: true,
      featureCount: 1,
      lastCheckedAt: new Date(Date.now() - 200 * DAY),
    })
    expect(stale.map((b) => b.key)).toEqual(['stale'])
  })

  it('is silent on a competitor checked recently', () => {
    expect(
      recordBlockers({
        ...base,
        hasPositioning: true,
        featureCount: 2,
        lastCheckedAt: new Date(Date.now() - 3 * DAY),
      })
    ).toEqual([])
  })
})

describe('every blocker', () => {
  // Условие без действия — это жалоба, а не задача. Проверяем на всех
  // «худших» входах сразу.
  it('carries a label, a hint and somewhere to go', () => {
    const all = [
      ...recordBlockers({
        kind: 'segment',
        id: 's',
        productId: 'p',
        jtbdCount: 0,
        conversationCount: 0,
      }),
      ...recordBlockers({
        kind: 'jtbd',
        id: 'j',
        productId: 'p',
        confirmed: false,
        hasResearch: false,
      }),
      ...recordBlockers({ kind: 'feature', id: 'f', productId: 'p', hypothesisCount: 0 }),
      ...recordBlockers({ kind: 'rtb', id: 'r', productId: 'p', featureCount: 0 }),
      ...recordBlockers({
        kind: 'competitor',
        id: 'c',
        productId: 'p',
        hasPositioning: false,
        featureCount: 0,
        lastCheckedAt: null,
      }),
    ]
    expect(all.length).toBeGreaterThan(0)
    for (const blocker of all) {
      expect(blocker.label.trim()).not.toBe('')
      expect(blocker.hint.trim()).not.toBe('')
      expect(blocker.actionLabel.trim()).not.toBe('')
      expect(blocker.actionHref.trim()).not.toBe('')
    }
  })
})
