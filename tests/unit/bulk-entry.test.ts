import { describe, expect, it } from 'vitest'
import {
  BULK_ENTITIES,
  bulkEntityExtra,
  bulkEntityLabels,
  bulkEntityPlaceholders,
  parseBulkLines,
} from '@/lib/bulk-entry'

describe('parseBulkLines', () => {
  it('splits on newlines and trims', () => {
    expect(parseBulkLines('Банки\n  Госзаказчики  \nСМБ')).toEqual(['Банки', 'Госзаказчики', 'СМБ'])
  })

  it('drops blank lines, including a trailing newline', () => {
    expect(parseBulkLines('A\n\n\nB\n')).toEqual(['A', 'B'])
  })

  it('strips list markup pasted out of documents', () => {
    expect(parseBulkLines('- Банки\n* Госзаказчики\n1. СМБ\n2) Интеграторы\n• Партнёры')).toEqual([
      'Банки',
      'Госзаказчики',
      'СМБ',
      'Интеграторы',
      'Партнёры',
    ])
  })

  it('de-duplicates case-insensitively, keeping the first spelling', () => {
    expect(parseBulkLines('Банки\nбанки\nБАНКИ\nГосзаказчики')).toEqual(['Банки', 'Госзаказчики'])
  })

  it('returns an empty list for whitespace-only input', () => {
    expect(parseBulkLines('   \n\n  \n')).toEqual([])
  })

  it('does not mistake a hyphenated word for list markup', () => {
    expect(parseBulkLines('Банки топ-30')).toEqual(['Банки топ-30'])
  })
})

describe('BULK_ENTITIES', () => {
  it('names every entity the panel can offer, in discovery-chain order', () => {
    expect(BULK_ENTITIES).toEqual([
      'segment',
      'jtbd',
      'insight',
      'hypothesis',
      'feature',
      'rtb',
      'competitor',
    ])
  })

  it('has a label and a placeholder for each', () => {
    for (const entity of BULK_ENTITIES) {
      expect(bulkEntityLabels[entity], entity).toBeTruthy()
      expect(bulkEntityPlaceholders[entity], entity).toBeTruthy()
    }
  })

  it('asks for a second field on JTBD and on nothing else', () => {
    // Category is required by the model, and a batch that invented one would
    // poison the coverage and gaps reports. Every other entity here is a
    // single string plus a product, which is why it can be pasted at all.
    expect(Object.keys(bulkEntityExtra)).toEqual(['jtbd'])
    expect(bulkEntityExtra.jtbd?.key).toBe('category')
  })
})
