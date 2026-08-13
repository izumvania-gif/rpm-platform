// Derive, don't demand (plans/2.0-product-leap-plan.md, C4).
//
// Every link in this app is currently made by hand. The cheapest place to stop
// demanding is a conversation that already has a transcript: the quotes worth
// keeping as insights are sitting in it, and today the PM has to re-type them
// into a separate form.
//
// Rules, not AI. The bar is not "find every insight" — it is "offer the few
// obvious ones so the PM edits instead of authors". Anything genuinely
// interpretive (reading a set of insights and proposing a JTBD) needs a model
// and belongs to B2; guessing it with regexes would produce confident nonsense
// in the one place where nonsense is most expensive.

export interface InsightSuggestion {
  text: string
  /** Why this fragment was picked — shown so the suggestion is not magic. */
  reason: string
}

const MIN_LENGTH = 15
const MAX_SUGGESTIONS = 8

/** Cyrillic-safe: JS `\w` is ASCII-only, so `\b`-style rules never fire here. */
const QUOTED = /«([^»]{15,400})»|"([^"]{15,400})"/g
/** Dialogue dash at the start of a line — the Russian transcript convention. */
const DASH_LINE = /^[—–-]\s*(.+)$/
/** `Клиент: …`, `Иван: …` — a speaker label before the utterance. */
const SPEAKER_LINE = /^\s*([\p{Lu}][\p{L}\s.]{1,24}):\s*(.+)$/u

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Candidate insights from a transcript, best first.
 *
 * Deliberately silent when a transcript has neither quotes nor speaker
 * markers: every sentence would qualify, and a panel offering twenty
 * suggestions is worse than one offering none — it moves the reading work back
 * onto the PM while pretending to have done it.
 *
 * `existing` removes fragments already saved as insights, so accepted
 * suggestions stop being offered.
 */
export function suggestInsightsFromTranscript(
  transcript: string | null | undefined,
  existing: string[] = []
): InsightSuggestion[] {
  if (!transcript || !transcript.trim()) return []

  const seen = new Set(existing.map((text) => clean(text).toLowerCase()))
  const out: InsightSuggestion[] = []

  function add(raw: string, reason: string) {
    const text = clean(raw)
    if (text.length < MIN_LENGTH) return
    const key = text.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ text, reason })
  }

  // 1. Quoted fragments: whoever wrote the transcript already marked these as
  //    the words that were actually said.
  for (const match of transcript.matchAll(QUOTED)) {
    add(match[1] ?? match[2] ?? '', 'прямая речь в кавычках')
  }

  // 2. Speaker-marked turns, in the order they appear.
  for (const line of transcript.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const dash = DASH_LINE.exec(trimmed)
    if (dash) {
      add(dash[1], 'реплика в диалоге')
      continue
    }
    const speaker = SPEAKER_LINE.exec(trimmed)
    if (speaker) add(speaker[2], `реплика: ${clean(speaker[1])}`)
  }

  return out.slice(0, MAX_SUGGESTIONS)
}
