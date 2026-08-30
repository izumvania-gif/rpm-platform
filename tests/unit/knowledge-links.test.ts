import { describe, expect, it } from 'vitest'
import { conversationLinkBadge, insightLinkBadge, researchLinkBadge } from '@/lib/knowledge-links'

describe('research', () => {
  it('calls out a study nothing leans on', () => {
    const badge = researchLinkBadge({ jtbds: 0, hypotheses: 0, conversations: 0, insights: 0 })
    expect(badge.isGap).toBe(true)
    expect(badge.label).toBe('ни на что не опирается')
  })

  it('counts everything that can reference it, as one number', () => {
    const badge = researchLinkBadge({ jtbds: 2, hypotheses: 1, conversations: 3, insights: 5 })
    expect(badge.isGap).toBe(false)
    expect(badge.label).toBe('11 записей')
  })

  // Строка узкая, поэтому в ней число, а разбивка — в подсказке. Нули в
  // подсказку не идут: «гипотез: 0» это не факт о связях, это шум.
  it('breaks the number down in the tooltip, skipping the zeroes', () => {
    const badge = researchLinkBadge({ jtbds: 2, hypotheses: 0, conversations: 1, insights: 0 })
    expect(badge.title).toBe('JTBD: 2 · разговоров: 1')
  })

  it('pluralises in Russian', () => {
    expect(
      researchLinkBadge({ jtbds: 1, hypotheses: 0, conversations: 0, insights: 0 }).label
    ).toBe('1 запись')
    expect(
      researchLinkBadge({ jtbds: 3, hypotheses: 0, conversations: 0, insights: 0 }).label
    ).toBe('3 записи')
    // Исключение 11–14.
    expect(
      researchLinkBadge({ jtbds: 11, hypotheses: 0, conversations: 0, insights: 0 }).label
    ).toBe('11 записей')
  })
})

describe('conversation', () => {
  // Существующее правило внимания со страницы продукта, вынесенное в строку:
  // транскрипт, из которого ничего не извлекли.
  it('calls out a transcript nothing was taken from', () => {
    const badge = conversationLinkBadge(0)
    expect(badge.isGap).toBe(true)
    expect(badge.label).toBe('инсайты не извлечены')
  })

  it('counts the insights taken from it', () => {
    expect(conversationLinkBadge(1)).toMatchObject({ isGap: false, label: '1 инсайт' })
    expect(conversationLinkBadge(4)).toMatchObject({ isGap: false, label: '4 инсайта' })
  })
})

describe('insight', () => {
  const none = {
    segment: false,
    jtbd: false,
    research: false,
    conversation: false,
    hypothesis: false,
  }

  it('calls out an insight attached to nothing', () => {
    const badge = insightLinkBadge(none)
    expect(badge.isGap).toBe(true)
    expect(badge.label).toBe('ни к чему не привязан')
  })

  // Имена связей, а не их число: у инсайта каждая связь одна, и «3 связи»
  // сказало бы меньше, чем перечисление.
  it('names what it is attached to, in chain order', () => {
    const badge = insightLinkBadge({ ...none, segment: true, jtbd: true, hypothesis: true })
    expect(badge.isGap).toBe(false)
    expect(badge.label).toBe('Сегмент · JTBD · Гипотеза')
  })

  it('is not a gap on a single link', () => {
    expect(insightLinkBadge({ ...none, conversation: true })).toMatchObject({
      isGap: false,
      label: 'Разговор',
    })
  })
})

describe('every badge', () => {
  // Подсказка объясняет, почему это важно; пустой title оставил бы разрыв без
  // объяснения ровно там, где оно нужнее всего.
  it('always carries a label and a tooltip', () => {
    const all = [
      researchLinkBadge({ jtbds: 0, hypotheses: 0, conversations: 0, insights: 0 }),
      researchLinkBadge({ jtbds: 1, hypotheses: 0, conversations: 0, insights: 0 }),
      conversationLinkBadge(0),
      conversationLinkBadge(2),
      insightLinkBadge({
        segment: false,
        jtbd: false,
        research: false,
        conversation: false,
        hypothesis: false,
      }),
      insightLinkBadge({
        segment: true,
        jtbd: false,
        research: false,
        conversation: false,
        hypothesis: false,
      }),
    ]
    for (const badge of all) {
      expect(badge.label.trim()).not.toBe('')
      expect(badge.title.trim()).not.toBe('')
    }
  })
})
