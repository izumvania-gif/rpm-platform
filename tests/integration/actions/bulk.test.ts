import { beforeEach, describe, expect, it } from 'vitest'
import { createManyQuick } from '@/lib/actions/bulk'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('createManyQuick', () => {
  it('creates one segment per pasted line, with unique slugs', async () => {
    const product = await createTestProduct()
    const result = await createManyQuick(
      'segment',
      product.id,
      'Банки топ-30\nГосзаказчики\nСМБ-интеграторы'
    )
    expect(result).toEqual({ ok: true, created: 3 })

    const segments = await prisma.segment.findMany({ where: { productId: product.id } })
    expect(segments.map((s) => s.name).sort()).toEqual([
      'Банки топ-30',
      'Госзаказчики',
      'СМБ-интеграторы',
    ])
    expect(new Set(segments.map((s) => s.slug)).size).toBe(3)
  })

  it('disambiguates a slug that collides with an existing segment', async () => {
    const product = await createTestProduct()
    await createManyQuick('segment', product.id, 'Банки')
    await createManyQuick('segment', product.id, 'банки!')

    const segments = await prisma.segment.findMany({ where: { productId: product.id } })
    expect(segments).toHaveLength(2)
    expect(new Set(segments.map((s) => s.slug)).size).toBe(2)
  })

  it('strips list markup and skips blanks and duplicates', async () => {
    const product = await createTestProduct()
    const result = await createManyQuick(
      'feature',
      product.id,
      '- Удалённый выпуск\n\n* Массовый отзыв\n1. Удалённый выпуск\n'
    )
    expect(result).toEqual({ ok: true, created: 2 })
    const features = await prisma.feature.findMany({ where: { productId: product.id } })
    expect(features.map((f) => f.name).sort()).toEqual(['Массовый отзыв', 'Удалённый выпуск'])
  })

  it('creates hypotheses in DRAFT so they still go through confirmation', async () => {
    const product = await createTestProduct()
    await createManyQuick('hypothesis', product.id, 'Если убрать визит, онбординг ускорится')
    const hypotheses = await prisma.hypothesis.findMany({ where: { productId: product.id } })
    expect(hypotheses).toHaveLength(1)
    expect(hypotheses[0].status).toBe('DRAFT')
  })

  it('creates insights and competitors', async () => {
    const product = await createTestProduct()
    expect(await createManyQuick('insight', product.id, 'Цитата один\nЦитата два')).toEqual({
      ok: true,
      created: 2,
    })
    expect(await createManyQuick('competitor', product.id, 'КриптоПро')).toEqual({
      ok: true,
      created: 1,
    })
    expect(await prisma.insight.count({ where: { productId: product.id } })).toBe(2)
    expect(await prisma.competitor.count({ where: { productId: product.id } })).toBe(1)
  })

  it('rejects an empty paste', async () => {
    const product = await createTestProduct()
    const result = await createManyQuick('segment', product.id, '   \n\n  ')
    expect(result).toEqual({ ok: false, error: 'Нет ни одной непустой строки' })
    expect(await prisma.segment.count()).toBe(0)
  })

  it('rejects more lines than the per-call cap', async () => {
    const product = await createTestProduct()
    const tooMany = Array.from({ length: 201 }, (_, i) => `Сегмент ${i}`).join('\n')
    const result = await createManyQuick('segment', product.id, tooMany)
    expect(result.ok).toBe(false)
    expect(await prisma.segment.count()).toBe(0)
  })

  it('refuses to write into another user’s product', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-bulk-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreignProduct = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-bulk-${Date.now()}`, userId: otherUser.id },
    })

    const result = await createManyQuick('segment', foreignProduct.id, 'Банки\nГосзаказчики')
    expect(result).toEqual({ ok: false, error: 'Продукт не найден' })
    expect(await prisma.segment.count({ where: { productId: foreignProduct.id } })).toBe(0)
  })

  it('rejects a missing product', async () => {
    expect(await createManyQuick('segment', '', 'Банки')).toEqual({
      ok: false,
      error: 'Укажите продукт',
    })
    expect(DEFAULT_USER_ID).toBeTruthy()
  })
})
