// Cross-product metrics for /cpo (plans/platform-views-plan.md §5) — unlike
// lib/dashboard-metrics.ts and lib/team-workload.ts, everything here is
// deliberately NOT scoped to one product; each function aggregates across
// every product the user owns, with a per-product breakdown where the plan
// calls for one.
import { RoadmapStatus, type Stage } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { roadmapStatusOrder } from '@/lib/labels'
import { groupByQuarter } from '@/lib/roadmap'
import {
  getGapsCounts,
  getHypothesisStatusCounts,
  getJtbdCoverage,
  getProductsWithoutRecentResearch,
  getSegmentsWithoutJtbd,
  getStuckHypotheses,
  getUnconfirmedJtbds,
  type GapsCounts,
  type HypothesisStatusCounts,
  type JtbdCoverage,
} from '@/lib/dashboard-metrics'

export interface ProductOverviewRow {
  id: string
  name: string
  stage: Stage
  jtbdCoverage: JtbdCoverage
  hypothesisCounts: HypothesisStatusCounts
}

export async function getProductsOverview(userId: string): Promise<ProductOverviewRow[]> {
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, stage: true },
  })
  return Promise.all(
    products.map(async (product) => {
      const [jtbdCoverage, hypothesisCounts] = await Promise.all([
        getJtbdCoverage(userId, product.id),
        getHypothesisStatusCounts(userId, product.id),
      ])
      return { ...product, jtbdCoverage, hypothesisCounts }
    })
  )
}

export interface EcosystemGroup {
  key: string
  products: { id: string; name: string }[]
}

function groupCrossProduct<T extends { product: { id: string; name: string } }>(
  rows: T[],
  keyOf: (row: T) => string
): EcosystemGroup[] {
  const groups = new Map<string, Map<string, { id: string; name: string }>>()
  for (const row of rows) {
    const key = keyOf(row).trim()
    if (!key) continue
    if (!groups.has(key)) groups.set(key, new Map())
    groups.get(key)!.set(row.product.id, row.product)
  }
  return Array.from(groups.entries())
    .map(([key, productsById]) => ({ key, products: Array.from(productsById.values()) }))
    .filter((group) => group.products.length > 1)
    .sort((a, b) => b.products.length - a.products.length)
}

export interface EcosystemCorrelations {
  segmentGroups: EcosystemGroup[]
  jtbdCategoryGroups: EcosystemGroup[]
}

// Exact-match on Segment.name / JTBD.category — a deliberately blunt first
// pass (see the plan's §5 open question): different PMs may name the same
// segment differently, so this under-reports rather than over-reports.
// Fuzzy matching (shared tags, string similarity) is a possible follow-up
// once this proves the idea is useful — not built ahead of that signal.
export async function getEcosystemCorrelations(userId: string): Promise<EcosystemCorrelations> {
  const [segments, jtbds] = await Promise.all([
    prisma.segment.findMany({
      where: { userId },
      select: { name: true, product: { select: { id: true, name: true } } },
    }),
    prisma.jTBD.findMany({
      where: { userId },
      select: { category: true, product: { select: { id: true, name: true } } },
    }),
  ])
  return {
    segmentGroups: groupCrossProduct(segments, (s) => s.name),
    jtbdCategoryGroups: groupCrossProduct(jtbds, (j) => j.category),
  }
}

export interface ProductGapsRow {
  product: { id: string; name: string }
  unconfirmedJtbds: number
  segmentsWithoutJtbd: number
  stuckHypotheses: number
  staleResearch: boolean
}

export interface CrossProductGaps {
  totals: GapsCounts
  byProduct: ProductGapsRow[]
}

// Same 4 underlying queries as the single-product /reports/gaps dashboard
// (lib/dashboard-metrics.ts) — none of them filter by product today, so
// this just re-groups their existing results by product instead of firing
// new queries.
export async function getCrossProductGaps(userId: string): Promise<CrossProductGaps> {
  const [totals, unconfirmedJtbds, segmentsWithoutJtbd, stuckHypotheses, staleProducts] =
    await Promise.all([
      getGapsCounts(userId),
      getUnconfirmedJtbds(userId),
      getSegmentsWithoutJtbd(userId),
      getStuckHypotheses(userId),
      getProductsWithoutRecentResearch(userId),
    ])

  const byProductMap = new Map<string, ProductGapsRow>()
  function ensure(product: { id: string; name: string }): ProductGapsRow {
    let row = byProductMap.get(product.id)
    if (!row) {
      row = {
        product,
        unconfirmedJtbds: 0,
        segmentsWithoutJtbd: 0,
        stuckHypotheses: 0,
        staleResearch: false,
      }
      byProductMap.set(product.id, row)
    }
    return row
  }
  for (const jtbd of unconfirmedJtbds) ensure(jtbd.product).unconfirmedJtbds++
  for (const segment of segmentsWithoutJtbd) ensure(segment.product).segmentsWithoutJtbd++
  for (const hypothesis of stuckHypotheses) ensure(hypothesis.product).stuckHypotheses++
  for (const product of staleProducts) ensure(product).staleResearch = true

  const byProduct = Array.from(byProductMap.values()).sort(
    (a, b) =>
      b.unconfirmedJtbds +
      b.segmentsWithoutJtbd +
      b.stuckHypotheses -
      (a.unconfirmedJtbds + a.segmentsWithoutJtbd + a.stuckHypotheses)
  )
  return { totals, byProduct }
}

// Roadmap items move on a quarterly cadence, much slower than a hypothesis
// (14-day stuck threshold in lib/dashboard-metrics.ts) — 45 days gives a
// PLANNED item roughly a third of a quarter before flagging it as stalled.
const ROADMAP_STUCK_AFTER_MS = 45 * 24 * 60 * 60 * 1000

export async function getStuckRoadmapItems(userId: string) {
  const cutoff = new Date(Date.now() - ROADMAP_STUCK_AFTER_MS)
  return prisma.roadmapItem.findMany({
    where: { userId, status: RoadmapStatus.PLANNED, createdAt: { lt: cutoff } },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export interface ProductRoadmapRow {
  product: { id: string; name: string }
  counts: Record<RoadmapStatus, number>
  stuckPlanned: number
}

export async function getRoadmapStatusByProduct(userId: string): Promise<ProductRoadmapRow[]> {
  const [grouped, stuckItems] = await Promise.all([
    prisma.roadmapItem.groupBy({
      by: ['productId', 'status'],
      where: { userId },
      _count: true,
    }),
    getStuckRoadmapItems(userId),
  ])
  if (grouped.length === 0) return []

  const products = await prisma.product.findMany({
    where: { userId, id: { in: Array.from(new Set(grouped.map((row) => row.productId))) } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const stuckByProduct = new Map<string, number>()
  for (const item of stuckItems) {
    stuckByProduct.set(item.productId, (stuckByProduct.get(item.productId) ?? 0) + 1)
  }

  return products.map((product) => {
    const counts = Object.fromEntries(
      roadmapStatusOrder.map((status) => [status, 0])
    ) as Record<RoadmapStatus, number>
    for (const row of grouped) {
      if (row.productId === product.id) counts[row.status] = row._count
    }
    return { product, counts, stuckPlanned: stuckByProduct.get(product.id) ?? 0 }
  })
}

export async function getMultiProductRoadmap(userId: string) {
  const items = await prisma.roadmapItem.findMany({
    where: { userId },
    orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
    include: { product: { select: { id: true, name: true } } },
  })
  return groupByQuarter(items)
}
