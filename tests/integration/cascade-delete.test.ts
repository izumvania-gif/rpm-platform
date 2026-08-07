import { beforeEach, describe, expect, it } from 'vitest'
import { deleteProduct } from '@/lib/actions/products'
import { prisma } from '@/lib/prisma'
import { captureRedirect, createTestProduct, ensureTestUser } from './helpers'

beforeEach(ensureTestUser)

// Manually verified during the 1.0 regression retest (see plans/PROJECT_STATE.md
// history); this automates that check so a future schema change that breaks a
// cascade relation fails CI instead of only being caught by hand.
describe('deleting a product cascades through every related model', () => {
  it('removes segments, JTBD, hypotheses, conversations, competitors, features, RTBs, insights, and resources', async () => {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: { name: 'S', slug: 's', color: '#3B82F6', tags: [], productId: product.id, userId: product.userId },
    })
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const research = await prisma.research.create({
      data: { title: 'R', date: new Date(), type: 'MANUAL', productId: product.id, userId: product.userId },
    })
    const hypothesis = await prisma.hypothesis.create({
      data: {
        statement: 'H',
        status: 'DRAFT',
        productId: product.id,
        userId: product.userId,
        statusChanges: { create: { status: 'DRAFT' } },
      },
    })
    const conversation = await prisma.conversation.create({
      data: { title: 'Conv', date: new Date(), productId: product.id, userId: product.userId },
    })
    const competitor = await prisma.competitor.create({
      data: { name: 'C', features: [], productId: product.id, userId: product.userId },
    })
    await prisma.competitorNewsItem.create({ data: { title: 'News', competitorId: competitor.id } })
    const feature = await prisma.feature.create({
      data: { name: 'F', productId: product.id, userId: product.userId, jtbds: { connect: { id: jtbd.id } } },
    })
    const rtb = await prisma.rTB.create({
      data: { statement: 'RTB', productId: product.id, userId: product.userId },
    })
    const insight = await prisma.insight.create({
      data: { text: 'I', productId: product.id, userId: product.userId, jtbdId: jtbd.id },
    })
    const resource = await prisma.productResource.create({
      data: { title: 'Res', kind: 'OTHER', productId: product.id, userId: product.userId },
    })

    await captureRedirect(() => deleteProduct(product.id))

    expect(await prisma.segment.findUnique({ where: { id: segment.id } })).toBeNull()
    expect(await prisma.jTBD.findUnique({ where: { id: jtbd.id } })).toBeNull()
    expect(await prisma.research.findUnique({ where: { id: research.id } })).toBeNull()
    expect(await prisma.hypothesis.findUnique({ where: { id: hypothesis.id } })).toBeNull()
    expect(
      await prisma.hypothesisStatusChange.count({ where: { hypothesisId: hypothesis.id } })
    ).toBe(0)
    expect(await prisma.conversation.findUnique({ where: { id: conversation.id } })).toBeNull()
    expect(await prisma.competitor.findUnique({ where: { id: competitor.id } })).toBeNull()
    expect(await prisma.competitorNewsItem.count({ where: { competitorId: competitor.id } })).toBe(0)
    expect(await prisma.feature.findUnique({ where: { id: feature.id } })).toBeNull()
    expect(await prisma.rTB.findUnique({ where: { id: rtb.id } })).toBeNull()
    expect(await prisma.insight.findUnique({ where: { id: insight.id } })).toBeNull()
    expect(await prisma.productResource.findUnique({ where: { id: resource.id } })).toBeNull()
  })
})
