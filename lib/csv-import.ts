// CSV import (plans/2.0-product-leap-plan.md, A2) — the missing half of the
// CsvExportButton loop. Pure parsing + column mapping so it can be unit
// tested without a database; the write itself lives in lib/actions/import.ts.
//
// A PM's competitor list, segment list and feature inventory all exist in a
// spreadsheet before this product does. Until now data could only leave.

import type { BulkEntity } from '@/lib/bulk-entry'

/**
 * Minimal RFC4180-ish parser. Handles quoted fields, separators and newlines
 * inside quotes, and doubled quotes as an escape — i.e. exactly what Excel
 * and Google Sheets emit, which is what people actually paste here.
 */
export function parseCsv(raw: string, separator = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  // Strip a UTF-8 BOM; Excel writes one and it would otherwise become part
  // of the first header name, breaking auto-mapping.
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === separator) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  // Trailing field/row unless the input ended exactly on a newline.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop rows that are entirely empty (a trailing newline, a blank line).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** Guesses the separator: Excel in a ru locale often writes semicolons. */
export function detectSeparator(raw: string): ',' | ';' | '\t' {
  const firstLine = raw.replace(/^﻿/, '').split(/\r?\n/)[0] ?? ''
  const counts = {
    ',': (firstLine.match(/,/g) ?? []).length,
    ';': (firstLine.match(/;/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
  }
  const best = (Object.entries(counts) as [',' | ';' | '\t', number][]).sort(
    (a, b) => b[1] - a[1]
  )[0]
  return best[1] > 0 ? best[0] : ','
}

/** Fields a CSV column can be mapped onto, per entity. */
export interface ImportField {
  key: string
  label: string
  required?: boolean
  /** Comma/semicolon separated in one cell -> string[] */
  list?: boolean
  numeric?: boolean
}

export const importFields: Record<BulkEntity, ImportField[]> = {
  segment: [
    { key: 'name', label: 'Название', required: true },
    { key: 'description', label: 'Описание' },
    { key: 'audienceShare', label: 'Доля аудитории, %', numeric: true },
    { key: 'tags', label: 'Теги', list: true },
  ],
  insight: [
    { key: 'text', label: 'Текст', required: true },
    { key: 'tags', label: 'Теги', list: true },
  ],
  hypothesis: [
    { key: 'statement', label: 'Формулировка', required: true },
    { key: 'priority', label: 'Приоритет', numeric: true },
    { key: 'tags', label: 'Теги', list: true },
  ],
  feature: [
    { key: 'name', label: 'Название', required: true },
    { key: 'description', label: 'Описание' },
  ],
  competitor: [
    { key: 'name', label: 'Название', required: true },
    { key: 'url', label: 'Сайт' },
    { key: 'positioning', label: 'Позиционирование' },
    { key: 'pricingModel', label: 'Модель цены' },
    { key: 'companySize', label: 'Размер компании' },
  ],
}

/** Header aliases so a file exported by this app re-imports without mapping. */
const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  название: 'name',
  наименование: 'name',
  text: 'text',
  текст: 'text',
  цитата: 'text',
  statement: 'statement',
  формулировка: 'statement',
  гипотеза: 'statement',
  description: 'description',
  описание: 'description',
  url: 'url',
  сайт: 'url',
  ссылка: 'url',
  positioning: 'positioning',
  позиционирование: 'positioning',
  tags: 'tags',
  теги: 'tags',
  audienceshare: 'audienceShare',
  доля: 'audienceShare',
  priority: 'priority',
  приоритет: 'priority',
  pricingmodel: 'pricingModel',
  companysize: 'companySize',
}

/**
 * Maps each CSV column index to a field key (or '' for "skip"), by matching
 * the header row against field keys, labels and known aliases. Returned as an
 * array parallel to the header row so the UI can render one select per column.
 */
export function autoMapColumns(headers: string[], entity: BulkEntity): string[] {
  const fields = importFields[entity]
  const used = new Set<string>()
  return headers.map((header) => {
    const norm = header.trim().toLowerCase()
    const direct = fields.find(
      (f) => f.key.toLowerCase() === norm || f.label.toLowerCase() === norm
    )
    const aliased = HEADER_ALIASES[norm]
    const key = direct?.key ?? (fields.some((f) => f.key === aliased) ? aliased : undefined)
    if (key && !used.has(key)) {
      used.add(key)
      return key
    }
    return ''
  })
}

export interface MappedRow {
  values: Record<string, string>
}

/**
 * Applies a column mapping to data rows. Rows whose required field is blank
 * are reported separately rather than silently dropped — a spreadsheet with
 * a stray blank in column A should say so, not quietly import fewer records.
 */
export function applyMapping(
  dataRows: string[][],
  mapping: string[],
  entity: BulkEntity
): { rows: MappedRow[]; skipped: number } {
  const required = importFields[entity].filter((f) => f.required).map((f) => f.key)
  const rows: MappedRow[] = []
  let skipped = 0

  for (const cells of dataRows) {
    const values: Record<string, string> = {}
    mapping.forEach((key, index) => {
      if (!key) return
      const cell = (cells[index] ?? '').trim()
      if (cell) values[key] = cell
    })
    if (required.some((key) => !values[key])) {
      skipped++
      continue
    }
    rows.push({ values })
  }
  return { rows, skipped }
}
