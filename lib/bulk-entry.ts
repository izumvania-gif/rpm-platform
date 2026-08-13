// Pure helpers for bulk paste-many entry (plans/2.0-product-leap-plan.md, A1).
//
// Split out of lib/actions/bulk.ts because a 'use server' module may only
// export async functions — a plain object or a sync helper there fails the
// build. Keeping them here also puts the parser in reach of the unit test
// layer, which covers lib/ pure functions without a database.

export type BulkEntity = 'segment' | 'insight' | 'hypothesis' | 'feature' | 'competitor'

export const bulkEntityLabels: Record<BulkEntity, string> = {
  segment: 'Сегменты',
  insight: 'Инсайты',
  hypothesis: 'Гипотезы',
  feature: 'Фичи',
  competitor: 'Конкуренты',
}

export const bulkEntityPlaceholders: Record<BulkEntity, string> = {
  segment: 'Банки топ-30\nГосзаказчики\nСМБ-интеграторы',
  insight: 'Клиенты не готовы ждать неделю выпуска\nРешение принимает ИБ, а не ИТ',
  hypothesis: 'Если убрать визит в офис, онбординг сократится вдвое',
  feature: 'Удалённый выпуск сертификата\nМассовый отзыв доступов',
  competitor: 'КриптоПро\nАладдин Р.Д.',
}

export const MAX_BULK_LINES = 200

/**
 * Splits pasted text into trimmed, de-duplicated, non-empty lines.
 * Tolerates the list markup people paste out of documents ("- x", "* x",
 * "1. x") so a copied bullet list does not arrive with its bullets baked
 * into the record names.
 */
export function parseBulkLines(raw: string): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const line of raw.split('\n')) {
    const cleaned = line.replace(/^\s*(?:[-*•—]|\d+[.)])\s*/, '').trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(cleaned)
  }
  return lines
}
