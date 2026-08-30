import { beforeEach, describe, expect, it } from 'vitest'
import { HypothesisStatus, InsightStance, ResearchType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  coveragePercent,
  getGapsCounts,
  getHypothesisStatusCounts,
  getJtbdCoverage,
  getProductsWithoutRecentResearch,
  getResearchCadence,
  getSegmentsWithoutJtbd,
  getStuckHypotheses,
  getDiscoveryChain,
  getDecisionQueue,
  getUnconfirmedJtbds,
} from '@/lib/dashboard-metrics'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { createTestProduct, ensureTestUser } from './helpers'

beforeEach(ensureTestUser)

const DAY_MS = 24 * 60 * 60 * 1000

describe('getUnconfirmedJtbds', () => {
  it('returns only unconfirmed JTBDs, with product included', async () => {
    const product = await createTestProduct()
    await prisma.jTBD.create({
      data: {
        title: 'Confirmed',
        category: 'C',
        confirmed: true,
        productId: product.id,
        userId: product.userId,
      },
    })
    const unconfirmed = await prisma.jTBD.create({
      data: {
        title: 'Unconfirmed',
        category: 'C',
        confirmed: false,
        productId: product.id,
        userId: product.userId,
      },
    })

    const result = await getUnconfirmedJtbds(product.userId)
    expect(result.map((j) => j.id)).toEqual([unconfirmed.id])
    expect(result[0].product.id).toBe(product.id)
  })
})

describe('getSegmentsWithoutJtbd', () => {
  it('returns only segments with zero linked JTBDs', async () => {
    const product = await createTestProduct()
    const covered = await prisma.segment.create({
      data: {
        name: 'Covered',
        slug: 'covered',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const uncovered = await prisma.segment.create({
      data: {
        name: 'Uncovered',
        slug: 'uncovered',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.jTBD.create({
      data: {
        title: 'T',
        category: 'C',
        productId: product.id,
        userId: product.userId,
        segments: { connect: { id: covered.id } },
      },
    })

    const result = await getSegmentsWithoutJtbd(product.userId)
    expect(result.map((s) => s.id)).toEqual([uncovered.id])
  })
})

describe('getStuckHypotheses', () => {
  it('returns DRAFT hypotheses older than 14 days, excludes recent drafts and other statuses', async () => {
    const product = await createTestProduct()
    const oldDraft = await prisma.hypothesis.create({
      data: {
        statement: 'Old draft',
        status: HypothesisStatus.DRAFT,
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 20 * DAY_MS),
      },
    })
    await prisma.hypothesis.create({
      data: {
        statement: 'Recent draft',
        status: HypothesisStatus.DRAFT,
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 2 * DAY_MS),
      },
    })
    await prisma.hypothesis.create({
      data: {
        statement: 'Old but confirmed',
        status: HypothesisStatus.CONFIRMED,
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 20 * DAY_MS),
      },
    })

    const result = await getStuckHypotheses(product.userId)
    expect(result.map((h) => h.id)).toEqual([oldDraft.id])
  })
})

describe('getProductsWithoutRecentResearch', () => {
  it('flags products with no research or only stale research', async () => {
    const noResearch = await createTestProduct({ name: 'No research' })
    const staleResearch = await createTestProduct({ name: 'Stale research' })
    const freshResearch = await createTestProduct({ name: 'Fresh research' })

    await prisma.research.create({
      data: {
        title: 'Old',
        type: ResearchType.MANUAL,
        date: new Date(Date.now() - 120 * DAY_MS),
        productId: staleResearch.id,
        userId: staleResearch.userId,
      },
    })
    await prisma.research.create({
      data: {
        title: 'Recent',
        type: ResearchType.MANUAL,
        date: new Date(Date.now() - 5 * DAY_MS),
        productId: freshResearch.id,
        userId: freshResearch.userId,
      },
    })

    const result = await getProductsWithoutRecentResearch(noResearch.userId)
    const ids = result.map((p) => p.id).sort()
    expect(ids).toEqual([noResearch.id, staleResearch.id].sort())
  })
})

describe('coveragePercent', () => {
  it('rounds to the nearest percent and handles zero total', () => {
    expect(coveragePercent(0, 0)).toBe(0)
    expect(coveragePercent(1, 3)).toBe(33)
    expect(coveragePercent(2, 3)).toBe(67)
    expect(coveragePercent(5, 5)).toBe(100)
  })
})

describe('getJtbdCoverage', () => {
  it('computes confirmed/total/percent, optionally scoped to a product', async () => {
    const productA = await createTestProduct({ name: 'A' })
    const productB = await createTestProduct({ name: 'B' })
    await prisma.jTBD.create({
      data: {
        title: 'A1',
        category: 'C',
        confirmed: true,
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.jTBD.create({
      data: {
        title: 'A2',
        category: 'C',
        confirmed: false,
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.jTBD.create({
      data: {
        title: 'B1',
        category: 'C',
        confirmed: true,
        productId: productB.id,
        userId: productB.userId,
      },
    })

    const overall = await getJtbdCoverage(productA.userId)
    expect(overall).toEqual({ confirmed: 2, total: 3, percent: 67 })

    const scoped = await getJtbdCoverage(productA.userId, productA.id)
    expect(scoped).toEqual({ confirmed: 1, total: 2, percent: 50 })
  })
})

describe('getHypothesisStatusCounts', () => {
  it('zero-fills every status and counts what exists', async () => {
    const product = await createTestProduct()
    await prisma.hypothesis.create({
      data: {
        statement: 'H1',
        status: HypothesisStatus.DRAFT,
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.hypothesis.create({
      data: {
        statement: 'H2',
        status: HypothesisStatus.DRAFT,
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.hypothesis.create({
      data: {
        statement: 'H3',
        status: HypothesisStatus.CONFIRMED,
        productId: product.id,
        userId: product.userId,
      },
    })

    const counts = await getHypothesisStatusCounts(product.userId)
    expect(counts).toEqual({
      DRAFT: 2,
      IN_REVIEW: 0,
      CONFIRMED: 1,
      REJECTED: 0,
    })
  })
})

describe('getResearchCadence', () => {
  it('buckets research by month and zero-fills months with none', async () => {
    const product = await createTestProduct()
    const now = new Date()
    await prisma.research.create({
      data: {
        title: 'This month',
        type: ResearchType.MANUAL,
        date: now,
        productId: product.id,
        userId: product.userId,
      },
    })

    const cadence = await getResearchCadence(product.userId, 3)
    expect(cadence).toHaveLength(3)
    expect(cadence[cadence.length - 1].count).toBe(1)
    expect(cadence.slice(0, -1).every((m) => m.count === 0)).toBe(true)
  })

  it('scopes to a single product when productId is given', async () => {
    const productA = await createTestProduct({ name: 'A' })
    const productB = await createTestProduct({ name: 'B' })
    const now = new Date()
    await prisma.research.create({
      data: {
        title: 'A research',
        type: ResearchType.MANUAL,
        date: now,
        productId: productA.id,
        userId: productA.userId,
      },
    })
    await prisma.research.create({
      data: {
        title: 'B research',
        type: ResearchType.MANUAL,
        date: now,
        productId: productB.id,
        userId: productB.userId,
      },
    })

    const cadence = await getResearchCadence(productA.userId, 1, productA.id)
    expect(cadence).toHaveLength(1)
    expect(cadence[0].count).toBe(1)
  })

  it('labels months in Russian, not the date-fns default English', async () => {
    const product = await createTestProduct()
    const cadence = await getResearchCadence(product.userId, 1)
    // Cyrillic month abbreviation (e.g. "авг.") — would be "Aug" without the ru locale.
    expect(cadence[0].label).toMatch(/^[а-яё]+\.?$/i)
  })
})

describe('getGapsCounts', () => {
  it('aggregates the 4 gap queries into counts', async () => {
    const product = await createTestProduct()
    await prisma.jTBD.create({
      data: {
        title: 'Unconfirmed',
        category: 'C',
        confirmed: false,
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.segment.create({
      data: {
        name: 'Uncovered',
        slug: 'uncovered',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.hypothesis.create({
      data: {
        statement: 'Stuck',
        status: HypothesisStatus.DRAFT,
        productId: product.id,
        userId: product.userId,
        createdAt: new Date(Date.now() - 20 * DAY_MS),
      },
    })
    // No research at all for this product — counts as "without recent research" too.

    const counts = await getGapsCounts(product.userId)
    expect(counts).toEqual({
      unconfirmedJtbds: 1,
      segmentsWithoutJtbd: 1,
      stuckHypotheses: 1,
      productsWithoutRecentResearch: 1,
    })
  })
})

describe('getDiscoveryChain', () => {
  it('counts each stage as total plus how much of it is attached', async () => {
    const product = await createTestProduct()
    const p = { productId: product.id, userId: DEFAULT_USER_ID }

    // One segment with a job hanging off it, one dead end.
    const linkedSegment = await prisma.segment.create({
      data: { name: 'Связан', slug: `s1-${Date.now()}`, tags: [], ...p },
    })
    await prisma.segment.create({
      data: { name: 'Тупик', slug: `s2-${Date.now()}`, tags: [], ...p },
    })

    const jtbd = await prisma.jTBD.create({
      data: {
        title: 'С сегментом',
        category: 'к',
        tags: [],
        segments: { connect: { id: linkedSegment.id } },
        ...p,
      },
    })
    await prisma.jTBD.create({ data: { title: 'Без сегмента', category: 'к', tags: [], ...p } })

    await prisma.hypothesis.create({
      data: { statement: 'С JTBD', tags: [], jtbdId: jtbd.id, ...p },
    })
    await prisma.hypothesis.create({ data: { statement: 'Ничья', tags: [], ...p } })

    const feature = await prisma.feature.create({
      data: { name: 'С JTBD', jtbds: { connect: { id: jtbd.id } }, ...p },
    })
    await prisma.feature.create({ data: { name: 'Без JTBD', ...p } })

    await prisma.rTB.create({
      data: { statement: 'На фиче', features: { connect: { id: feature.id } }, ...p },
    })

    const chain = await getDiscoveryChain(DEFAULT_USER_ID)

    expect(chain.segment).toEqual({ total: 2, attached: 1 })
    expect(chain.jtbd).toEqual({ total: 2, attached: 1 })
    expect(chain.hypothesis).toEqual({ total: 2, attached: 1 })
    expect(chain.feature).toEqual({ total: 2, attached: 1 })
    expect(chain.rtb).toEqual({ total: 1, attached: 1 })
  })

  it('returns zeroes rather than throwing on an empty base', async () => {
    await ensureTestUser()
    const chain = await getDiscoveryChain(DEFAULT_USER_ID)
    expect(chain.segment).toEqual({ total: 0, attached: 0 })
    expect(chain.rtb).toEqual({ total: 0, attached: 0 })
  })

  it('does not count another user’s records', async () => {
    const them = await prisma.user.create({
      data: { email: `other-chain-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const theirProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: `foreign-chain-${Date.now()}`, userId: them.id },
    })
    await prisma.segment.create({
      data: {
        name: 'Чужой сегмент',
        slug: `fs-${Date.now()}`,
        tags: [],
        productId: theirProduct.id,
        userId: them.id,
      },
    })

    expect((await getDiscoveryChain(DEFAULT_USER_ID)).segment).toEqual({ total: 0, attached: 0 })
  })
})

describe('getDecisionQueue', () => {
  /** Гипотеза со всем набором: критерий, три инсайта, сегмент, задача, фича. */
  async function seedReadyHypothesis(status: HypothesisStatus = HypothesisStatus.IN_REVIEW) {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: {
        name: 'Банки',
        slug: `banki-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    const jtbd = await prisma.jTBD.create({
      data: {
        title: 'Продлить сертификат',
        category: 'Выпуск',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    const feature = await prisma.feature.create({
      data: { name: 'Удалённый выпуск', productId: product.id, userId: DEFAULT_USER_ID },
    })
    const hypothesis = await prisma.hypothesis.create({
      data: {
        statement: 'Если выпускать удалённо, то банки согласятся',
        status,
        validationCriterion: 'Три из пяти банков подтвердят',
        segmentId: segment.id,
        jtbdId: jtbd.id,
        productId: product.id,
        userId: DEFAULT_USER_ID,
        features: { connect: { id: feature.id } },
      },
    })
    const stances = [InsightStance.SUPPORTS, InsightStance.SUPPORTS, InsightStance.CONTRADICTS]
    for (const stance of stances) {
      await prisma.insight.create({
        data: {
          text: `Инсайт ${stance}`,
          tags: [],
          stance,
          hypothesisId: hypothesis.id,
          productId: product.id,
          userId: DEFAULT_USER_ID,
        },
      })
    }
    return { product, hypothesis }
  }

  it('returns a hypothesis that has everything, with its evidence balance', async () => {
    const { hypothesis, product } = await seedReadyHypothesis()

    const queue = await getDecisionQueue(DEFAULT_USER_ID)
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(hypothesis.id)
    expect(queue[0].productName).toBe(product.name)
    expect(queue[0].balance).toMatchObject({ supports: 2, contradicts: 1, neutral: 0 })
  })

  it('leaves out a hypothesis missing one condition', async () => {
    const { hypothesis } = await seedReadyHypothesis()
    // Критерий — единственное, чего лишаем; всё остальное на месте.
    await prisma.hypothesis.update({
      where: { id: hypothesis.id },
      data: { validationCriterion: null },
    })

    expect(await getDecisionQueue(DEFAULT_USER_ID)).toEqual([])
  })

  // Решение уже принято — очередь такое не показывает. Фильтр стоит в запросе,
  // поэтому проверяется именно здесь, а не юнит-тестом.
  it.each([HypothesisStatus.CONFIRMED, HypothesisStatus.REJECTED])(
    'leaves out a %s hypothesis',
    async (status) => {
      await seedReadyHypothesis(status)
      expect(await getDecisionQueue(DEFAULT_USER_ID)).toEqual([])
    }
  )

  it('does not reach another user’s hypotheses', async () => {
    const them = await prisma.user.create({
      data: { email: `other-queue-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const theirProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: `foreign-queue-${Date.now()}`, userId: them.id },
    })
    await prisma.hypothesis.create({
      data: {
        statement: 'Если чужое, то чужое',
        status: HypothesisStatus.IN_REVIEW,
        validationCriterion: 'критерий',
        productId: theirProduct.id,
        userId: them.id,
      },
    })

    expect(await getDecisionQueue(DEFAULT_USER_ID)).toEqual([])
  })
})
