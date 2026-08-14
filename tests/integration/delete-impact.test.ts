import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { getDeleteImpact } from '@/lib/actions/delete-impact'
import { NOT_OWNED_ERROR } from '@/lib/ownership'
import type { ImpactCount, ImpactKey } from '@/lib/delete-impact'
import { createTestProduct, ensureTestUser } from './helpers'

// The counting half of the delete dialog (plans/2.0-hardening-plan.md, B4).
//
// The numbers are the whole point of the feature: a dialog that says «будет
// удалено 3 сегмента» when it is about to delete nine is worse than the
// `confirm()` it replaced, because it looks like it checked.

beforeEach(ensureTestUser)

function get(counts: ImpactCount[], key: ImpactKey): number {
  return counts.find((c) => c.key === key)?.count ?? 0
}

async function impactOf(model: Parameters<typeof getDeleteImpact>[0], id: string) {
  const res = await getDeleteImpact(model, id)
  if (!res.ok) throw new Error(`Expected an impact, got: ${res.error}`)
  return res.impact
}

describe('getDeleteImpact — product', () => {
  it('counts direct children and the grandchildren the cascade also takes', async () => {
    const product = await createTestProduct()
    const p = { productId: product.id, userId: DEFAULT_USER_ID }

    await prisma.segment.create({ data: { name: 'С', slug: `s-${Date.now()}`, tags: [], ...p } })
    const jtbdA = await prisma.jTBD.create({ data: { title: 'A', category: 'к', tags: [], ...p } })
    const jtbdB = await prisma.jTBD.create({ data: { title: 'Б', category: 'к', tags: [], ...p } })
    const hypothesis = await prisma.hypothesis.create({ data: { statement: 'Г', tags: [], ...p } })
    const competitor = await prisma.competitor.create({ data: { name: 'К', features: [], ...p } })
    const process = await prisma.process.create({ data: { title: 'П', productId: product.id } })
    const stepA = await prisma.processStep.create({
      data: { title: 'Ш1', processId: process.id, x: 0, y: 0 },
    })
    const stepB = await prisma.processStep.create({
      data: { title: 'Ш2', processId: process.id, x: 0, y: 0 },
    })

    // Grandchildren: invisible in Product's own relations, deleted anyway.
    await prisma.hypothesisStatusChange.create({
      data: { hypothesisId: hypothesis.id, status: 'IN_REVIEW' },
    })
    await prisma.competitorNewsItem.create({
      data: { title: 'Н', date: new Date(), competitorId: competitor.id },
    })
    await prisma.jtbdSequenceEdge.create({ data: { fromJtbdId: jtbdA.id, toJtbdId: jtbdB.id } })
    await prisma.processEdge.create({ data: { fromStepId: stepA.id, toStepId: stepB.id } })

    const impact = await impactOf('product', product.id)

    expect(get(impact.deleted, 'segment')).toBe(1)
    expect(get(impact.deleted, 'jtbd')).toBe(2)
    expect(get(impact.deleted, 'hypothesis')).toBe(1)
    expect(get(impact.deleted, 'competitor')).toBe(1)
    expect(get(impact.deleted, 'process')).toBe(1)
    expect(get(impact.deleted, 'processStep')).toBe(2)
    expect(get(impact.deleted, 'processEdge')).toBe(1)
    expect(get(impact.deleted, 'competitorNews')).toBe(1)
    expect(get(impact.deleted, 'statusChange')).toBe(1)
    expect(get(impact.deleted, 'sequenceEdge')).toBe(1)
    // Nothing outside the product survives it, so there is no "unlinked" half.
    expect(impact.unlinked).toEqual([])

    // The counts are not just plausible — they are what the cascade removes.
    const before = await prisma.segment.count()
    await prisma.product.delete({ where: { id: product.id } })
    expect(await prisma.segment.count()).toBe(before - get(impact.deleted, 'segment'))
    expect(await prisma.processEdge.count()).toBe(0)
    expect(await prisma.hypothesisStatusChange.count()).toBe(0)
  })

  it('drops the zero rows instead of listing every empty module', async () => {
    const product = await createTestProduct()
    await prisma.segment.create({
      data: {
        name: 'С',
        slug: `s-${Date.now()}`,
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const impact = await impactOf('product', product.id)
    expect(impact.deleted.map((c) => c.key)).toEqual(['segment'])
  })
})

describe('getDeleteImpact — what survives but loses a link', () => {
  it('reports a segment as unlinking, never as deleting', async () => {
    const product = await createTestProduct()
    const p = { productId: product.id, userId: DEFAULT_USER_ID }
    const segment = await prisma.segment.create({
      data: { name: 'С', slug: `s-${Date.now()}`, tags: [], ...p },
    })
    await prisma.hypothesis.create({
      data: { statement: 'Г', tags: [], segmentId: segment.id, ...p },
    })
    await prisma.conversation.create({
      data: { title: 'Р', date: new Date(), tags: [], segmentId: segment.id, ...p },
    })
    await prisma.jTBD.create({
      data: {
        title: 'З',
        category: 'к',
        tags: [],
        segments: { connect: { id: segment.id } },
        ...p,
      },
    })

    const impact = await impactOf('segment', segment.id)

    expect(impact.deleted).toEqual([])
    expect(get(impact.unlinked, 'hypothesis')).toBe(1)
    expect(get(impact.unlinked, 'conversation')).toBe(1)
    expect(get(impact.unlinked, 'jtbd')).toBe(1)

    // SetNull, not cascade — the hypothesis is still there afterwards.
    await prisma.segment.delete({ where: { id: segment.id } })
    expect(await prisma.hypothesis.count()).toBe(1)
  })

  it('counts a JTBD sequence edge from either end', async () => {
    const product = await createTestProduct()
    const p = { productId: product.id, userId: DEFAULT_USER_ID }
    const from = await prisma.jTBD.create({ data: { title: 'A', category: 'к', tags: [], ...p } })
    const to = await prisma.jTBD.create({ data: { title: 'Б', category: 'к', tags: [], ...p } })
    await prisma.jtbdSequenceEdge.create({ data: { fromJtbdId: from.id, toJtbdId: to.id } })

    // The edge cascades whichever node goes; counting only `fromJtbdId` would
    // silently promise "ничего не удалится" for the other one.
    expect(get((await impactOf('jtbd', from.id)).deleted, 'sequenceEdge')).toBe(1)
    expect(get((await impactOf('jtbd', to.id)).deleted, 'sequenceEdge')).toBe(1)
  })

  it('separates a person’s roster rows from the records that merely lose them', async () => {
    const person = await prisma.person.create({ data: { name: 'Ч', userId: DEFAULT_USER_ID } })
    const product = await createTestProduct()
    await prisma.product.update({ where: { id: product.id }, data: { ownerId: person.id } })
    await prisma.productTeamMember.create({
      data: { productId: product.id, personId: person.id },
    })
    await prisma.roadmapItem.create({
      data: { title: 'РИ', productId: product.id, userId: DEFAULT_USER_ID, ownerId: person.id },
    })

    const impact = await impactOf('person', person.id)

    expect(get(impact.deleted, 'teamMember')).toBe(1)
    expect(get(impact.unlinked, 'product')).toBe(1)
    expect(get(impact.unlinked, 'roadmapItem')).toBe(1)
  })
})

describe('getDeleteImpact — edges', () => {
  it('returns an empty impact for a model with no dependants', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: { title: 'РИ', productId: product.id, userId: DEFAULT_USER_ID },
    })

    // Not an error and not a guess — «Связанных записей нет» is the answer.
    expect(await getDeleteImpact('roadmapItem', item.id)).toEqual({
      ok: true,
      impact: { deleted: [], unlinked: [] },
    })
  })

  it('refuses another user’s record with the same "not found" as the mutations', async () => {
    const them = await prisma.user.create({
      data: { email: `other-impact-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const theirProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: `foreign-${Date.now()}`, userId: them.id },
    })
    await prisma.segment.create({
      data: {
        name: 'С',
        slug: `fs-${Date.now()}`,
        tags: [],
        productId: theirProduct.id,
        userId: them.id,
      },
    })

    // Read-only, but still an oracle: without the guard this would answer
    // "exists, and has 1 segment" about a record from another tenant.
    expect(await getDeleteImpact('product', theirProduct.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })

  it('refuses an id that does not exist', async () => {
    expect(await getDeleteImpact('product', 'no-such-id')).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })
})
