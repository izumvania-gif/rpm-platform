// Pure helpers for bulk paste-many entry (plans/2.0-product-leap-plan.md, A1).
//
// Split out of lib/actions/bulk.ts because a 'use server' module may only
// export async functions — a plain object or a sync helper there fails the
// build. Keeping them here also puts the parser in reach of the unit test
// layer, which covers lib/ pure functions without a database.

export type BulkEntity =
  'segment' | 'jtbd' | 'insight' | 'hypothesis' | 'feature' | 'rtb' | 'competitor'

/** Select order — the discovery chain's own order, not alphabetical. */
export const BULK_ENTITIES: BulkEntity[] = [
  'segment',
  'jtbd',
  'insight',
  'hypothesis',
  'feature',
  'rtb',
  'competitor',
]

export const bulkEntityLabels: Record<BulkEntity, string> = {
  segment: 'Сегменты',
  jtbd: 'JTBD',
  insight: 'Инсайты',
  hypothesis: 'Гипотезы',
  feature: 'Фичи',
  rtb: 'RTB',
  competitor: 'Конкуренты',
}

export const bulkEntityPlaceholders: Record<BulkEntity, string> = {
  segment: 'Банки топ-30\nГосзаказчики\nСМБ-интеграторы',
  jtbd:
    'Когда истекает сертификат, я хочу продлить его сам, чтобы не ехать в офис\n' +
    'Когда приходит новый сотрудник, я хочу выдать ему доступ за час',
  insight: 'Клиенты не готовы ждать неделю выпуска\nРешение принимает ИБ, а не ИТ',
  hypothesis: 'Если убрать визит в офис, онбординг сократится вдвое',
  feature: 'Удалённый выпуск сертификата\nМассовый отзыв доступов',
  rtb: 'Выпуск сертификата за 15 минут без визита в офис',
  competitor: 'КриптоПро\nАладдин Р.Д.',
}

/**
 * A second field the whole paste shares, for the one entity whose required
 * shape is more than a single string.
 *
 * JTBD needs a category, and a bulk paste that invented one would poison the
 * coverage and gaps reports the category exists to feed. Asking once for the
 * whole batch is honest and matches how the list is written in the first
 * place: a PM pastes six jobs *of one category*, not six unrelated ones.
 * `jobType` is left at the schema's own SMALL_JOB default — same call the
 * quick-capture modal already makes, and the one field the graph lets you fix
 * by dragging rather than by editing.
 */
export const bulkEntityExtra: Partial<
  Record<BulkEntity, { key: string; label: string; placeholder: string }>
> = {
  jtbd: { key: 'category', label: 'Категория', placeholder: 'Например: Выпуск и продление' },
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
