// Leading with the point instead of with the boilerplate.
//
// The methodology's phrasing templates put the distinguishing content in the
// middle. A JTBD reads «Когда <контекст>, я хочу <СУТЬ>, чтобы <цель>» — so a
// row truncated from the left shows the context and cuts off before the job:
//
//   Когда с 1 марта 2026 действует Приказ №117 ФСТЭК с обязательной ауте…
//   Когда сертификаты «размазаны» по командам, Excel-таблицам и личным по…
//
// Both rows are almost pure framing; two different jobs look nearly identical.
// Pulling the «я хочу» clause forward gives, from the same records:
//
//   Централизованную систему на протоколах CMP/EST/ACME/WSTEP
//   Единый инвентарь всех сертификатов в реальном времени
//
// Rules, not cleverness: plain deterministic patterns, no AI, no summarising.
// The functions here only ever *select an existing span* of the text — they
// never rewrite a word — and when the template is not there they return the
// input untouched. The full text always stays on the record and in the row's
// tooltip; nothing is lost, only reordered in what gets shown first.

/** Capitalises the first letter, leaving the rest alone (no locale-casing of the whole string). */
function capitalizeFirst(text: string): string {
  return text.length > 0 ? text[0].toLocaleUpperCase('ru-RU') + text.slice(1) : text
}

function trimTail(text: string): string {
  return text.replace(/[\s,;:—–-]+$/u, '')
}

/**
 * «Когда …, я хочу X, чтобы …» → «X».
 *
 * Drops the situation and the purpose, keeps the job. Both halves are dropped
 * only when the marker is actually present, so a plainly-worded JTBD
 * («Выпустить сертификат сотруднику…») survives unchanged.
 */
export function jtbdKeyPhrase(title: string): string {
  const want = title.match(/,\s*(?:я\s+)?хочу\s+(.+)$/iu)
  let phrase = want ? want[1] : title

  // Cut the purpose clause, but only the last one: a job can legitimately
  // contain «чтобы» inside its own wording.
  const purpose = phrase.match(/^(.*?),\s*чтобы\s/iu)
  if (purpose) phrase = purpose[1]

  return capitalizeFirst(trimTail(phrase))
}

/**
 * «Если X, то …» → «X».
 *
 * The intervention is what distinguishes one hypothesis from another — the
 * predictions tend to rhyme («…выберут нас», «…станет решающим фактором»).
 * The prediction is one hover or one click away; half an intervention, which
 * is what plain truncation gave, is not useful to anyone.
 */
export function hypothesisKeyPhrase(statement: string): string {
  const stripped = statement.replace(/^\s*если\s+/iu, '')
  const prediction = stripped.match(/^(.*?),\s*то\s/iu)
  const phrase = prediction ? prediction[1] : stripped
  return capitalizeFirst(trimTail(phrase))
}

/** Labels people type out of habit; they cost a third of the visible row. */
const INSIGHT_LABELS = /^\s*(вывод|инсайт|цитата|наблюдение|итог)\s*[:—-]\s*/iu

/**
 * «Вывод: X» → «X».
 *
 * Quotation marks are deliberately kept: «…» around a row is the signal that
 * it is a customer's own words rather than someone's conclusion.
 */
export function insightKeyPhrase(text: string): string {
  const stripped = text.replace(INSIGHT_LABELS, '')
  return stripped === text ? text : capitalizeFirst(stripped)
}
