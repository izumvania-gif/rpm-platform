import type { RoadmapStatus } from '@prisma/client'

// /pm's "Гант" tab (added after platform-views-plan.md's 8 phases shipped).
// Groups bar items into trackGroup -> track lanes and separates milestones
// out, so the chart component only has to render, not group/sort.

export const NO_TRACK_GROUP_LABEL = 'Без блока'
export const NO_TRACK_LABEL = 'Без трека'

export interface GanttSourceItem {
  id: string
  title: string
  status: RoadmapStatus
  trackGroup: string | null
  track: string | null
  startDate: Date | null
  endDate: Date | null
  isMilestone: boolean
}

export interface GanttBar {
  id: string
  title: string
  status: RoadmapStatus
  startDate: Date
  endDate: Date
}

export interface GanttMilestone {
  id: string
  title: string
  date: Date
}

export interface GanttTrackRow {
  track: string
  bars: GanttBar[]
}

export interface GanttGroup {
  group: string
  tracks: GanttTrackRow[]
}

export interface GanttLayout {
  groups: GanttGroup[]
  milestones: GanttMilestone[]
  rangeStart: Date
  rangeEnd: Date
}

const EMPTY_LAYOUT: GanttLayout = {
  groups: [],
  milestones: [],
  rangeStart: new Date(),
  rangeEnd: new Date(),
}

// Fallback label always sorts last; everything else alphabetically — same
// convention as lib/roadmap.ts's groupByQuarter for NO_QUARTER_LABEL.
function compareWithFallbackLast(a: string, b: string, fallback: string): number {
  if (a === fallback) return 1
  if (b === fallback) return -1
  return a.localeCompare(b, 'ru')
}

export function buildGanttLayout(items: GanttSourceItem[]): GanttLayout {
  const milestones: GanttMilestone[] = items
    .filter((item): item is GanttSourceItem & { startDate: Date } => item.isMilestone && item.startDate !== null)
    .map((item) => ({ id: item.id, title: item.title, date: item.startDate }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const barItems = items.filter(
    (item): item is GanttSourceItem & { startDate: Date; endDate: Date } =>
      !item.isMilestone && item.startDate !== null && item.endDate !== null
  )

  if (barItems.length === 0 && milestones.length === 0) return EMPTY_LAYOUT

  const groupMap = new Map<string, Map<string, GanttBar[]>>()
  for (const item of barItems) {
    const groupKey = item.trackGroup?.trim() || NO_TRACK_GROUP_LABEL
    const trackKey = item.track?.trim() || NO_TRACK_LABEL
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, new Map())
    const trackMap = groupMap.get(groupKey)!
    if (!trackMap.has(trackKey)) trackMap.set(trackKey, [])
    trackMap
      .get(trackKey)!
      .push({ id: item.id, title: item.title, status: item.status, startDate: item.startDate, endDate: item.endDate })
  }

  const groups: GanttGroup[] = Array.from(groupMap.entries())
    .sort(([a], [b]) => compareWithFallbackLast(a, b, NO_TRACK_GROUP_LABEL))
    .map(([group, trackMap]) => ({
      group,
      tracks: Array.from(trackMap.entries())
        .sort(([a], [b]) => compareWithFallbackLast(a, b, NO_TRACK_LABEL))
        .map(([track, bars]) => ({
          track,
          bars: bars.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
        })),
    }))

  const allDates = [
    ...barItems.flatMap((item) => [item.startDate, item.endDate]),
    ...milestones.map((m) => m.date),
  ]
  const minTime = Math.min(...allDates.map((d) => d.getTime()))
  const maxTime = Math.max(...allDates.map((d) => d.getTime()))
  const span = Math.max(maxTime - minTime, 1)
  // Pad both ends so bars/milestones at the extremes aren't flush against
  // the chart edge — the greater of 3 days or 5% of the span.
  const pad = Math.max(3 * 24 * 60 * 60 * 1000, span * 0.05)

  return {
    groups,
    milestones,
    rangeStart: new Date(minTime - pad),
    rangeEnd: new Date(maxTime + pad),
  }
}
