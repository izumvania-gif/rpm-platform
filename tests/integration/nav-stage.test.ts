import { beforeEach, describe, expect, it } from 'vitest'
import { getNavStage, hasDataBeyondBase } from '@/lib/nav-stage'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from './helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

// The safety property of C1: the nav only ever collapses when every module
// outside the base chain is genuinely empty, so it can never hide the user's
// own data from them.

describe('hasDataBeyondBase', () => {
  it('is false for a brand-new workspace', async () => {
    expect(await hasDataBeyondBase(DEFAULT_USER_ID)).toBe(false)
  })

  it('stays false for a workspace that only used the base chain', async () => {
    const product = await createTestProduct()
    await prisma.segment.create({
      data: {
        name: 'Банки',
        slug: `banks-${Date.now()}`,
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    await prisma.jTBD.create({
      data: {
        title: 'Выпустить сертификат',
        category: 'Онбординг',
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    expect(await hasDataBeyondBase(DEFAULT_USER_ID)).toBe(false)
  })

  it('flips to true for a record in any single non-base module', async () => {
    const product = await createTestProduct()
    await prisma.competitor.create({
      data: { name: 'КриптоПро', features: [], productId: product.id, userId: DEFAULT_USER_ID },
    })
    expect(await hasDataBeyondBase(DEFAULT_USER_ID)).toBe(true)
  })

  it('notices a cross-product module too, not just product-scoped ones', async () => {
    // Person is scoped to userId only — a proxy like "has a JTBD yet" would
    // miss this and collapse a nav that has a filled Люди section.
    await prisma.person.create({ data: { name: 'Иван', userId: DEFAULT_USER_ID } })
    expect(await hasDataBeyondBase(DEFAULT_USER_ID)).toBe(true)
  })

  it('ignores another user’s data', async () => {
    const other = await prisma.user.create({
      data: { email: `other-nav-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-nav-${Date.now()}`, userId: other.id },
    })
    await prisma.competitor.create({
      data: { name: 'Чужой', features: [], productId: foreign.id, userId: other.id },
    })
    expect(await hasDataBeyondBase(DEFAULT_USER_ID)).toBe(false)
  })
})

describe('getNavStage', () => {
  it('is basic for an empty workspace and full once anything else exists', async () => {
    expect(await getNavStage(DEFAULT_USER_ID)).toBe('basic')

    const product = await createTestProduct()
    await prisma.feature.create({
      data: { name: 'Массовый отзыв', productId: product.id, userId: DEFAULT_USER_ID },
    })
    expect(await getNavStage(DEFAULT_USER_ID)).toBe('full')
  })
})
