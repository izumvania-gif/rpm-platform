import { describe, expect, it } from 'vitest'
import {
  barDateRange,
  buildGanttLayout,
  NO_TRACK_GROUP_LABEL,
  NO_TRACK_LABEL,
  type GanttSourceItem,
} from '@/lib/roadmap-gantt'

function item(overrides: Partial<GanttSourceItem> & { id: string }): GanttSourceItem {
  return {
    title: overrides.id,
    status: 'PLANNED',
    trackGroup: null,
    track: null,
    startDate: null,
    endDate: null,
    isMilestone: false,
    ...overrides,
  }
}

describe('buildGanttLayout', () => {
  it('draws nothing when nothing has dates, but still hands back every item', () => {
    // Not an empty result: these two items exist, and a chart that returned
    // nothing is exactly why they used to be invisible on this tab.
    const result = buildGanttLayout([item({ id: '1' }), item({ id: '2', isMilestone: true })])
    expect(result.groups).toEqual([])
    expect(result.milestones).toEqual([])
    expect(result.unscheduled.map((u) => u.id)).toEqual(['1', '2'])
  })

  it('groups bar items by trackGroup then track, falling back for unset fields', () => {
    const items = [
      item({
        id: 'front',
        trackGroup: 'Разработка',
        track: 'Фронт',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-10'),
      }),
      item({
        id: 'back',
        trackGroup: 'Разработка',
        track: 'Бэк',
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-01-15'),
      }),
      item({
        id: 'events',
        trackGroup: 'Маркетинг',
        track: 'Мероприятия',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-10'),
      }),
      item({ id: 'loose', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') }),
    ]

    const result = buildGanttLayout(items)

    expect(result.groups.map((g) => g.group)).toEqual([
      'Маркетинг',
      'Разработка',
      NO_TRACK_GROUP_LABEL,
    ])
    const dev = result.groups.find((g) => g.group === 'Разработка')!
    expect(dev.tracks.map((t) => t.track)).toEqual(['Бэк', 'Фронт'])
    const fallback = result.groups.find((g) => g.group === NO_TRACK_GROUP_LABEL)!
    expect(fallback.tracks.map((t) => t.track)).toEqual([NO_TRACK_LABEL])
  })

  it('sorts bars within a track by start date', () => {
    const items = [
      item({
        id: 'later',
        track: 'A',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-10'),
      }),
      item({
        id: 'earlier',
        track: 'A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-10'),
      }),
    ]
    const result = buildGanttLayout(items)
    const bars = result.groups[0].tracks[0].bars
    expect(bars.map((b) => b.id)).toEqual(['earlier', 'later'])
  })

  it('separates milestones from bars and ignores their track/trackGroup', () => {
    const items = [
      item({
        id: 'bar',
        track: 'A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-10'),
      }),
      item({
        id: 'release',
        isMilestone: true,
        trackGroup: 'ignored',
        track: 'ignored',
        startDate: new Date('2026-01-05'),
        title: 'v2.5',
      }),
    ]
    const result = buildGanttLayout(items)
    expect(result.milestones).toEqual([
      { id: 'release', title: 'v2.5', date: new Date('2026-01-05') },
    ])
    expect(result.groups).toHaveLength(1)
  })

  it('excludes a bar item missing either date, and a milestone missing startDate', () => {
    const items = [
      item({ id: 'no-end', track: 'A', startDate: new Date('2026-01-01') }),
      item({ id: 'no-milestone-date', isMilestone: true }),
      item({
        id: 'valid',
        track: 'A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-02'),
      }),
    ]
    const result = buildGanttLayout(items)
    expect(result.milestones).toEqual([])
    expect(result.groups[0].tracks[0].bars.map((b) => b.id)).toEqual(['valid'])
    // Excluded from the chart, but not dropped on the floor — they go to the
    // tray so the PM can put them on the timeline without leaving the tab.
    expect(result.unscheduled.map((u) => u.id)).toEqual(['no-end', 'no-milestone-date'])
  })

  it('names what each unscheduled item is missing', () => {
    const result = buildGanttLayout([
      item({ id: 'nothing' }),
      item({ id: 'no-end', startDate: new Date('2026-01-01') }),
      item({ id: 'no-start', endDate: new Date('2026-01-05') }),
      item({ id: 'milestone', isMilestone: true }),
    ])
    expect(result.unscheduled.map((u) => `${u.id}: ${u.missing}`)).toEqual([
      'nothing: нет дат',
      'no-end: нет даты окончания',
      'no-start: нет даты начала',
      'milestone: нет даты вехи',
    ])
  })

  it('leaves the tray empty once everything is on the chart', () => {
    const result = buildGanttLayout([
      item({ id: 'a', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-10') }),
      item({ id: 'm', isMilestone: true, startDate: new Date('2026-01-05') }),
    ])
    expect(result.unscheduled).toEqual([])
  })

  it('carries the milestone flag, so a dropped milestone gets a date and not a span', () => {
    const result = buildGanttLayout([item({ id: 'm', isMilestone: true })])
    expect(result.unscheduled[0]).toMatchObject({ id: 'm', isMilestone: true })
  })

  it('pads the computed range beyond the min/max dates', () => {
    const items = [
      item({
        id: 'a',
        track: 'A',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-01-20'),
      }),
    ]
    const result = buildGanttLayout(items)
    expect(result.rangeStart.getTime()).toBeLessThan(new Date('2026-01-10').getTime())
    expect(result.rangeEnd.getTime()).toBeGreaterThan(new Date('2026-01-20').getTime())
  })
})

describe('barDateRange', () => {
  const fmt = (date: Date) => date.toISOString().slice(0, 10)

  it('shows a range when there is one', () => {
    expect(barDateRange(new Date('2026-09-01'), new Date('2026-09-20'), fmt)).toBe(
      '2026-09-01 – 2026-09-20'
    )
  })

  // Нулевая длительность — не факт о сроках, а артефакт формата: подсказка
  // писала «1 янв 2026 – 1 янв 2026», диапазон из точки в неё же.
  it('shows one date when both ends are the same day', () => {
    expect(barDateRange(new Date('2026-09-01'), new Date('2026-09-01'), fmt)).toBe('2026-09-01')
  })

  // Сравниваются уже отформатированные строки, а не миллисекунды: если обе
  // даты подписаны одним днём, диапазон между ними бессмыслен независимо от
  // того, сколько между ними часов.
  it('collapses two times on the same day', () => {
    expect(
      barDateRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T18:00:00Z'), fmt)
    ).toBe('2026-09-01')
  })
})
