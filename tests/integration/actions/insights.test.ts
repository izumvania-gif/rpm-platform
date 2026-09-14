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

describe('updateInsightField: relations and stance (фаза 24 плана 2.4)', () => {
  async function seed() {
    const product = await createTestProduct()
    const [insight, jtbd, hypothesis] = await Promise.all([
      prisma.insight.create({
        data: { text: 'Ждём выпуск неделю', productId: product.id, userId: product.userId },
      }),
      prisma.jTBD.create({
        data: {
          title: 'Когда истекает сертификат, я хочу продлить его сам',
          category: 'Выпуск',
          productId: product.id,
          userId: product.userId,
        },
      }),
      prisma.hypothesis.create({
        data: {
          statement: 'Если продлевать самому, отток упадёт',
          productId: product.id,
          userId: product.userId,
        },
      }),
    ])
    return { product, insight, jtbd, hypothesis }
  }

  it('links a job and a hypothesis, and records a stance', async () => {
    const { insight, jtbd, hypothesis } = await seed()
    expect(await updateInsightField(insight.id, 'jtbdId', jtbd.id)).toEqual({ ok: true })
    expect(await updateInsightField(insight.id, 'hypothesisId', hypothesis.id)).toEqual({
      ok: true,
    })
    expect(await updateInsightField(insight.id, 'stance', 'SUPPORTS')).toEqual({ ok: true })
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })
    expect(row.jtbdId).toBe(jtbd.id)
    expect(row.hypothesisId).toBe(hypothesis.id)
    expect(row.stance).toBe('SUPPORTS')
  })

  it('clearing the hypothesis also clears the stance', async () => {
    const { insight, hypothesis } = await seed()
    await updateInsightField(insight.id, 'hypothesisId', hypothesis.id)
    await updateInsightField(insight.id, 'stance', 'CONTRADICTS')
    expect(await updateInsightField(insight.id, 'hypothesisId', '')).toEqual({ ok: true })
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })
    expect(row.hypothesisId).toBeNull()
    // Голос «против» без гипотезы, против которой он подан, — мусор в балансе
    // следующей привязки.
    expect(row.stance).toBeNull()
  })

  it('refuses a stance outside the enum and accepts an empty one as null', async () => {
    const { insight } = await seed()
    expect((await updateInsightField(insight.id, 'stance', 'MAYBE')).ok).toBe(false)
    expect(await updateInsightField(insight.id, 'stance', '')).toEqual({ ok: true })
  })

  it('refuses a record from another product', async () => {
    const { insight } = await seed()
    const otherProduct = await createTestProduct({ slug: `other-${Date.now()}` })
    const foreignJtbd = await prisma.jTBD.create({
      data: {
        title: 'Чужая задача',
        category: 'X',
        productId: otherProduct.id,
        userId: otherProduct.userId,
      },
    })
    const result = await updateInsightField(insight.id, 'jtbdId', foreignJtbd.id)
    expect(result.ok).toBe(false)
    expect(
      (await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })).jtbdId
    ).toBeNull()
  })

  it('refuses a record from another tenant', async () => {
    const { insight } = await seed()
    const other = await prisma.user.create({
      data: { email: `other-insight-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: `chuzhoy-insight-${Date.now()}`, userId: other.id },
    })
    const foreignSegment = await prisma.segment.create({
      data: {
        name: 'Чужой сегмент',
        slug: 'chuzhoy',
        productId: otherProduct.id,
        userId: other.id,
      },
    })
    const result = await updateInsightField(insight.id, 'segmentId', foreignSegment.id)
    expect(result.ok).toBe(false)
    expect(
      (await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })).segmentId
    ).toBeNull()
  })
})
