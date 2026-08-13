// Cross-product metrics for /cpo (plans/platform-views-plan.md §5) — unlike
// lib/dashboard-metrics.ts and lib/team-workload.ts, everything here is
// deliberately NOT scoped to one product; each function aggregates across
// every product the user owns, with a per-product breakdown where the plan
// calls for one.
import { RoadmapStatus, type Stage } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hypothesisStatusOrder, roadmapStatusOrder } from '@/lib/labels'
import { groupByQuarter } from '@/lib/roadmap'
import { buildGanttLayout, type GanttLayout, type GanttSourceItem } from '@/lib/roadmap-gantt'
import {
  coveragePercent,
  getGapsCounts,
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
  department: { id: string; name: string; color: string } | null
  jtbdCoverage: JtbdCoverage
  hypothesisCounts: HypothesisStatusCounts
}

/**
 * Three queries, not 1 + 3×N (plans/2.0-hardening-plan.md, A2).
 *
 * This used to fan out per product — `getJtbdCoverage` (2 counts) and
 * `getHypothesisStatusCounts` (1 groupBy) inside a `products.map`. Measured on
 * 20 seeded products: **61 Prisma operations, 111ms**, growing strictly
 * linearly (151 at 50 products, 301 at 100) on every single load of /cpo.
 *
 * Grouping by `productId` gets the same numbers in a fixed 3 operations. The
 * per-product helpers stay exactly as they are — they are the right shape for
 * a caller that wants one product, and are still used that way elsewhere.
 */
export async function getProductsOverview(userId: string): Promise<ProductOverviewRow[]> {
  const [products, jtbdRows, hypothesisRows] = await Promise.all([
    prisma.product.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        stage: true,
        department: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.jTBD.groupBy({ by: ['productId', 'confirmed'], where: { userId }, _count: true }),
    prisma.hypothesis.groupBy({ by: ['productId', 'status'], where: { userId }, _count: true }),
  ])

  const coverage = new Map<string, { confirmed: number; total: number }>()
  for (const row of jtbdRows) {
    const entry = coverage.get(row.productId) ?? { confirmed: 0, total: 0 }
    entry.total += row._count
    if (row.confirmed) entry.confirmed += row._count
    coverage.set(row.productId, entry)
  }

  const statuses = new Map<string, HypothesisStatusCounts>()
  for (const row of hypothesisRows) {
    const entry = statuses.get(row.productId) ?? emptyHypothesisCounts()
    entry[row.status] = row._count
    statuses.set(row.productId, entry)
  }

  return products.map((product) => {
    // A product with no JTBD/hypotheses produces no groupBy rows at all, so
    // the zero case has to come from here rather than from the query.
    const { confirmed, total } = coverage.get(product.id) ?? { confirmed: 0, total: 0 }
    return {
      ...product,
      // Same helper the per-product path uses, so the rounding cannot drift
      // between the two.
      jtbdCoverage: { confirmed, total, percent: coveragePercent(confirmed, total) },
      hypothesisCounts: statuses.get(product.id) ?? emptyHypothesisCounts(),
    }
  })
}

function emptyHypothesisCounts(): HypothesisStatusCounts {
  return Object.fromEntries(hypothesisStatusOrder.map((s) => [s, 0])) as HypothesisStatusCounts
}

// Same fallback-sorts-last convention as lib/roadmap-gantt.ts's own
// NO_TRACK_GROUP_LABEL — a product without a department still shows up,
// just grouped last instead of silently dropped.
export const NO_DEPARTMENT_LABEL = 'Без департамента'

export interface ProductGroup {
  department: { id: string; name: string; color: string } | null
  products: ProductOverviewRow[]
}

// §10: groups the products overview by department for display — purely a
// view concern (the rows themselves are unchanged), same "group in the
// page, compute in the lib" split as groupByQuarter.
export function groupByDepartment(products: ProductOverviewRow[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>()
  for (const product of products) {
    const key = product.department?.id ?? ''
    if (!groups.has(key)) groups.set(key, { department: product.department, products: [] })
    groups.get(key)!.products.push(product)
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (!a.department) return 1
    if (!b.department) return -1
    return a.department.name.localeCompare(b.department.name, 'ru')
  })
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
    const counts = Object.fromEntries(roadmapStatusOrder.map((status) => [status, 0])) as Record<
      RoadmapStatus,
      number
    >
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

// §10: the same Gantt renderer as /pm's single-product view
// (lib/roadmap-gantt.ts's buildGanttLayout), just fed a different grouping —
// block = department, track = product, instead of a product's own
// trackGroup/track lanes. Reusing buildGanttLayout as-is (rather than a
// parallel implementation) because it already groups/sorts/pads a date range
// from any trackGroup+track pair; it doesn't know or care that the "track"
// here is a whole product rather than a lane inside one.
export async function getMultiProductGanttLayout(userId: string): Promise<GanttLayout> {
  const items = await prisma.roadmapItem.findMany({
    where: { userId },
    include: { product: { select: { name: true, department: { select: { name: true } } } } },
  })

  const sourceItems: GanttSourceItem[] = items.map((item) => ({
    id: item.id,
    // A milestone's vertical line spans every track at once, so unlike a
    // bar (already disambiguated by its track/product row) its label needs
    // the product name too, or it reads as ambiguous across products.
    title: item.isMilestone ? `${item.title} (${item.product.name})` : item.title,
    status: item.status,
    trackGroup: item.product.department?.name ?? null,
    track: item.product.name,
    startDate: item.startDate,
    endDate: item.endDate,
    isMilestone: item.isMilestone,
  }))

  return buildGanttLayout(sourceItems)
}
