import { beforeEach, describe, expect, it } from 'vitest'
import { createFromInbox } from '@/lib/actions/inbox'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createFromInbox', () => {
  it('creates records of several types from one paste', async () => {
    const product = await createTestProduct()
    const result = await createFromInbox(product.id, [
      { text: 'Банки топ-30', type: 'segment' },
      { text: 'Госзаказчики', type: 'segment' },
      { text: '«Мы не можем ждать неделю»', type: 'insight' },
      { text: 'Если убрать визит, онбординг ускорится', type: 'hypothesis' },
      { text: 'Массовый отзыв доступов', type: 'feature' },
      { text: 'КриптоПро', type: 'competitor' },
    ])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.total).toBe(6)
    expect(result.created).toEqual({
      segment: 2,
      insight: 1,
      hypothesis: 1,
      feature: 1,
      competitor: 1,
    })

    expect(await prisma.segment.count({ where: { productId: product.id } })).toBe(2)
    expect(await prisma.insight.count({ where: { productId: product.id } })).toBe(1)
    expect(await prisma.feature.count({ where: { productId: product.id } })).toBe(1)
    expect(await prisma.competitor.count({ where: { productId: product.id } })).toBe(1)
  })

  it('lands hypotheses in DRAFT so the Inbox does not bypass confirmation', async () => {
    const product = await createTestProduct()
    await createFromInbox(product.id, [{ text: 'Если A, то B', type: 'hypothesis' }])
    const rows = await prisma.hypothesis.findMany({ where: { productId: product.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('DRAFT')
  })

  it('gives colliding segment names distinct slugs', async () => {
    const product = await createTestProduct()
    await createFromInbox(product.id, [
      { text: 'Банки', type: 'segment' },
      { text: 'банки!', type: 'segment' },
    ])
    const segments = await prisma.segment.findMany({ where: { productId: product.id } })
    expect(segments).toHaveLength(2)
    expect(new Set(segments.map((s) => s.slug)).size).toBe(2)
  })

  it('skips blank drafts', async () => {
    const product = await createTestProduct()
    const result = await createFromInbox(product.id, [
      { text: 'Банки', type: 'segment' },
      { text: '   ', type: 'segment' },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.total).toBe(1)
  })

  it('creates only the types present, leaving the rest at zero', async () => {
    const product = await createTestProduct()
    const result = await createFromInbox(product.id, [{ text: 'Только инсайт', type: 'insight' }])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.created).toEqual({
      segment: 0,
      insight: 1,
      hypothesis: 0,
      feature: 0,
      competitor: 0,
    })
  })

  it('rejects an empty submission', async () => {
    const product = await createTestProduct()
    expect(await createFromInbox(product.id, [])).toEqual({ ok: false, error: 'Нечего добавлять' })
    expect(await createFromInbox(product.id, [{ text: '  ', type: 'insight' }])).toEqual({
      ok: false,
      error: 'Нечего добавлять',
    })
  })

  it('rejects a missing product', async () => {
    expect(await createFromInbox('', [{ text: 'x', type: 'insight' }])).toEqual({
      ok: false,
      error: 'Укажите продукт',
    })
  })

  it('refuses to write into another user’s product', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-inbox-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-inbox-${Date.now()}`, userId: otherUser.id },
    })
    const result = await createFromInbox(foreign.id, [{ text: 'Банки', type: 'segment' }])
    expect(result).toEqual({ ok: false, error: 'Продукт не найден' })
    expect(await prisma.segment.count({ where: { productId: foreign.id } })).toBe(0)
  })

  it('rejects more items than the per-call cap', async () => {
    const product = await createTestProduct()
    const many = Array.from({ length: 201 }, (_, i) => ({
      text: `Запись ${i}`,
      type: 'insight' as const,
    }))
    const result = await createFromInbox(product.id, many)
    expect(result.ok).toBe(false)
    expect(await prisma.insight.count()).toBe(0)
  })
})
