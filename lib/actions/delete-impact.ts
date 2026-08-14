'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { denyUnowned, type OwnedModel } from '@/lib/ownership'
import {
  EMPTY_IMPACT,
  summarizeImpact,
  type DeleteImpact,
  type ImpactCount,
} from '@/lib/delete-impact'

// The counting half of B4 (plans/2.0-hardening-plan.md). The vocabulary and
// formatting live in lib/delete-impact.ts; this file only asks the database
// what a given delete would cost.
//
// Read-only, but it takes an id straight from the client, so it goes through
// the same ownership guard as every mutation (Фаза 1): otherwise it would be
// a free existence-and-size oracle over other tenants' records — exactly the
// leak `denyUnowned` returning "не найдена" instead of "запрещено" exists to
// prevent.
//
// Two things are deliberately NOT counted: JtbdGraphLayout and
// ProductCanvasLayout. They cascade too, but they are node positions — UI
// state, not work the user would mourn — and listing «12 позиций узлов»
// beside «9 сегментов» would pad the number that is supposed to make someone
// stop and think.

type Counter = (id: string) => Promise<DeleteImpact>

const count = (key: ImpactCount['key'], value: number): ImpactCount => ({ key, count: value })

/**
 * Per-model blast radius. Keys are a subset of OwnedModel; a model absent
 * here has no dependants at all (a roadmap item, an insight, a sales-kit
 * link) and the dialog says so instead of showing an empty list.
 */
const COUNTERS: Partial<Record<OwnedModel, Counter>> = {
  product: async (id) => {
    // The direct children come back in one query via _count; the rest are
    // grandchildren, whose cascade is invisible in the parent's relations.
    const [direct, processSteps, processEdges, competitorNews, statusChanges, sequenceEdges] =
      await Promise.all([
        prisma.product.findFirst({
          where: { id },
          select: {
            _count: {
              select: {
                segments: true,
                jtbds: true,
                hypotheses: true,
                researches: true,
                features: true,
                conversations: true,
                rtbs: true,
                insights: true,
                competitors: true,
                productResources: true,
                roadmapItems: true,
                processes: true,
                actionPlans: true,
                teamMembers: true,
              },
            },
          },
        }),
        prisma.processStep.count({ where: { process: { productId: id } } }),
        prisma.processEdge.count({ where: { fromStep: { process: { productId: id } } } }),
        prisma.competitorNewsItem.count({ where: { competitor: { productId: id } } }),
        prisma.hypothesisStatusChange.count({ where: { hypothesis: { productId: id } } }),
        prisma.jtbdSequenceEdge.count({ where: { fromJtbd: { productId: id } } }),
      ])

    const c = direct?._count
    if (!c) return EMPTY_IMPACT

    return {
      deleted: [
        count('segment', c.segments),
        count('jtbd', c.jtbds),
        count('hypothesis', c.hypotheses),
        count('research', c.researches),
        count('feature', c.features),
        count('conversation', c.conversations),
        count('rtb', c.rtbs),
        count('insight', c.insights),
        count('competitor', c.competitors),
        count('productResource', c.productResources),
        count('roadmapItem', c.roadmapItems),
        count('process', c.processes),
        count('actionPlan', c.actionPlans),
        count('teamMember', c.teamMembers),
        count('processStep', processSteps),
        count('processEdge', processEdges),
        count('competitorNews', competitorNews),
        count('statusChange', statusChanges),
        count('sequenceEdge', sequenceEdges),
      ],
      unlinked: [],
    }
  },

  segment: async (id) => {
    const row = await prisma.segment.findFirst({
      where: { id },
      select: {
        _count: { select: { jtbds: true, hypotheses: true, conversations: true, insights: true } },
      },
    })
    const c = row?._count
    if (!c) return EMPTY_IMPACT
    return {
      deleted: [],
      unlinked: [
        count('jtbd', c.jtbds),
        count('hypothesis', c.hypotheses),
        count('conversation', c.conversations),
        count('insight', c.insights),
      ],
    }
  },

  jtbd: async (id) => {
    const [row, sequenceEdges] = await Promise.all([
      prisma.jTBD.findFirst({
        where: { id },
        select: {
          _count: {
            select: {
              children: true,
              hypotheses: true,
              insights: true,
              features: true,
              roadmapItems: true,
            },
          },
        },
      }),
      // Both directions: an edge dies whichever end of it is deleted.
      prisma.jtbdSequenceEdge.count({ where: { OR: [{ fromJtbdId: id }, { toJtbdId: id }] } }),
    ])
    const c = row?._count
    if (!c) return EMPTY_IMPACT
    return {
      deleted: [count('sequenceEdge', sequenceEdges)],
      unlinked: [
        count('childJtbd', c.children),
        count('hypothesis', c.hypotheses),
        count('insight', c.insights),
        count('feature', c.features),
        count('roadmapItem', c.roadmapItems),
      ],
    }
  },

  research: async (id) => {
    const row = await prisma.research.findFirst({
      where: { id },
      select: {
        _count: { select: { jtbds: true, hypotheses: true, conversations: true, insights: true } },
      },
    })
    const c = row?._count
    if (!c) return EMPTY_IMPACT
    return {
      deleted: [],
      unlinked: [
        count('jtbd', c.jtbds),
        count('hypothesis', c.hypotheses),
        count('conversation', c.conversations),
        count('insight', c.insights),
      ],
    }
  },

  hypothesis: async (id) => {
    const row = await prisma.hypothesis.findFirst({
      where: { id },
      select: { _count: { select: { statusChanges: true } } },
    })
    if (!row) return EMPTY_IMPACT
    return { deleted: [count('statusChange', row._count.statusChanges)], unlinked: [] }
  },

  conversation: async (id) => {
    const row = await prisma.conversation.findFirst({
      where: { id },
      select: { _count: { select: { insights: true } } },
    })
    if (!row) return EMPTY_IMPACT
    return { deleted: [], unlinked: [count('insight', row._count.insights)] }
  },

  competitor: async (id) => {
    const row = await prisma.competitor.findFirst({
      where: { id },
      select: { _count: { select: { newsItems: true } } },
    })
    if (!row) return EMPTY_IMPACT
    return { deleted: [count('competitorNews', row._count.newsItems)], unlinked: [] }
  },

  feature: async (id) => {
    const row = await prisma.feature.findFirst({
      where: { id },
      select: { _count: { select: { rtbs: true, jtbds: true, roadmapItems: true } } },
    })
    const c = row?._count
    if (!c) return EMPTY_IMPACT
    return {
      deleted: [],
      unlinked: [
        count('rtb', c.rtbs),
        count('jtbd', c.jtbds),
        count('roadmapItem', c.roadmapItems),
      ],
    }
  },

  rtb: async (id) => {
    const row = await prisma.rTB.findFirst({
      where: { id },
      select: { _count: { select: { features: true } } },
    })
    if (!row) return EMPTY_IMPACT
    return { deleted: [], unlinked: [count('feature', row._count.features)] }
  },

  process: async (id) => {
    const [row, processEdges, actionPlans] = await Promise.all([
      prisma.process.findFirst({ where: { id }, select: { _count: { select: { steps: true } } } }),
      prisma.processEdge.count({ where: { fromStep: { processId: id } } }),
      prisma.actionPlan.count({ where: { processStep: { processId: id } } }),
    ])
    if (!row) return EMPTY_IMPACT
    return {
      deleted: [count('processStep', row._count.steps), count('processEdge', processEdges)],
      unlinked: [count('actionPlan', actionPlans)],
    }
  },

  processStep: async (id) => {
    const [row, processEdges] = await Promise.all([
      prisma.processStep.findFirst({
        where: { id },
        select: { _count: { select: { actionPlans: true } } },
      }),
      prisma.processEdge.count({ where: { OR: [{ fromStepId: id }, { toStepId: id }] } }),
    ])
    if (!row) return EMPTY_IMPACT
    return {
      deleted: [count('processEdge', processEdges)],
      unlinked: [count('actionPlan', row._count.actionPlans)],
    }
  },

  person: async (id) => {
    const row = await prisma.person.findFirst({
      where: { id },
      select: {
        _count: {
          select: {
            teamMemberships: true,
            ownedProducts: true,
            roadmapItems: true,
            processSteps: true,
            actionPlans: true,
          },
        },
      },
    })
    const c = row?._count
    if (!c) return EMPTY_IMPACT
    return {
      deleted: [count('teamMember', c.teamMemberships)],
      unlinked: [
        count('product', c.ownedProducts),
        count('roadmapItem', c.roadmapItems),
        count('processStep', c.processSteps),
        count('actionPlan', c.actionPlans),
      ],
    }
  },

  department: async (id) => {
    const row = await prisma.department.findFirst({
      where: { id },
      select: { _count: { select: { products: true } } },
    })
    if (!row) return EMPTY_IMPACT
    return { deleted: [], unlinked: [count('product', row._count.products)] }
  },
}

/**
 * What deleting this record would take with it.
 *
 * Returns the same "not found" error as the mutation guards for anything the
 * caller does not own, and an empty impact for a model with no dependants —
 * which the dialog renders as «Связанных записей нет», not as a blank list.
 */
export async function getDeleteImpact(
  model: OwnedModel,
  id: string
): Promise<{ ok: true; impact: DeleteImpact } | { ok: false; error: string }> {
  const userId = getCurrentUserId()

  const denied = await denyUnowned(model, id, userId)
  if (denied) return denied

  const counter = COUNTERS[model]
  if (!counter) return { ok: true, impact: EMPTY_IMPACT }

  const impact = await counter(id)
  return {
    ok: true,
    impact: {
      deleted: summarizeImpact(impact.deleted),
      unlinked: summarizeImpact(impact.unlinked),
    },
  }
}
