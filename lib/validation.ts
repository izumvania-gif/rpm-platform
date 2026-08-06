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
