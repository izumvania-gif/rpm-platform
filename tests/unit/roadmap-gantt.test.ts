import { describe, expect, it } from 'vitest'
import {
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
  it('returns an empty layout when nothing has dates', () => {
    const result = buildGanttLayout([item({ id: '1' }), item({ id: '2', isMilestone: true })])
    expect(result).toEqual({
      groups: [],
      milestones: [],
      rangeStart: result.rangeStart,
      rangeEnd: result.rangeEnd,
    })
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
