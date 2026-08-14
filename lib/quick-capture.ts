// What the quick-capture modal can create, and on what terms.
//
// Deliberately a plain module, not part of the client component: the product
// page is a Server Component and needs the same table to decide whether its
// «+» opens the modal or navigates to the full form. Exporting data from a
// 'use client' file for a server page to read crashes at runtime — Next treats
// every export from a client-boundary file as an opaque client reference.

export type CaptureType =
  'insight' | 'hypothesis' | 'segment' | 'jtbd' | 'feature' | 'rtb' | 'competitor'

/**
 * Optional preset carried by the open event. A bare `c` / `⌘K` sends none and
 * toggles; a «+» sends both fields and opens straight into that record.
 */
export type QuickCaptureDetail = { type?: CaptureType; productId?: string }

export type CaptureTypeDef = {
  value: CaptureType
  label: string
  placeholder: string
  /** The full form, for everything the modal deliberately does not ask. */
  href: string
  /** Query param the full form reads, so typed text survives the hand-off. */
  textParam: string
  /** Spelled out per type: Russian agreement is gendered, so «Сегмент сохранёна» is what deriving it produces. */
  saved: string
  /**
   * A second required field. Only JTBD has one, and that is the entire reason
   * it can be offered here at all: a category is required by the model, and a
   * JTBD saved with a junk placeholder category would pollute the coverage and
   * gaps reports this model exists to feed. Asking for it is honest; defaulting
   * it silently would not be.
   */
  extraField?: { name: 'category'; label: string; placeholder: string; param: string }
}

export const CAPTURE_TYPES: CaptureTypeDef[] = [
  {
    value: 'insight',
    label: 'Инсайт',
    placeholder: 'Цитата клиента или ключевой вывод',
    href: '/insights/new',
    textParam: 'text',
    saved: 'Инсайт сохранён',
  },
  {
    value: 'hypothesis',
    label: 'Гипотеза',
    placeholder: 'Если …, то …',
    href: '/hypotheses/new',
    textParam: 'statement',
    saved: 'Гипотеза сохранена',
  },
  {
    value: 'segment',
    label: 'Сегмент',
    placeholder: 'Название сегмента',
    href: '/segments/new',
    textParam: 'name',
    saved: 'Сегмент сохранён',
  },
  {
    value: 'jtbd',
    label: 'JTBD',
    placeholder: 'Когда …, я хочу …, чтобы …',
    href: '/jtbd/new',
    textParam: 'title',
    saved: 'JTBD сохранён',
    extraField: {
      name: 'category',
      label: 'Категория',
      placeholder: 'напр. Контроль сроков',
      param: 'category',
    },
  },
  {
    value: 'feature',
    label: 'Фича',
    placeholder: 'Название фичи',
    href: '/features/new',
    textParam: 'name',
    saved: 'Фича сохранена',
  },
  {
    value: 'rtb',
    label: 'Маркетинг',
    placeholder: 'Обещание, опирающееся на фичу',
    href: '/marketing/new',
    textParam: 'statement',
    saved: 'Обещание сохранено',
  },
  {
    value: 'competitor',
    label: 'Конкурент',
    placeholder: 'Название конкурента',
    href: '/competitors/new',
    textParam: 'name',
    saved: 'Конкурент сохранён',
  },
]

export function captureTypeByValue(value: CaptureType): CaptureTypeDef {
  const found = CAPTURE_TYPES.find((t) => t.value === value)
  if (!found) throw new Error(`Unknown capture type: ${value}`)
  return found
}

/**
 * Where «Открыть полную форму» goes, carrying whatever is already typed.
 *
 * Losing the sentence someone just wrote because the modal did not ask for
 * tags is the failure this hand-off exists to prevent.
 */
export function fullFormHref(
  type: CaptureType,
  values: { productId?: string; text?: string; extra?: string }
): string {
  const def = captureTypeByValue(type)
  const params = new URLSearchParams()
  if (values.productId) params.set('productId', values.productId)
  if (values.text?.trim()) params.set(def.textParam, values.text.trim())
  if (def.extraField && values.extra?.trim()) params.set(def.extraField.param, values.extra.trim())
  const query = params.toString()
  return query ? `${def.href}?${query}` : def.href
}
