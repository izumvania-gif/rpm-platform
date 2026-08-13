import { describe, expect, it } from 'vitest'
import { classifyLine, parseInbox, summarize } from '@/lib/inbox'

describe('classifyLine', () => {
  it('reads a quoted line as a customer insight', () => {
    expect(classifyLine('«Мы не можем ждать неделю выпуска сертификата»').type).toBe('insight')
    expect(classifyLine('"Решение принимает ИБ, а не ИТ"').type).toBe('insight')
  })

  it('recognises the «Если …, то …» hypothesis shape the app itself teaches', () => {
    expect(classifyLine('Если убрать визит в офис, то онбординг сократится вдвое').type).toBe(
      'hypothesis'
    )
  })

  it('recognises other assumption wording', () => {
    expect(classifyLine('Предполагаем, что интеграторы выберут по скорости').type).toBe(
      'hypothesis'
    )
    expect(classifyLine('Проверить, что госзаказчики требуют сертификат').type).toBe('hypothesis')
  })

  it('spots a competitor mention', () => {
    expect(classifyLine('Основной конкурент — КриптоПро').type).toBe('competitor')
  })

  it('spots a feature request', () => {
    expect(classifyLine('Нужна возможность массового отзыва доступов').type).toBe('feature')
    expect(classifyLine('Система должна уметь выпускать сертификат удалённо').type).toBe('feature')
  })

  it('treats a short unpunctuated noun phrase as a segment', () => {
    expect(classifyLine('Банки топ-30').type).toBe('segment')
    expect(classifyLine('Госзаказчики').type).toBe('segment')
  })

  it('does not call a short sentence a segment', () => {
    // Ends with a full stop -> reads as a statement, not a name.
    expect(classifyLine('Клиенты уходят.').type).toBe('insight')
  })

  it('falls back to insight for ordinary prose', () => {
    const result = classifyLine('Решение о закупке принимает служба информационной безопасности')
    expect(result.type).toBe('insight')
    expect(result.reason).toBe('по умолчанию')
  })

  it('reports a reason for every guess so the UI can explain itself', () => {
    expect(classifyLine('«цитата клиента здесь»').reason).toBe('прямая речь')
    expect(classifyLine('Банки топ-30').reason).toBe('короткая именная группа')
  })

  it('prefers the quote rule over the hypothesis rule when both could match', () => {
    // Order matters: a quoted sentence that happens to contain "если … то"
    // is still something the customer said.
    expect(classifyLine('«Если мы уберём визит, то сэкономим неделю»').type).toBe('insight')
  })
})

describe('parseInbox', () => {
  it('splits a mixed paste and types each line independently', () => {
    const items = parseInbox(
      [
        'Банки топ-30',
        '«Мы не можем ждать неделю»',
        'Если убрать визит в офис, то онбординг ускорится',
        'Нужна возможность массового отзыва',
        'Основной конкурент — КриптоПро',
      ].join('\n')
    )
    expect(items.map((i) => i.type)).toEqual([
      'segment',
      'insight',
      'hypothesis',
      'feature',
      'competitor',
    ])
    expect(items.every((i) => i.include)).toBe(true)
  })

  it('reuses the bulk parser: strips list markup, drops blanks and duplicates', () => {
    const items = parseInbox('- Банки\n\n* Банки\n1. Госзаказчики\n')
    expect(items.map((i) => i.text)).toEqual(['Банки', 'Госзаказчики'])
  })

  it('gives every item a stable id', () => {
    const items = parseInbox('A\nB')
    expect(new Set(items.map((i) => i.id)).size).toBe(2)
  })

  it('returns nothing for an empty paste', () => {
    expect(parseInbox('   \n\n')).toEqual([])
  })
})

describe('summarize', () => {
  it('counts included items per type in display order', () => {
    const items = parseInbox('Банки топ-30\nГосзаказчики\n«цитата клиента тут»')
    expect(summarize(items)).toEqual([
      { type: 'segment', count: 2 },
      { type: 'insight', count: 1 },
    ])
  })

  it('ignores excluded and blank items', () => {
    const items = parseInbox('Банки топ-30\nГосзаказчики')
    items[0].include = false
    expect(summarize(items)).toEqual([{ type: 'segment', count: 1 }])
  })

  it('is empty when nothing is included', () => {
    const items = parseInbox('Банки')
    items[0].include = false
    expect(summarize(items)).toEqual([])
  })
})
