// The Inbox (plans/2.0-product-leap-plan.md, B1 — the version without AI).
//
// A1's BulkAddPanel already turns a pasted list into records, but it forces
// ONE type on the whole paste. Real notes from a call are mixed: a customer
// quote, a hypothesis it suggests, the segment the person belongs to. Making
// the PM paste three times, once per type, is the same tax A1 was supposed to
// remove.
//
// So the Inbox splits a paste into items and gives each item its own type,
// pre-guessed. The guess is a small set of rules over the way these things
// are actually written in Russian — not NLP, not AI. It is wrong sometimes
// and that is fine: every guess is a one-click override in the UI, and the
// bar it has to clear is "correcting a few beats assigning all of them", not
// "correct".
//
// B2 (the AI pass) replaces `classifyLine` with a model call and keeps
// everything else — the item list, the per-item override, the confirm step,
// and the rule that nothing is written until the human presses the button.

import { parseBulkLines, type BulkEntity } from '@/lib/bulk-entry'

/**
 * The types the Inbox can produce.
 *
 * A subset of BulkEntity, not the whole of it: JTBD needs a category, which
 * the classifier has no honest way to guess from one line of call notes, and
 * a batch-wide answer (what BulkAddPanel asks for) makes no sense here — the
 * whole point of the Inbox is that the lines are of mixed kinds. So a JTBD
 * still gets written through its own form or the batch panel.
 */
export type InboxEntity = Exclude<BulkEntity, 'jtbd'>

/** Display order for the summary line. */
export const INBOX_ENTITIES: InboxEntity[] = [
  'segment',
  'insight',
  'hypothesis',
  'feature',
  'rtb',
  'competitor',
]

export interface InboxItem {
  /** Stable within one parse, so React keys and edits survive re-render. */
  id: string
  text: string
  type: InboxEntity
  /** Why this type was guessed — shown as a hint so the guess is not magic. */
  reason: string
  include: boolean
}

/**
 * Cyrillic-safe word boundary.
 *
 * JavaScript's `\b` is defined against `\w`, which is `[A-Za-z0-9_]` — no
 * Cyrillic. So `/\bесли\b/` never matches "Если убрать…": there is no ASCII
 * word character next to the "е", hence no boundary. Every keyword rule below
 * is Russian, so all of them would silently never fire. Unicode property
 * escapes with the `u` flag give a boundary that actually understands letters.
 */
function word(pattern: string): RegExp {
  return new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, 'iu')
}

/** Ordered; first match wins. */
const RULES: { type: InboxEntity; reason: string; test: (line: string) => boolean }[] = [
  {
    type: 'insight',
    reason: 'прямая речь',
    // A quoted line is almost always something a customer said.
    test: (l) => /^[«"'']/.test(l.trim()) || /«[^»]{8,}»/.test(l),
  },
  {
    type: 'hypothesis',
    // The "Если …, то …" shape is the form this app's own hypothesis
    // placeholder teaches, so text written for it reads exactly this way.
    reason: 'форма «Если …, то …»',
    test: (l) => word('если').test(l) && word('то').test(l),
  },
  {
    type: 'hypothesis',
    reason: 'предположение',
    test: (l) =>
      word('предполага\\p{L}+|гипотеза|скорее всего').test(l) || /проверить,?\s+что/iu.test(l),
  },
  {
    type: 'competitor',
    reason: 'упоминание конкурента',
    test: (l) => word('конкурент\\p{L}*|аналог\\p{L}*|альтернатива').test(l),
  },
  {
    type: 'feature',
    reason: 'запрос возможности',
    test: (l) =>
      word('нужн\\p{L}+|должен уметь|должна уметь|возможность|поддержка|автоматизир\\p{L}+').test(
        l
      ),
  },
  {
    type: 'segment',
    reason: 'короткая именная группа',
    // Segments are named, not described: "Банки топ-30", "Госзаказчики".
    // Three words or fewer with no sentence punctuation reads as a name.
    test: (l) => wordCount(l) <= 3 && !/[.!?]$/.test(l.trim()),
  },
]

/** Fallback: Insight is the model's own catch-all for "one atomic thought". */
const DEFAULT_TYPE: InboxEntity = 'insight'
const DEFAULT_REASON = 'по умолчанию'

function wordCount(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length
}

export function classifyLine(line: string): { type: InboxEntity; reason: string } {
  for (const rule of RULES) {
    if (rule.test(line)) return { type: rule.type, reason: rule.reason }
  }
  return { type: DEFAULT_TYPE, reason: DEFAULT_REASON }
}

/**
 * Splits a paste into classified items. Reuses A1's line parser so the two
 * entry points agree on what counts as a line (list markup stripped, blanks
 * and case-insensitive duplicates dropped).
 */
export function parseInbox(raw: string): InboxItem[] {
  return parseBulkLines(raw).map((text, index) => {
    const { type, reason } = classifyLine(text)
    return { id: `item-${index}`, text, type, reason, include: true }
  })
}

/** Counts per type for the confirm button, in a stable display order. */
export function summarize(items: InboxItem[]): { type: InboxEntity; count: number }[] {
  const order = INBOX_ENTITIES
  const counts = new Map<InboxEntity, number>()
  for (const item of items) {
    if (!item.include || !item.text.trim()) continue
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
  }
  return order
    .filter((type) => (counts.get(type) ?? 0) > 0)
    .map((type) => ({ type, count: counts.get(type)! }))
}
