import { describe, expect, it } from 'vitest'
import {
  CAPTURE_TYPES,
  captureTypeByValue,
  fullFormHref,
  type CaptureType,
} from '@/lib/quick-capture'

// The modal asks for the minimum; «Больше полей →» is the way out to
// everything it does not ask. The one thing that must never happen on that
// hand-off is losing the sentence somebody just typed.

describe('CAPTURE_TYPES', () => {
  it('offers only types whose required fields the modal actually asks for', () => {
    // Разговор (transcript), Исследование (type/status/date) and Продукт are
    // absent on purpose: a modal that skipped their required fields would
    // create half-records.
    expect(CAPTURE_TYPES.map((t) => t.value)).toEqual([
      'insight',
      'hypothesis',
      'segment',
      'jtbd',
      'feature',
      'rtb',
      'competitor',
    ])
  })

  it('asks for a category on JTBD and on nothing else', () => {
    // A JTBD saved with a placeholder category pollutes the coverage and gaps
    // reports, so it is the one type with a second required field.
    const withExtra = CAPTURE_TYPES.filter((t) => t.extraField)
    expect(withExtra.map((t) => t.value)).toEqual(['jtbd'])
  })

  it('names a distinct full form and text param for every type', () => {
    expect(new Set(CAPTURE_TYPES.map((t) => t.href)).size).toBe(CAPTURE_TYPES.length)
    for (const type of CAPTURE_TYPES) {
      expect(type.textParam, type.value).not.toBe('')
      expect(type.saved, type.value).not.toBe('')
    }
  })

  it('throws loudly on an unknown type rather than rendering a blank modal', () => {
    expect(() => captureTypeByValue('nope' as CaptureType)).toThrow(/nope/)
  })
})

describe('fullFormHref', () => {
  it('carries the typed text under the param the form reads', () => {
    expect(fullFormHref('insight', { productId: 'p1', text: 'Клиент ждёт неделю' })).toBe(
      '/insights/new?productId=p1&text=%D0%9A%D0%BB%D0%B8%D0%B5%D0%BD%D1%82+%D0%B6%D0%B4%D1%91%D1%82+%D0%BD%D0%B5%D0%B4%D0%B5%D0%BB%D1%8E'
    )
  })

  it('uses each type’s own field name', () => {
    expect(fullFormHref('hypothesis', { text: 'Если A, то B' })).toContain('statement=')
    expect(fullFormHref('segment', { text: 'Банки' })).toContain('name=')
    expect(fullFormHref('rtb', { text: 'Обещание' })).toContain('statement=')
  })

  it('carries the JTBD category too', () => {
    const href = fullFormHref('jtbd', { productId: 'p1', text: 'Задача', extra: 'Сроки' })
    expect(href).toContain('title=')
    expect(href).toContain('category=')
  })

  it('ignores an extra value for a type that has no extra field', () => {
    expect(fullFormHref('feature', { text: 'Фича', extra: 'мусор' })).not.toContain('category=')
  })

  it('omits empty and whitespace-only values instead of sending blanks', () => {
    expect(fullFormHref('insight', {})).toBe('/insights/new')
    expect(fullFormHref('insight', { text: '   ' })).toBe('/insights/new')
  })

  it('trims what it carries, matching what the modal would have saved', () => {
    expect(fullFormHref('segment', { text: '  Банки  ' })).toBe(
      '/segments/new?name=%D0%91%D0%B0%D0%BD%D0%BA%D0%B8'
    )
  })
})
