import { beforeEach, describe, expect, it } from 'vitest'
import { attachToResearch, researchLinkCandidates } from '@/lib/actions/research-links'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { NOT_OWNED_ERROR } from '@/lib/ownership'

beforeEach(ensureTestUser)

async function seed() {
  const product = await createTestProduct()
  const research = await prisma.research.create({
    data: {
      title: 'Интервью с банками',
      type: 'QUALITATIVE',
      productId: product.id,
      userId: DEFAULT_USER_ID,
    },
  })
  const [jtbd, hypothesis, conversation] = await Promise.all([
    prisma.jTBD.create({
      data: {
        title: 'Когда истекает сертификат, я хочу продлить его сам',
        category: 'Выпуск',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
    prisma.hypothesis.create({
      data: {
        statement: 'Если убрать визит, то онбординг ускорится',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
    prisma.conversation.create({
      data: { title: 'Звонок с банком', productId: product.id, userId: DEFAULT_USER_ID },
    }),
  ])
  return { product, research, jtbd, hypothesis, conversation }
}

describe('researchLinkCandidates', () => {
  it('lists only the product’s records that have no research yet', async () => {
    const { product, research, jtbd, hypothesis, conversation } = await seed()
    // Already attached elsewhere — must not be offered (one link per record).
    const other = await prisma.research.create({
      data: { title: 'Другое', type: 'SURVEY', productId: product.id, userId: DEFAULT_USER_ID },
    })
    await prisma.jTBD.create({
      data: {
        title: 'Привязанная',
        category: 'X',
        productId: product.id,
        userId: DEFAULT_USER_ID,
        researchId: other.id,
      },
    })
    // Another product — out of scope.
    const foreign = await createTestProduct({ slug: `other-${Date.now()}` })
    await prisma.jTBD.create({
      data: { title: 'Чужая', category: 'X', productId: foreign.id, userId: DEFAULT_USER_ID },
    })

    const jtbds = await researchLinkCandidates(research.id, 'jtbd')
    expect(jtbds.ok && jtbds.candidates.map((c) => c.id)).toEqual([jtbd.id])
    // Key phrase in the label, the full sentence in the tooltip.
    expect(jtbds.ok && jtbds.candidates[0].label).toBe('Продлить его сам')
    expect(jtbds.ok && jtbds.candidates[0].fullLabel).toBe(jtbd.title)

    const hypotheses = await researchLinkCandidates(research.id, 'hypothesis')
    expect(hypotheses.ok && hypotheses.candidates.map((c) => c.id)).toEqual([hypothesis.id])
    const conversations = await researchLinkCandidates(research.id, 'conversation')
    expect(conversations.ok && conversations.candidates.map((c) => c.id)).toEqual([conversation.id])
  })

  it('refuses a research of another tenant and an unknown kind', async () => {
    const other = await prisma.user.create({
      data: { email: `other-links-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const product = await prisma.product.create({
      data: { name: 'Чужой', slug: `chuzhoy-links-${Date.now()}`, userId: other.id },
    })
    const research = await prisma.research.create({
      data: { title: 'Чужое', type: 'SURVEY', productId: product.id, userId: other.id },
    })
    expect(await researchLinkCandidates(research.id, 'jtbd')).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })

    const { research: mine } = await seed()
    // The kind arrives from the client too.
    const bad = await researchLinkCandidates(mine.id, 'insight' as never)
    expect(bad.ok).toBe(false)
  })
})

describe('attachToResearch', () => {
  it('links a job and marks it confirmed in the same write', async () => {
    const { research, jtbd } = await seed()
    expect(await attachToResearch(research.id, 'jtbd', jtbd.id)).toEqual({ ok: true })
    const row = await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })
    expect(row.researchId).toBe(research.id)
    expect(row.confirmed).toBe(true)
  })

  it('links a hypothesis and a conversation', async () => {
    const { research, hypothesis, conversation } = await seed()
    expect(await attachToResearch(research.id, 'hypothesis', hypothesis.id)).toEqual({ ok: true })
    expect(await attachToResearch(research.id, 'conversation', conversation.id)).toEqual({
      ok: true,
    })
    expect(
      (await prisma.hypothesis.findUniqueOrThrow({ where: { id: hypothesis.id } })).researchId
    ).toBe(research.id)
    expect(
      (await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } })).researchId
    ).toBe(research.id)
  })

  it('never steals a record already attached to another research', async () => {
    const { product, research, jtbd } = await seed()
    const other = await prisma.research.create({
      data: { title: 'Другое', type: 'SURVEY', productId: product.id, userId: DEFAULT_USER_ID },
    })
    await prisma.jTBD.update({ where: { id: jtbd.id }, data: { researchId: other.id } })

    const result = await attachToResearch(research.id, 'jtbd', jtbd.id)
    expect(result.ok).toBe(false)
    const row = await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })
    expect(row.researchId).toBe(other.id)
    expect(row.confirmed).toBe(false)
  })

  it('refuses a record from another product', async () => {
    const { research } = await seed()
    const foreign = await createTestProduct({ slug: `other-${Date.now()}` })
    const jtbd = await prisma.jTBD.create({
      data: { title: 'Чужая', category: 'X', productId: foreign.id, userId: DEFAULT_USER_ID },
    })
    expect((await attachToResearch(research.id, 'jtbd', jtbd.id)).ok).toBe(false)
    expect((await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })).researchId).toBeNull()
  })

  it('guards both ids against another tenant', async () => {
    const { research, jtbd } = await seed()
    const other = await prisma.user.create({
      data: { email: `other-links2-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const product = await prisma.product.create({
      data: { name: 'Чужой', slug: `chuzhoy-links2-${Date.now()}`, userId: other.id },
    })
    const otherResearch = await prisma.research.create({
      data: { title: 'Чужое', type: 'SURVEY', productId: product.id, userId: other.id },
    })
    const otherJtbd = await prisma.jTBD.create({
      data: { title: 'Чужая', category: 'X', productId: product.id, userId: other.id },
    })
    expect(await attachToResearch(otherResearch.id, 'jtbd', jtbd.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    expect(await attachToResearch(research.id, 'jtbd', otherJtbd.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    expect((await prisma.jTBD.findUniqueOrThrow({ where: { id: jtbd.id } })).researchId).toBeNull()
    expect(
      (await prisma.jTBD.findUniqueOrThrow({ where: { id: otherJtbd.id } })).researchId
    ).toBeNull()
  })
})
