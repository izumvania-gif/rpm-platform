import { describe, expect, it } from 'vitest'
import {
  applyMapping,
  autoMapColumns,
  detectSeparator,
  importFields,
  parseCsv,
} from '@/lib/csv-import'

describe('parseCsv', () => {
  it('parses a simple comma file', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('keeps separators that live inside quotes', () => {
    expect(parseCsv('name,note\n"Банки, топ-30",важно')).toEqual([
      ['name', 'note'],
      ['Банки, топ-30', 'важно'],
    ])
  })

  it('unescapes doubled quotes', () => {
    expect(parseCsv('quote\n"Он сказал ""нет"""')).toEqual([['quote'], ['Он сказал "нет"']])
  })

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']])
  })

  it('handles CRLF and a trailing newline', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('strips a UTF-8 BOM so the first header stays clean', () => {
    expect(parseCsv('﻿name,url\nx,y')[0]).toEqual(['name', 'url'])
  })

  it('drops fully blank rows', () => {
    expect(parseCsv('a\n\n\nb')).toEqual([['a'], ['b']])
  })

  it('supports a semicolon separator', () => {
    expect(parseCsv('a;b\n1;2', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('detectSeparator', () => {
  it('detects comma, semicolon and tab', () => {
    expect(detectSeparator('a,b,c\n1,2,3')).toBe(',')
    expect(detectSeparator('a;b;c\n1;2;3')).toBe(';')
    expect(detectSeparator('a\tb\tc')).toBe('\t')
  })

  it('falls back to comma for a single column', () => {
    expect(detectSeparator('name\nБанки')).toBe(',')
  })

  it('ignores a BOM when sniffing the header', () => {
    expect(detectSeparator('﻿a;b')).toBe(';')
  })
})

describe('autoMapColumns', () => {
  it('maps this app’s own export headers back onto fields', () => {
    expect(autoMapColumns(['name', 'url', 'positioning'], 'competitor')).toEqual([
      'name',
      'url',
      'positioning',
    ])
  })

  it('maps russian headers and field labels', () => {
    expect(autoMapColumns(['Название', 'Описание'], 'segment')).toEqual(['name', 'description'])
  })

  it('leaves unknown columns unmapped', () => {
    expect(autoMapColumns(['name', 'внутренний id'], 'segment')).toEqual(['name', ''])
  })

  it('does not map the same field twice', () => {
    expect(autoMapColumns(['name', 'название'], 'segment')).toEqual(['name', ''])
  })
})

describe('applyMapping', () => {
  it('builds records from mapped columns', () => {
    const { rows, skipped } = applyMapping(
      [
        ['Банки', 'https://a.example'],
        ['Госзаказчики', ''],
      ],
      ['name', 'url'],
      'competitor'
    )
    expect(skipped).toBe(0)
    expect(rows).toEqual([
      { values: { name: 'Банки', url: 'https://a.example' } },
      { values: { name: 'Госзаказчики' } },
    ])
  })

  it('skips rows whose required field is blank, and counts them', () => {
    const { rows, skipped } = applyMapping([['Банки'], ['  '], ['СМБ']], ['name'], 'segment')
    expect(rows).toHaveLength(2)
    expect(skipped).toBe(1)
  })

  it('ignores columns mapped to skip', () => {
    const { rows } = applyMapping([['Банки', 'мусор']], ['name', ''], 'segment')
    expect(rows[0].values).toEqual({ name: 'Банки' })
  })
})

describe('importFields for the entities added alongside bulk paste', () => {
  it('requires both of a JTBD’s mandatory columns', () => {
    // Unlike the paste panel, a CSV has room for a per-row category — a
    // spreadsheet of jobs already has that column.
    const required = importFields.jtbd.filter((f) => f.required).map((f) => f.key)
    expect(required).toEqual(['title', 'category'])
  })

  it('maps the headers this app’s own JTBD export writes', () => {
    // jtbd.csv exports category,jobType,title,product,confirmed,tags — the
    // round trip has to work without touching a single select.
    const headers = ['category', 'jobType', 'title', 'product', 'confirmed', 'tags']
    expect(autoMapColumns(headers, 'jtbd')).toEqual(['category', '', 'title', '', '', 'tags'])
  })

  it('drops a JTBD row that has a title but no category', () => {
    const { rows, skipped } = applyMapping(
      [['Продлить сертификат', '']],
      ['title', 'category'],
      'jtbd'
    )
    expect(rows).toHaveLength(0)
    expect(skipped).toBe(1)
  })

  it('maps an RTB export, whose only required column is the statement', () => {
    expect(autoMapColumns(['statement', 'product', 'features'], 'rtb')).toEqual([
      'statement',
      '',
      '',
    ])
  })
})
