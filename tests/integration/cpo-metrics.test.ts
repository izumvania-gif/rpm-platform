import { beforeEach, describe, expect, it } from 'vitest'
import { RoadmapStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  getCrossProductGaps,
  getEcosystemCorrelations,
  getMultiProductGanttLayout,
  getMultiProductRoadmap,
  getProductsOverview,
  getRoadmapStatusByProduct,
  getStuckRoadmapItems,
  groupByDepartment,
  NO_DEPARTMENT_LABEL,
  type ProductOverviewRow,
} from '@/lib/cpo-metrics'
import { createTestProduct, ensureTestUser } from './helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

const DAY_MS = 24 * 60 * 60 * 1000

describe('getProductsOverview', () => {
  // Batched into 3 groupBy-based queries (plans/2.0-hardening-plan.md, A2).
  // These pin the cases the per-product loop got for free and a groupBy does
  // not: a product with nothing attached produces no rows at all.
  it('returns zeroed counts for a product with no JTBD and no hypotheses', async () => {
    const product = await createTestProduct({ name: 'Пустой' })
    const [row] = await getProductsOverview(product.userId)

    expect(row.jtbdCoverage).toEqual({ confirmed: 0, total: 0, percent: 0 })
    expect(Object.values(row.hypothesisCounts).every((n) => n === 0)).toBe(true)
    // Every status key is present, not just the ones with rows — the UI reads
    // them positionally.
    expect(Object.keys(row.hypothesisCounts).sort()).toEqual(
      ['CONFIRMED', 'DRAFT', 'IN_REVIEW', 'REJECTED'].sort()
    )
  })

  it('keeps each product’s counts to itself when several exist', async () => {
    // The bug a groupBy rewrite can plausibly introduce: rows landing on the
    // wrong product, which a single-product test would never catch.
    const a = await createTestProduct({ name: 'A', slug: `a-${Date.now()}` })
    const b = await createTestProduct({ name: 'B', slug: `b-${Date.now()}` })
    await prisma.jTBD.create({
      data: { title: 'A1', category: 'C', confirmed: true, productId: a.id, userId: a.userId },
    })
    await prisma.jTBD.create({
      data: { title: 'B1', category: 'C', confirmed: false, productId: b.id, userId: b.userId },
    })
    await prisma.jTBD.create({
      data: { title: 'B2', category: 'C', confirmed: false, productId: b.id, userId: b.userId },
    })
    await prisma.hypothesis.create({
      data: { statement: 'HB', status: 'IN_REVIEW', productId: b.id, userId: b.userId },
    })

    const rows = await getProductsOverview(a.userId)
    const rowA = rows.find((r) => r.id === a.id)!
    const rowB = rows.find((r) => r.id === b.id)!

    expect(rowA.jtbdCoverage).toEqual({ confirmed: 1, total: 1, percent: 100 })
    expect(rowB.jtbdCoverage).toEqual({ confirmed: 0, total: 2, percent: 0 })
    expect(rowA.hypothesisCounts.IN_REVIEW).toBe(0)
    expect(rowB.hypothesisCounts.IN_REVIEW).toBe(1)
  })

  it('excludes another user’s records from the counts', async () => {
    const mine = await createTestProduct({ name: 'Мой' })
    const other = await prisma.user.create({
      data: { email: `other-overview-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Чужой', slug: `foreign-ov-${Date.now()}`, userId: other.id },
    })
    await prisma.jTBD.create({
      data: { title: 'F', category: 'C', confirmed: true, productId: foreign.id, userId: other.id },
    })

    const rows = await getProductsOverview(mine.userId)
    expect(rows.map((r) => r.id)).toEqual([mine.id])
    expect(rows[0].jtbdCoverage.total).toBe(0)
  })

  it('returns JTBD coverage and hypothesis counts per product', async () => {
    const product = await createTestProduct({ name: 'A' })
    await prisma.jTBD.create({
      data: {
        title: 'T1',
        category: 'C',
        confirmed: true,
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.jTBD.create({
      data: {
        title: 'T2',
        category: 'C',
        confirmed: false,
        productId: product.id,
        userId: product.userId,
      },
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
      data: {
        name: 'Enterprise',
        slug: 'ent-a',
        color: '#3B82F6',
        tags: [],
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.segment.create({
      data: {
        name: 'Enterprise',
        slug: 'ent-b',
        color: '#3B82F6',
        tags: [],
        productId: productB.id,
        userId: productB.userId,
      },
    })
    await prisma.segment.create({
      data: {
        name: 'Only in A',
        slug: 'only-a',
        color: '#3B82F6',
        tags: [],
        productId: productA.id,
        userId: productA.userId,
      },
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
      data: {
        title: 'T1',
        category: 'Onboarding',
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.jTBD.create({
      data: {
        title: 'T2',
        category: 'Onboarding',
        productId: productB.id,
        userId: productB.userId,
      },
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
      data: {
        title: 'Unconfirmed',
        category: 'C',
        confirmed: false,
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.segment.create({
      data: {
        name: 'Uncovered',
        slug: 'uncovered',
        color: '#3B82F6',
        tags: [],
        productId: productB.id,
        userId: productB.userId,
      },
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

describe('groupByDepartment', () => {
  it('groups products by department, sorted alphabetically with no-department last', () => {
    const baseRow = {
      name: '',
      stage: 'IDEA' as const,
      jtbdCoverage: { confirmed: 0, total: 0, percent: 0 },
      hypothesisCounts: { DRAFT: 0, IN_REVIEW: 0, CONFIRMED: 0, REJECTED: 0 },
    }
    const rows: ProductOverviewRow[] = [
      { ...baseRow, id: 'p1', department: { id: '2', name: 'Zeta', color: '#000' } },
      { ...baseRow, id: 'p2', department: null },
      { ...baseRow, id: 'p3', department: { id: '1', name: 'Alpha', color: '#000' } },
      { ...baseRow, id: 'p4', department: { id: '1', name: 'Alpha', color: '#000' } },
    ]

    const groups = groupByDepartment(rows)
    expect(groups.map((g) => g.department?.name ?? NO_DEPARTMENT_LABEL)).toEqual([
      'Alpha',
      'Zeta',
      NO_DEPARTMENT_LABEL,
    ])
    expect(groups[0].products).toHaveLength(2)
  })
})

describe('getMultiProductGanttLayout', () => {
  it('groups dated roadmap items by department -> product, suffixes milestone titles with the product name', async () => {
    const department = await prisma.department.create({
      data: { name: 'MFA-продукты', userId: DEFAULT_USER_ID },
    })
    const productA = await createTestProduct({ name: 'A' })
    await prisma.product.update({
      where: { id: productA.id },
      data: { departmentId: department.id },
    })
    const productB = await createTestProduct({ name: 'B' })

    await prisma.roadmapItem.create({
      data: {
        title: 'Bar in A',
        status: RoadmapStatus.PLANNED,
        visibility: 'INTERNAL',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-10'),
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'v2.0',
        status: RoadmapStatus.PLANNED,
        visibility: 'INTERNAL',
        isMilestone: true,
        startDate: new Date('2026-09-05'),
        productId: productB.id,
        userId: productB.userId,
      },
    })

    const layout = await getMultiProductGanttLayout(productA.userId)
    const group = layout.groups.find((g) => g.group === 'MFA-продукты')!
    expect(group).toBeDefined()
    const track = group.tracks.find((t) => t.track === 'A')!
    expect(track.bars.map((b) => b.title)).toEqual(['Bar in A'])
    expect(layout.milestones[0].title).toBe(`v2.0 (${productB.name})`)
  })
})
