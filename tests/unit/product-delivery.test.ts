import { describe, expect, it } from 'vitest'
import { RoadmapStatus } from '@prisma/client'
import { nextMilestone, roadmapStatusCounts } from '@/lib/product-delivery'

function item(
  overrides: Partial<{
    id: string
    title: string
    status: RoadmapStatus
    startDate: Date | null
    isMilestone: boolean
  }> = {}
) {
  return {
    id: overrides.id ?? 'x',
    title: overrides.title ?? 'Пункт',
    status: overrides.status ?? RoadmapStatus.PLANNED,
    startDate: overrides.startDate ?? null,
    isMilestone: overrides.isMilestone ?? false,
  }
}

describe('roadmapStatusCounts', () => {
  it('counts every status, with zeros for the empty ones', () => {
    expect(
      roadmapStatusCounts([
        item({ status: RoadmapStatus.IN_PROGRESS }),
        item({ status: RoadmapStatus.IN_PROGRESS }),
        item({ status: RoadmapStatus.SHIPPED }),
      ])
    ).toEqual({ PLANNED: 0, IN_PROGRESS: 2, SHIPPED: 1, PAUSED: 0 })
  })

  it('is all zeros for an empty roadmap', () => {
    expect(roadmapStatusCounts([])).toEqual({ PLANNED: 0, IN_PROGRESS: 0, SHIPPED: 0, PAUSED: 0 })
  })
})

describe('nextMilestone', () => {
  const now = new Date(2026, 8, 13, 15, 30)

  it('picks the earliest milestone that has not passed', () => {
    const items = [
      item({ id: 'later', isMilestone: true, startDate: new Date(2026, 10, 1) }),
      item({ id: 'soon', isMilestone: true, startDate: new Date(2026, 9, 1) }),
      item({ id: 'past', isMilestone: true, startDate: new Date(2026, 5, 1) }),
    ]
    expect(nextMilestone(items, now)?.id).toBe('soon')
  })

  it('keeps a milestone dated today until midnight', () => {
    const items = [item({ id: 'today', isMilestone: true, startDate: new Date(2026, 8, 13) })]
    expect(nextMilestone(items, now)?.id).toBe('today')
  })

  it('ignores ordinary items and milestones without a date', () => {
    const items = [
      item({ id: 'bar', isMilestone: false, startDate: new Date(2026, 9, 1) }),
      item({ id: 'undated', isMilestone: true, startDate: null }),
    ]
    expect(nextMilestone(items, now)).toBeNull()
  })

  it('is null when every milestone is in the past', () => {
    const items = [item({ id: 'past', isMilestone: true, startDate: new Date(2026, 0, 1) })]
    expect(nextMilestone(items, now)).toBeNull()
  })
})
