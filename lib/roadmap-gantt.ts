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

/**
 * A roadmap item the chart cannot place yet.
 *
 * This is the whole reason planning used to mean bouncing between the two
 * tabs: «Добавить пункт» creates a title/status/quarter/owner and no dates,
 * and a bar needs both — so a freshly created item was invisible here, and the
 * only way to find out it existed was to switch to «Список». The chart now
 * carries these along so it can show everything and let them be dropped onto
 * the timeline.
 */
export interface UnscheduledItem {
  id: string
  title: string
  status: RoadmapStatus
  isMilestone: boolean
  /** What is missing, in the user's words. */
  missing: string
}

export interface GanttLayout {
  groups: GanttGroup[]
  milestones: GanttMilestone[]
  unscheduled: UnscheduledItem[]
  rangeStart: Date
  rangeEnd: Date
}

const EMPTY_LAYOUT: Omit<GanttLayout, 'unscheduled'> = {
  groups: [],
  milestones: [],
  rangeStart: new Date(),
  rangeEnd: new Date(),
}

/**
 * A milestone needs only its date; a bar needs both ends. Saying which one is
 * missing is what lets the tray chip explain itself instead of just sitting
 * there.
 */
function missingSchedule(item: GanttSourceItem): string | null {
  if (item.isMilestone) return item.startDate === null ? 'нет даты вехи' : null
  if (item.startDate === null && item.endDate === null) return 'нет дат'
  if (item.startDate === null) return 'нет даты начала'
  if (item.endDate === null) return 'нет даты окончания'
  return null
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
    .filter(
      (item): item is GanttSourceItem & { startDate: Date } =>
        item.isMilestone && item.startDate !== null
    )
    .map((item) => ({ id: item.id, title: item.title, date: item.startDate }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const barItems = items.filter(
    (item): item is GanttSourceItem & { startDate: Date; endDate: Date } =>
      !item.isMilestone && item.startDate !== null && item.endDate !== null
  )

  const unscheduled: UnscheduledItem[] = items.flatMap((item) => {
    const missing = missingSchedule(item)
    return missing
      ? [
          {
            id: item.id,
            title: item.title,
            status: item.status,
            isMilestone: item.isMilestone,
            missing,
          },
        ]
      : []
  })

  if (barItems.length === 0 && milestones.length === 0) return { ...EMPTY_LAYOUT, unscheduled }

  const groupMap = new Map<string, Map<string, GanttBar[]>>()
  for (const item of barItems) {
    const groupKey = item.trackGroup?.trim() || NO_TRACK_GROUP_LABEL
    const trackKey = item.track?.trim() || NO_TRACK_LABEL
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, new Map())
    const trackMap = groupMap.get(groupKey)!
    if (!trackMap.has(trackKey)) trackMap.set(trackKey, [])
    trackMap.get(trackKey)!.push({
      id: item.id,
      title: item.title,
      status: item.status,
      startDate: item.startDate,
      endDate: item.endDate,
    })
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
    unscheduled,
    rangeStart: new Date(minTime - pad),
    rangeEnd: new Date(maxTime + pad),
  }
}
