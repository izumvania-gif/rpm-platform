import { describe, expect, it } from 'vitest'
import {
  CHAIN_GAPS,
  chainGapByKind,
  chainGapFullFormHref,
  chainGapItemHref,
  type ChainGapKind,
} from '@/lib/chain-gap'

describe('the table of fillable gaps', () => {
  // Это и есть главное утверждение модуля: пикер получают ЭТИ слоты и никакие
  // другие. Тест написан списком, а не длиной, чтобы новый разрыв нельзя было
  // добавить молча — он потребует правки здесь, то есть решения.
  it('lists exactly the one-step gaps', () => {
    expect(CHAIN_GAPS.map((gap) => gap.kind).sort()).toEqual(
      [
        'feature-jtbd',
        'feature-rtb',
        'hypothesis-feature',
        'hypothesis-jtbd',
        'hypothesis-segment',
        'jtbd-feature',
        'jtbd-hypothesis',
        'jtbd-segment',
      ].sort()
    )
  })

  /**
   * Разрывы через два звена сюда попадать не должны. Кнопка «связать»
   * обещает, что после клика разрыва не будет, а до RTB с карточки JTBD одним
   * действием не дойти: обещание крепится к фиче, и «привязать» пришлось бы к
   * какой-то фиче на выбор системы — то есть придумать за пользователя.
   */
  it('leaves the two-step gaps out', () => {
    const kinds = CHAIN_GAPS.map((gap) => gap.kind as string)
    expect(kinds).not.toContain('jtbd-rtb')
    expect(kinds).not.toContain('hypothesis-rtb')
    expect(kinds).not.toContain('feature-segment')
  })

  it('names every kind «чья карточка — что ставим»', () => {
    for (const gap of CHAIN_GAPS) {
      expect(gap.kind).toBe(`${gap.anchor}-${gap.target}`)
    }
  })

  it('gives every gap its own wording', () => {
    for (const gap of CHAIN_GAPS) {
      expect(gap.pickLabel.trim()).not.toBe('')
      expect(gap.selectLabel.trim()).not.toBe('')
      expect(gap.emptyCandidates.trim()).not.toBe('')
    }
    // Доступное имя кнопки в слоте — единственное, что отличает два пикера на
    // одном экране друг от друга: у карточки гипотезы их три подряд.
    const labels = CHAIN_GAPS.map((gap) => `${gap.anchor}:${gap.selectLabel}`)
    expect(new Set(labels).size).toBe(CHAIN_GAPS.length)
  })
})

describe('chainGapByKind', () => {
  it('finds a gap', () => {
    expect(chainGapByKind('feature-rtb').target).toBe('rtb')
  })

  it('throws rather than returning nothing', () => {
    // Молчаливый undefined выглядел бы как «связывать не с чем», а это
    // неотличимо от пустого продукта.
    expect(() => chainGapByKind('jtbd-rtb' as ChainGapKind)).toThrow(/Unknown chain gap kind/)
  })
})

describe('routes', () => {
  it('sends обещания to /marketing, not /rtb', () => {
    expect(chainGapItemHref('rtb', 'abc')).toBe('/marketing/abc')
    expect(chainGapFullFormHref('rtb', 'p1')).toBe('/marketing/new?productId=p1')
  })

  it('carries the product into the full form', () => {
    expect(chainGapFullFormHref('segment', 'p1')).toBe('/segments/new?productId=p1')
    expect(chainGapItemHref('jtbd', 'j1')).toBe('/jtbd/j1')
  })
})
