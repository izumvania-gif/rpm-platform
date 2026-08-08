import { z } from 'zod'

// FormData gives '' for an empty optional <select>/<input>. Zod's `.optional()`
// treats '' as a present value (it's a valid string), not as "absent" - so
// `.optional().or(z.literal('').transform(() => undefined))` never reaches its
// fallback branch and '' leaks through as-is. Normalize '' to undefined first.
export function optionalString(schema: z.ZodString = z.string().trim()) {
  return z.preprocess((val) => (val === '' || val == null ? undefined : val), schema.optional())
}

export function optionalNumber(schema: z.ZodNumber) {
  return z.preprocess((val) => (val === '' || val == null ? undefined : val), schema.optional())
}

export function optionalDate(schema: z.ZodDate = z.coerce.date()) {
  return z.preprocess((val) => (val === '' || val == null ? undefined : val), schema.optional())
}

// Shared return shape for the inline-editable-field Server Actions (§2.9.5) —
// one per model, each switching over a whitelisted set of field names.
export type InlineFieldResult = { ok: true } | { ok: false; error: string }

export function toTagsArray(tags?: string): string[] {
  if (!tags) return []
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// Same idea as toTagsArray, but for ordered step-by-step text (ActionPlan.steps,
// plans/platform-views-plan.md §1) — one instruction per line reads far more
// naturally in a textarea than a comma-separated list would, and Postgres
// arrays preserve insertion order so the sequence survives the round trip.
export function toLines(text?: string): string[] {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
