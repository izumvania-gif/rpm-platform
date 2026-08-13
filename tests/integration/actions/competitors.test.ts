import { beforeEach, describe, expect, it } from 'vitest'
import {
  createCompetitor,
  createCompetitorQuick,
  deleteCompetitor,
  toggleCompetitorPinned,
  updateCompetitor,
  updateCompetitorField,
} from '@/lib/actions/competitors'
import { createCompetitorNewsItem, deleteCompetitorNewsItem } from '@/lib/actions/competitor-news'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createCompetitor', () => {
  it('creates a competitor with a features list and extra attributes', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      name: 'Acme Corp',
      url: 'https://acme.example',
      positioning: 'Cheaper but less flexible',
      features: 'feature-a, feature-b',
      pricingModel: 'Per seat',
      companySize: 'Series B',
      productId: product.id,
    })

    const redirectPath = await captureRedirect(() => createCompetitor(formData))
    const id = redirectPath.split('/').pop()!
    const competitor = await prisma.competitor.findUnique({ where: { id } })
    expect(competitor).toMatchObject({
      name: 'Acme Corp',
      features: ['feature-a', 'feature-b'],
      pricingModel: 'Per seat',
    })
  })
})

describe('updateCompetitor / deleteCompetitor / toggleCompetitorPinned', () => {
  it('updates a competitor', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'Old', features: [], productId: product.id, userId: product.userId },
    })
    const formData = buildFormData({ name: 'New', productId: product.id })
    await captureRedirect(() => updateCompetitor(competitor.id, formData))
    expect((await prisma.competitor.findUnique({ where: { id: competitor.id } }))?.name).toBe('New')
  })

  it('deletes a competitor along with its news log (cascade)', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'Del', features: [], productId: product.id, userId: product.userId },
    })
    await prisma.competitorNewsItem.create({ data: { title: 'News', competitorId: competitor.id } })

    const redirectPath = await captureRedirect(() => deleteCompetitor(competitor.id))
    expect(redirectPath).toBe('/competitors')
    expect(await prisma.competitorNewsItem.count({ where: { competitorId: competitor.id } })).toBe(
      0
    )
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'Pin', features: [], productId: product.id, userId: product.userId },
    })
    await toggleCompetitorPinned(competitor.id, true)
    expect((await prisma.competitor.findUnique({ where: { id: competitor.id } }))?.pinned).toBe(
      true
    )
  })
})

describe('createCompetitorQuick', () => {
  it('creates a competitor without a form', async () => {
    const product = await createTestProduct()
    const result = await createCompetitorQuick(product.id, 'Quick Competitor', 'Fast follower')
    expect(result.ok).toBe(true)
  })
})

describe('updateCompetitorField', () => {
  it('sets lastCheckedAt and clears it', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'C', features: [], productId: product.id, userId: product.userId },
    })

    let result = await updateCompetitorField(competitor.id, 'lastCheckedAt', '2026-08-01')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.competitor.findUnique({ where: { id: competitor.id } }))?.lastCheckedAt
    ).not.toBeNull()

    result = await updateCompetitorField(competitor.id, 'lastCheckedAt', '')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.competitor.findUnique({ where: { id: competitor.id } }))?.lastCheckedAt
    ).toBeNull()
  })

  it('rejects an invalid lastCheckedAt', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'C', features: [], productId: product.id, userId: product.userId },
    })
    const result = await updateCompetitorField(competitor.id, 'lastCheckedAt', 'not-a-date')
    expect(result.ok).toBe(false)
  })
})

describe('competitor news log', () => {
  it('adds and removes a news item, scoped to its competitor', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'C', features: [], productId: product.id, userId: product.userId },
    })

    const created = await createCompetitorNewsItem(
      competitor.id,
      'Raised Series C',
      'https://news.example',
      '2026-08-01',
      'Worth watching'
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(await prisma.competitorNewsItem.count({ where: { competitorId: competitor.id } })).toBe(
      1
    )
    await deleteCompetitorNewsItem(created.item.id, competitor.id)
    expect(await prisma.competitorNewsItem.count({ where: { competitorId: competitor.id } })).toBe(
      0
    )
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const competitor = await prisma.competitor.create({
      data: { name: 'C', features: [], productId: product.id, userId: product.userId },
    })
    const result = await createCompetitorNewsItem(competitor.id, '  ')
    expect(result.ok).toBe(false)
  })
})
