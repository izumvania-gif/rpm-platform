import { beforeEach, describe, expect, it } from 'vitest'
import {
  createInsight,
  createInsightQuick,
  deleteInsight,
  toggleInsightPinned,
  updateInsight,
  updateInsightField,
} from '@/lib/actions/insights'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createInsight', () => {
  it('creates an insight with all four optional relations set at once', async () => {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: {
        name: 'S',
        slug: 's',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const research = await prisma.research.create({
      data: {
        title: 'R',
        date: new Date(),
        type: 'MANUAL',
        productId: product.id,
        userId: product.userId,
      },
    })
    const conversation = await prisma.conversation.create({
      data: { title: 'Conv', date: new Date(), productId: product.id, userId: product.userId },
    })

    const formData = buildFormData({
      text: '"We just want it to be faster"',
      tags: 'speed',
      productId: product.id,
      segmentId: segment.id,
      jtbdId: jtbd.id,
      researchId: research.id,
      conversationId: conversation.id,
    })
    const redirectPath = await captureRedirect(() => createInsight(formData))
    const id = redirectPath.split('/').pop()!
    const insight = await prisma.insight.findUnique({ where: { id } })
    expect(insight).toMatchObject({
      segmentId: segment.id,
      jtbdId: jtbd.id,
      researchId: research.id,
      conversationId: conversation.id,
    })
  })

  it('allows creating an insight with none of the four relations set', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({ text: 'Standalone insight', productId: product.id })
    const redirectPath = await captureRedirect(() => createInsight(formData))
    expect(redirectPath).toMatch(/^\/insights\//)
  })
})

describe('updateInsight / deleteInsight / toggleInsightPinned', () => {
  it('updates an insight', async () => {
    const product = await createTestProduct()
    const insight = await prisma.insight.create({
      data: { text: 'Old', productId: product.id, userId: product.userId },
    })
    const formData = buildFormData({ text: 'New', productId: product.id })
    await captureRedirect(() => updateInsight(insight.id, formData))
    expect((await prisma.insight.findUnique({ where: { id: insight.id } }))?.text).toBe('New')
  })

  it('deletes an insight', async () => {
    const product = await createTestProduct()
    const insight = await prisma.insight.create({
      data: { text: 'Del', productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteInsight(insight.id))
    expect(redirectPath).toBe('/insights')
    expect(await prisma.insight.findUnique({ where: { id: insight.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const insight = await prisma.insight.create({
      data: { text: 'Pin', productId: product.id, userId: product.userId },
    })
    await toggleInsightPinned(insight.id, true)
    expect((await prisma.insight.findUnique({ where: { id: insight.id } }))?.pinned).toBe(true)
  })
})

describe('createInsightQuick / updateInsightField', () => {
  it('creates an insight without a form', async () => {
    const product = await createTestProduct()
    const result = await createInsightQuick(product.id, 'Quick insight')
    expect(result.ok).toBe(true)
  })

  it('rejects an empty text inline', async () => {
    const product = await createTestProduct()
    const insight = await prisma.insight.create({
      data: { text: 'T', productId: product.id, userId: product.userId },
    })
    const result = await updateInsightField(insight.id, 'text', '   ')
    expect(result.ok).toBe(false)
  })
})
