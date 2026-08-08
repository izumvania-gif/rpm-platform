import { beforeEach, describe, expect, it } from 'vitest'
import { RoadmapStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  getCrossProductGaps,
  getEcosystemCorrelations,
  getMultiProductRoadmap,
  getProductsOverview,
  getRoadmapStatusByProduct,
  getStuckRoadmapItems,
} from '@/lib/cpo-metrics'
import { createTestProduct, ensureTestUser } from './helpers'

beforeEach(ensureTestUser)

const DAY_MS = 24 * 60 * 60 * 1000

describe('getProductsOverview', () => {
  it('returns JTBD coverage and hypothesis counts per product', async () => {
    const product = await createTestProduct({ name: 'A' })
    await prisma.jTBD.create({
      data: { title: 'T1', category: 'C', confirmed: true, productId: product.id, userId: product.userId },
    })
    await prisma.jTBD.create({
      data: { title: 'T2', category: 'C', confirmed: false, productId: product.id, userId: product.userId },
    })
    await prisma.hypothesis.create({
      data: { statement: 'H1', status: 'DRAFT', productId: product.id, userId: product.userId },
    })

    const result = await getProductsOverview(product.userId)
    const row = result.find((r) => r.id === product.id)!
    expect(row.jtbdCoverage).toEqual({ confirmed: 1, total: 2, percent: 50 })
    expect(row.hypothesisCounts.DRAFT).toBe(1)
  })
})

describe('getEcosystemCorrelations', () => {
  it('groups segments with the same name across 2+ products, excludes single-product names', async () => {
    const productA = await createTestProduct({ name: 'A' })
    const productB = await createTestProduct({ name: 'B' })
    await prisma.segment.create({
      data: { name: 'Enterprise', slug: 'ent-a', color: '#3B82F6', tags: [], productId: productA.id, userId: productA.userId },
    })
    await prisma.segment.create({
      data: { name: 'Enterprise', slug: 'ent-b', color: '#3B82F6', tags: [], productId: productB.id, userId: productB.userId },
    })
    await prisma.segment.create({
      data: { name: 'Only in A', slug: 'only-a', color: '#3B82F6', tags: [], productId: productA.id, userId: productA.userId },
    })

    const result = await getEcosystemCorrelations(productA.userId)
    expect(result.segmentGroups).toHaveLength(1)
    expect(result.segmentGroups[0].key).toBe('Enterprise')
    expect(result.segmentGroups[0].products.map((p) => p.id).sort()).toEqual(
      [productA.id, productB.id].sort()
    )
  })

  it('groups JTBDs with the same category across 2+ products', async () => {
    const productA = await createTestProduct({ name: 'A' })
    const productB = await createTestProduct({ name: 'B' })
    await prisma.jTBD.create({
      data: { title: 'T1', category: 'Onboarding', productId: productA.id, userId: productA.userId },
    })
    await prisma.jTBD.create({
      data: { title: 'T2', category: 'Onboarding', productId: productB.id, userId: productB.userId },
    })

    const result = await getEcosystemCorrelations(productA.userId)
    expect(result.jtbdCategoryGroups).toHaveLength(1)
    expect(result.jtbdCategoryGroups[0].key).toBe('Onboarding')
  })
})

describe('getCrossProductGaps', () => {
  it('attributes each gap to its own product', async () => {
    const productA = await createTestProduct({ name: 'A' })
    const productB = await createTestProduct({ name: 'B' })
    await prisma.jTBD.create({
      data: { title: 'Unconfirmed', category: 'C', confirmed: false, productId: productA.id, userId: productA.userId },
    })
    await prisma.segment.create({
      data: { name: 'Uncovered', slug: 'uncovered', color: '#3B82F6', tags: [], productId: productB.id, userId: productB.userId },
    })

    const result = await getCrossProductGaps(productA.userId)
    const rowA = result.byProduct.find((r) => r.product.id === productA.id)!
    const rowB = result.byProduct.find((r) => r.product.id === productB.id)!
    expect(rowA.unconfirmedJtbds).toBe(1)
    expect(rowA.segmentsWithoutJtbd).toBe(0)
    expect(rowB.segmentsWithoutJtbd).toBe(1)
    expect(result.totals.unconfirmedJtbds).toBe(1)
    expect(result.totals.segmentsWithoutJtbd).toBe(1)
  })
})

describe('getStuckRoadmapItems / getRoadmapStatusByProduct', () => {
  it('flags PLANNED items older than 45 days, excludes recent and non-PLANNED', async () => {
    const product = await createTestProduct()
    const stuck = await prisma.roadmapItem.create({
      data: {
        title: 'Stuck',
        status: RoadmapStatus.PLANNED,
        visibility: 'INTERNAL',
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 60 * DAY_MS),
      },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'Recent planned',
        status: RoadmapStatus.PLANNED,
        visibility: 'INTERNAL',
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 5 * DAY_MS),
      },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'Old but shipped',
        status: RoadmapStatus.SHIPPED,
        visibility: 'INTERNAL',
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 60 * DAY_MS),
      },
    })

    const stuckItems = await getStuckRoadmapItems(product.userId)
    expect(stuckItems.map((i) => i.id)).toEqual([stuck.id])

    const byProduct = await getRoadmapStatusByProduct(product.userId)
    const row = byProduct.find((r) => r.product.id === product.id)!
    expect(row.counts.PLANNED).toBe(2)
    expect(row.counts.SHIPPED).toBe(1)
    expect(row.stuckPlanned).toBe(1)
  })
})

describe('getMultiProductRoadmap', () => {
  it('groups roadmap items from every product by quarter', async () => {
    const productA = await createTestProduct({ name: 'A' })
    const productB = await createTestProduct({ name: 'B' })
    await prisma.roadmapItem.create({
      data: {
        title: 'From A',
        status: RoadmapStatus.PLANNED,
        visibility: 'INTERNAL',
        quarter: '2026 Q4',
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'From B',
        status: RoadmapStatus.PLANNED,
        visibility: 'INTERNAL',
        quarter: '2026 Q4',
        productId: productB.id,
        userId: productB.userId,
      },
    })

    const result = await getMultiProductRoadmap(productA.userId)
    const [quarter, items] = result.find(([q]) => q === '2026 Q4')!
    expect(quarter).toBe('2026 Q4')
    expect(items.map((i) => i.product.name).sort()).toEqual(['A', 'B'])
  })
})
