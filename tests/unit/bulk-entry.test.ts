import { describe, expect, it } from 'vitest'
import { parseBulkLines } from '@/lib/bulk-entry'

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
