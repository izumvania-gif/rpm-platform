import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { isOwned, denyUnowned, NOT_OWNED_ERROR, type OwnedModel } from '@/lib/ownership'
import { ensureTestUser } from './helpers'

// The tenant guard itself (plans/2.0-hardening-plan.md, A1 + A5).
//
// The audit found exactly one isolation test in the whole suite, on the one
// action that actually filtered by userId. This covers the shared primitive
// every action now goes through, for every model — including the ones with no
// `userId` column of their own, whose protection is entirely a relation chain
// and therefore the easiest to get silently wrong.

beforeEach(ensureTestUser)

async function otherUser() {
  return prisma.user.create({
    data: {
      email: `other-own-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      passwordHash: 'x',
    },
  })
}

/** One product per user, plus everything hanging off each. */
async function twoWorlds() {
  const them = await otherUser()
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  async function world(userId: string, tag: string) {
    const product = await prisma.product.create({
      data: { name: `P-${tag}`, slug: `p-${tag}-${suffix}`, userId },
    })
    const segment = await prisma.segment.create({
      data: { name: 'S', slug: `s-${tag}-${suffix}`, tags: [], productId: product.id, userId },
    })
    const jtbd = await prisma.jTBD.create({
      data: { title: 'J', category: 'C', tags: [], productId: product.id, userId },
    })
    const jtbd2 = await prisma.jTBD.create({
      data: { title: 'J2', category: 'C', tags: [], productId: product.id, userId },
    })
    const hypothesis = await prisma.hypothesis.create({
      data: { statement: 'H', tags: [], productId: product.id, userId },
    })
    const competitor = await prisma.competitor.create({
      data: { name: 'K', features: [], productId: product.id, userId },
    })
    const person = await prisma.person.create({ data: { name: 'Ч', userId } })
    const process = await prisma.process.create({
      data: { title: 'Пр', productId: product.id },
    })
    const step = await prisma.processStep.create({
      data: { title: 'Ш', processId: process.id, x: 0, y: 0 },
    })
    const step2 = await prisma.processStep.create({
      data: { title: 'Ш2', processId: process.id, x: 0, y: 0 },
    })
    return {
      product: product.id,
      segment: segment.id,
      jtbd: jtbd.id,
      hypothesis: hypothesis.id,
      competitor: competitor.id,
      person: person.id,
      process: process.id,
      processStep: step.id,
      research: (
        await prisma.research.create({
          data: {
            title: 'И',
            date: new Date(),
            type: 'QUALITATIVE',
            productId: product.id,
            userId,
            tags: [],
          },
        })
      ).id,
      conversation: (
        await prisma.conversation.create({
          data: { title: 'Р', date: new Date(), productId: product.id, userId, tags: [] },
        })
      ).id,
      feature: (await prisma.feature.create({ data: { name: 'Ф', productId: product.id, userId } }))
        .id,
      rtb: (await prisma.rTB.create({ data: { statement: 'О', productId: product.id, userId } }))
        .id,
      insight: (
        await prisma.insight.create({
          data: { text: 'И', tags: [], productId: product.id, userId },
        })
      ).id,
      department: (await prisma.department.create({ data: { name: `Д-${tag}`, userId } })).id,
      productResource: (
        await prisma.productResource.create({
          data: {
            title: 'Рес',
            kind: 'SALES_KIT',
            url: 'https://x',
            productId: product.id,
            userId,
          },
        })
      ).id,
      roadmapItem: (
        await prisma.roadmapItem.create({
          data: { title: 'РИ', productId: product.id, userId },
        })
      ).id,
      actionPlan: (
        await prisma.actionPlan.create({
          data: {
            scenario: 'Сценарий',
            trigger: 'т',
            steps: ['шаг'],
            tags: [],
            productId: product.id,
            userId,
          },
        })
      ).id,
      competitorNewsItem: (
        await prisma.competitorNewsItem.create({
          data: { title: 'Н', date: new Date(), competitorId: competitor.id },
        })
      ).id,
      jtbdSequenceEdge: (
        await prisma.jtbdSequenceEdge.create({
          data: { fromJtbdId: jtbd.id, toJtbdId: jtbd2.id },
        })
      ).id,
      productTeamMember: (
        await prisma.productTeamMember.create({
          data: { productId: product.id, personId: person.id },
        })
      ).id,
      processEdge: (
        await prisma.processEdge.create({ data: { fromStepId: step.id, toStepId: step2.id } })
      ).id,
    }
  }

  return { mine: await world(DEFAULT_USER_ID, 'mine'), theirs: await world(them.id, 'theirs') }
}

describe('isOwned', () => {
  it('accepts my own records and rejects the same record for another user', async () => {
    const { mine, theirs } = await twoWorlds()
    const models = Object.keys(mine) as OwnedModel[]

    // Guards against the test quietly covering nothing if a key is dropped.
    expect(models.length).toBeGreaterThanOrEqual(21)

    for (const model of models) {
      expect(await isOwned(model, mine[model], DEFAULT_USER_ID), `${model}: mine`).toBe(true)
      expect(await isOwned(model, theirs[model], DEFAULT_USER_ID), `${model}: theirs`).toBe(false)
    }
  })

  it('rejects an id that does not exist at all', async () => {
    expect(await isOwned('product', 'nope', DEFAULT_USER_ID)).toBe(false)
  })

  it('rejects an empty id without hitting the database', async () => {
    expect(await isOwned('segment', '', DEFAULT_USER_ID)).toBe(false)
  })

  it('protects chain-scoped models exactly as well as their parent', async () => {
    // These have no userId column; their whole protection is the relation
    // chain, so a wrong relation name would silently allow everything.
    const { theirs } = await twoWorlds()
    for (const model of [
      'process',
      'processStep',
      'processEdge',
      'competitorNewsItem',
      'jtbdSequenceEdge',
      'productTeamMember',
    ] as OwnedModel[]) {
      expect(await isOwned(model, theirs[model], DEFAULT_USER_ID), model).toBe(false)
    }
  })
})

describe('denyUnowned', () => {
  it('returns nothing when the record is mine', async () => {
    const { mine } = await twoWorlds()
    expect(await denyUnowned('product', mine.product, DEFAULT_USER_ID)).toBeNull()
  })

  it('returns a "not found" error, never a "forbidden" one', async () => {
    // Saying "forbidden" would confirm the id exists — a caller must not be
    // able to enumerate other tenants' ids by reading the error.
    const { theirs } = await twoWorlds()
    expect(await denyUnowned('product', theirs.product, DEFAULT_USER_ID)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })
})
