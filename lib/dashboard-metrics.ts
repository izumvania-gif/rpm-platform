// Shared metrics for the dashboard (plans/dashboard-redesign-plan.md, Фаза 1)
// and /reports/gaps — one source of truth instead of duplicating the same
// Prisma queries in both places.
import { HypothesisStatus } from '@prisma/client'
import { eachMonthOfInterval, format, startOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { prisma } from '@/lib/prisma'
import { isStale } from '@/lib/utils'
import { hypothesisStatusOrder } from '@/lib/labels'

// Hypotheses move through the pipeline faster than research/content gets
// written, so a shorter stuck-threshold than isStale()'s 90 days.
const DRAFT_STUCK_AFTER_MS = 14 * 24 * 60 * 60 * 1000

export async function getUnconfirmedJtbds(userId: string) {
  return prisma.jTBD.findMany({
    where: { userId, confirmed: false },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSegmentsWithoutJtbd(userId: string) {
  return prisma.segment.findMany({
    where: { userId, jtbds: { none: {} } },
    include: { product: true },
    orderBy: { name: 'asc' },
  })
}

export async function getStuckHypotheses(userId: string) {
  const draftCutoff = new Date(Date.now() - DRAFT_STUCK_AFTER_MS)
  return prisma.hypothesis.findMany({
    where: { userId, status: HypothesisStatus.DRAFT, createdAt: { lt: draftCutoff } },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getProductsWithoutRecentResearch(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId },
    include: { researches: { select: { date: true } } },
    orderBy: { name: 'asc' },
  })
  return products.filter((product) => {
    if (product.researches.length === 0) return true
    const latest = product.researches.reduce(
      (max, r) => (r.date > max ? r.date : max),
      product.researches[0].date
    )
    return isStale(latest)
  })
}

export interface JtbdCoverage {
  confirmed: number
  total: number
  percent: number
}

// Pure — shared rounding rule for "share confirmed", usable by a caller that
// already has the counts in memory (e.g. /jtbd, which fetches the full JTBD
// list anyway) without an extra DB round-trip.
export function coveragePercent(confirmed: number, total: number): number {
  return total > 0 ? Math.round((confirmed / total) * 100) : 0
}

// productId optional so callers (e.g. a future per-product widget) can scope
// it. For a caller that doesn't already have the JTBDs in memory.
export async function getJtbdCoverage(userId: string, productId?: string): Promise<JtbdCoverage> {
  const [confirmed, total] = await Promise.all([
    prisma.jTBD.count({ where: { userId, productId, confirmed: true } }),
    prisma.jTBD.count({ where: { userId, productId } }),
  ])
  return { confirmed, total, percent: coveragePercent(confirmed, total) }
}

export type HypothesisStatusCounts = Record<HypothesisStatus, number>

export async function getHypothesisStatusCounts(
  userId: string,
  productId?: string
): Promise<HypothesisStatusCounts> {
  const grouped = await prisma.hypothesis.groupBy({
    by: ['status'],
    where: { userId, productId },
    _count: true,
  })
  const counts = Object.fromEntries(hypothesisStatusOrder.map((s) => [s, 0])) as HypothesisStatusCounts
  for (const row of grouped) counts[row.status] = row._count
  return counts
}

export interface MonthlyResearchCount {
  monthStart: Date
  label: string
  count: number
}

// Last `months` calendar months, oldest first, including the current
// (possibly partial) month — zero-filled so a widget can plot a continuous
// line rather than skip gaps.
export async function getResearchCadence(
  userId: string,
  months = 6,
  productId?: string
): Promise<MonthlyResearchCount[]> {
  const rangeStart = startOfMonth(subMonths(new Date(), months - 1))
  const researches = await prisma.research.findMany({
    where: { userId, productId, date: { gte: rangeStart } },
    select: { date: true },
  })

  const buckets = new Map<string, number>()
  for (const { date } of researches) {
    const key = format(startOfMonth(date), 'yyyy-MM')
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return eachMonthOfInterval({ start: rangeStart, end: new Date() }).map((monthStart) => {
    const key = format(monthStart, 'yyyy-MM')
    return { monthStart, label: format(monthStart, 'LLL', { locale: ru }), count: buckets.get(key) ?? 0 }
  })
}

export interface GapsCounts {
  unconfirmedJtbds: number
  segmentsWithoutJtbd: number
  stuckHypotheses: number
  productsWithoutRecentResearch: number
}

// Same 4 queries /reports/gaps lists in full — the dashboard's KPI row only
// needs the counts.
export async function getGapsCounts(userId: string): Promise<GapsCounts> {
  const [unconfirmedJtbds, segmentsWithoutJtbd, stuckHypotheses, productsWithoutRecentResearch] =
    await Promise.all([
      getUnconfirmedJtbds(userId),
      getSegmentsWithoutJtbd(userId),
      getStuckHypotheses(userId),
      getProductsWithoutRecentResearch(userId),
    ])
  return {
    unconfirmedJtbds: unconfirmedJtbds.length,
    segmentsWithoutJtbd: segmentsWithoutJtbd.length,
    stuckHypotheses: stuckHypotheses.length,
    productsWithoutRecentResearch: productsWithoutRecentResearch.length,
  }
}
