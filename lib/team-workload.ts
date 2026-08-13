// Team dashboard / delegation matrix (plans/platform-views-plan.md §3, Фаза
// 2) — default axes from the plan's open question: person × current
// workload. "Team" here means "people connected to this product via at
// least one RoadmapItem or ProcessStep," not the whole org directory —
// matches the plan's "отфильтрованных по продукту через их активные
// RoadmapItem/ProcessStep" filter. ProcessStep (Фаза 3) has no lifecycle
// status of its own — being assigned to a step is always "active" work,
// unlike a roadmap item that can be SHIPPED/PAUSED.
import { RoadmapStatus, type Person } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface PersonWorkload {
  person: Person
  activeCount: number
  totalCount: number
}

const ACTIVE_ROADMAP_STATUSES: RoadmapStatus[] = [RoadmapStatus.PLANNED, RoadmapStatus.IN_PROGRESS]

export async function getProductTeamWorkload(
  userId: string,
  productId: string
): Promise<PersonWorkload[]> {
  const [roadmapItems, processSteps] = await Promise.all([
    prisma.roadmapItem.findMany({
      where: { userId, productId, ownerId: { not: null } },
      include: { owner: true },
    }),
    prisma.processStep.findMany({
      // The userId leg is not redundant (plans/2.0-hardening-plan.md, Фаза 2):
      // this function is handed a productId by its caller, and filtering on
      // that alone returns another user's steps if the id ever comes from
      // somewhere less trusted than today's page props.
      where: {
        process: { productId, product: { userId } },
        assignedPersonId: { not: null },
      },
      include: { assignedPerson: true },
    }),
  ])

  const byPerson = new Map<string, PersonWorkload>()
  function ensure(person: Person): PersonWorkload {
    if (!byPerson.has(person.id)) {
      byPerson.set(person.id, { person, activeCount: 0, totalCount: 0 })
    }
    return byPerson.get(person.id)!
  }

  for (const item of roadmapItems) {
    if (!item.owner) continue
    const entry = ensure(item.owner)
    entry.totalCount += 1
    if (ACTIVE_ROADMAP_STATUSES.includes(item.status)) entry.activeCount += 1
  }
  for (const step of processSteps) {
    if (!step.assignedPerson) continue
    const entry = ensure(step.assignedPerson)
    entry.totalCount += 1
    entry.activeCount += 1
  }

  return Array.from(byPerson.values()).sort((a, b) => b.activeCount - a.activeCount)
}

// The Команда section on /pm (plans/2.0-ux-improvement-plan.md, Фаза 2)
// shows more than getProductTeamWorkload's derived list: explicitly
// rostered people (ProductTeamMember) who may have zero active work yet —
// the "chicken and egg" gap the UX audit found, where someone could only
// ever show up in Команда after already being assigned a task — merged
// with anyone who has active work but was never added to the roster, so
// nobody silently falls out of view either way.
export interface TeamMember extends PersonWorkload {
  inRoster: boolean
  membershipId: string | null
}

export async function getProductTeam(userId: string, productId: string): Promise<TeamMember[]> {
  const [workload, members] = await Promise.all([
    getProductTeamWorkload(userId, productId),
    prisma.productTeamMember.findMany({
      // Same reasoning as the processStep query above.
      where: { productId, product: { userId } },
      include: { person: true },
    }),
  ])

  const byPerson = new Map<string, TeamMember>()
  for (const entry of workload) {
    byPerson.set(entry.person.id, { ...entry, inRoster: false, membershipId: null })
  }
  for (const member of members) {
    const existing = byPerson.get(member.personId)
    if (existing) {
      existing.inRoster = true
      existing.membershipId = member.id
    } else {
      byPerson.set(member.personId, {
        person: member.person,
        activeCount: 0,
        totalCount: 0,
        inRoster: true,
        membershipId: member.id,
      })
    }
  }

  return Array.from(byPerson.values()).sort(
    (a, b) => b.activeCount - a.activeCount || a.person.name.localeCompare(b.person.name)
  )
}
