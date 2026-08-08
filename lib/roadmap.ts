// Shared by /pm, /public, and /cpo — all three group RoadmapItem rows by
// quarter the same way, so this is the third copy of the same ~10 lines
// (rule of three) rather than a premature abstraction.
export const NO_QUARTER_LABEL = 'Без квартала'

export function groupByQuarter<T extends { quarter: string | null }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = item.quarter?.trim() || NO_QUARTER_LABEL
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === NO_QUARTER_LABEL) return 1
    if (b === NO_QUARTER_LABEL) return -1
    return a.localeCompare(b, 'ru')
  })
}
