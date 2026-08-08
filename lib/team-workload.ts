// Team dashboard / delegation matrix (plans/platform-views-plan.md §3, Фаза
// 2) — default axes from the plan's open question: person × current
// workload. "Team" here means "people connected to this product via at
// least one RoadmapItem," not the whole org directory — matches the plan's
// "отфильтрованных по продукту через их активные RoadmapItem" filter.
// Workload only counts RoadmapItem for now; ProcessStep assignments join in
// once Фаза 3 adds that model.
import { RoadmapStatus, type Person } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface PersonWorkload {
  person: Person
  activeCount: number
  totalCount: number
}

const ACTIVE_STATUSES: RoadmapStatus[] = [RoadmapStatus.PLANNED, RoadmapStatus.IN_PROGRESS]

export async function getProductTeamWorkload(
  userId: string,
  productId: string
): Promise<PersonWorkload[]> {
  const items = await prisma.roadmapItem.findMany({
    where: { userId, productId, ownerId: { not: null } },
    include: { owner: true },
  })

  const byPerson = new Map<string, PersonWorkload>()
  for (const item of items) {
    if (!item.owner) continue
    if (!byPerson.has(item.owner.id)) {
      byPerson.set(item.owner.id, { person: item.owner, activeCount: 0, totalCount: 0 })
    }
    const entry = byPerson.get(item.owner.id)!
    entry.totalCount += 1
    if (ACTIVE_STATUSES.includes(item.status)) entry.activeCount += 1
  }

  return Array.from(byPerson.values()).sort((a, b) => b.activeCount - a.activeCount)
}
