import { beforeEach, describe, expect, it } from 'vitest'
import { confirmJtbdWithResearch, confirmResearchCandidates } from '@/lib/actions/jtbd-confirm'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { NOT_OWNED_ERROR } from '@/lib/ownership'

beforeEach(ensureTestUser)

async function seed() {
  const product = await createTestProduct()
  const [jtbd, research] = await Promise.all([
    prisma.jTBD.create({
      data: {
        title: 'Когда истекает сертификат, я хочу продлить его сам',
        category: 'Выпуск',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
    prisma.research.create({
      data: {
        title: 'Интервью с банками',
        type: 'QUALITATIVE',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
  ])
  return { product, jtbd, research }
}

describe('confirmResearchCandidates', () => {
  it('lists the product’s research, numbered, and stays inside the product', async () => {
    const { jtbd, research } = await seed()
    const other = await createTestProduct({ slug: `other-${Date.now()}` })
    await prisma.research.create({
      data: { title: 'Чужое', type: 'SURVEY', productId: other.id, userId: DEFAULT_USER_ID },
    })

    const result = await confirmResearchCandidates(jtbd.id)
    expect(result.ok && result.candidates.map((c) => c.id)).toEqual([research.id])
    expect(result.ok && result.candidates[0].label).toMatch(/^#\d+ Интервью с банками$/)
  })

  it('refuses a job of another tenant', async () => {
    const other = await prisma.user.create({
      data: { email: `other-confirm-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const product = await prisma.product.create({
      data: { name: 'Чужой', slug: `chuzhoy-confirm-${Date.now()}`, userId: other.id },
    })
    const jtbd = await prisma.jTBD.create({
      data: { title: 'Чужая', category: 'X', productId: product.id, userId: other.id },
    })
    expect(await confirmResearchCandidates(jtbd.id)).toEqual({ ok: false, error: NOT_OWNED_ERROR })
  })
})

describe('confirmJtbdWithResearch', () => {
  it('sets the research and the flag together', async () => {
    const { jtbd, research } = await seed()
    expect(await confirmJtbdWithResearch(jtbd.id, research.id)).toEqual({ ok: true })
    const row = await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })
    expect(row.researchId).toBe(research.id)
    expect(row.confirmed).toBe(true)
  })

  it('never confirms without a research', async () => {
    // The whole point: no one-click «Подтвердить» — the flag claims research
    // backing, and the action refuses to set it on nothing.
    const { jtbd } = await seed()
    const result = await confirmJtbdWithResearch(jtbd.id, '')
    expect(result.ok).toBe(false)
    expect((await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })).confirmed).toBe(false)
  })

  it('refuses a research from another product', async () => {
    const { jtbd } = await seed()
    const other = await createTestProduct({ slug: `other-${Date.now()}` })
    const foreign = await prisma.research.create({
      data: { title: 'Чужое', type: 'SURVEY', productId: other.id, userId: DEFAULT_USER_ID },
    })
    const result = await confirmJtbdWithResearch(jtbd.id, foreign.id)
    expect(result.ok).toBe(false)
    const row = await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })
    expect(row.confirmed).toBe(false)
    expect(row.researchId).toBeNull()
  })

  it('guards both ids against another tenant', async () => {
    const { jtbd, research } = await seed()
    const other = await prisma.user.create({
      data: { email: `other-confirm2-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const product = await prisma.product.create({
      data: { name: 'Чужой', slug: `chuzhoy-confirm2-${Date.now()}`, userId: other.id },
    })
    const otherJtbd = await prisma.jTBD.create({
      data: { title: 'Чужая', category: 'X', productId: product.id, userId: other.id },
    })
    const otherResearch = await prisma.research.create({
      data: { title: 'Чужое', type: 'SURVEY', productId: product.id, userId: other.id },
    })
    expect(await confirmJtbdWithResearch(otherJtbd.id, research.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    expect(await confirmJtbdWithResearch(jtbd.id, otherResearch.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    expect((await prisma.jTBD.findUniqueOrThrow({ where: { id: otherJtbd.id } })).confirmed).toBe(
      false
    )
  })
})
