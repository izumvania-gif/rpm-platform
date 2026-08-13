import { beforeEach, describe, expect, it } from 'vitest'
import { HypothesisStatus } from '@prisma/client'
import { moveStuckHypothesisToReview } from '@/lib/actions/gaps'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

async function createDraftHypothesis(productId: string, statement = 'Если A, то B') {
  return prisma.hypothesis.create({
    data: {
      statement,
      status: HypothesisStatus.DRAFT,
      tags: [],
      productId,
      userId: DEFAULT_USER_ID,
    },
  })
}

describe('moveStuckHypothesisToReview', () => {
  it('moves a draft hypothesis to review', async () => {
    const product = await createTestProduct()
    const hypothesis = await createDraftHypothesis(product.id)

    expect(await moveStuckHypothesisToReview(hypothesis.id)).toEqual({ ok: true })

    const updated = await prisma.hypothesis.findUniqueOrThrow({ where: { id: hypothesis.id } })
    expect(updated.status).toBe(HypothesisStatus.IN_REVIEW)
  })

  it('records the move in the status history, like the kanban board does', async () => {
    const product = await createTestProduct()
    const hypothesis = await createDraftHypothesis(product.id)
    await moveStuckHypothesisToReview(hypothesis.id)

    const changes = await prisma.hypothesisStatusChange.findMany({
      where: { hypothesisId: hypothesis.id },
    })
    expect(changes).toHaveLength(1)
    expect(changes[0].status).toBe(HypothesisStatus.IN_REVIEW)
  })

  it('refuses to drag a hypothesis backwards once it has already moved on', async () => {
    const product = await createTestProduct()
    const hypothesis = await createDraftHypothesis(product.id)
    await prisma.hypothesis.update({
      where: { id: hypothesis.id },
      data: { status: HypothesisStatus.CONFIRMED },
    })

    expect(await moveStuckHypothesisToReview(hypothesis.id)).toEqual({
      ok: false,
      error: 'Гипотеза уже не в черновике',
    })
    const after = await prisma.hypothesis.findUniqueOrThrow({ where: { id: hypothesis.id } })
    expect(after.status).toBe(HypothesisStatus.CONFIRMED)
  })

  it('rejects a missing id', async () => {
    expect(await moveStuckHypothesisToReview('')).toEqual({
      ok: false,
      error: 'Не указана гипотеза',
    })
  })

  it('rejects an unknown hypothesis', async () => {
    expect(await moveStuckHypothesisToReview('does-not-exist')).toEqual({
      ok: false,
      error: 'Гипотеза не найдена',
    })
  })

  it('refuses to touch another user’s hypothesis', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-gaps-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreignProduct = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-gaps-${Date.now()}`, userId: otherUser.id },
    })
    const foreign = await prisma.hypothesis.create({
      data: {
        statement: 'Чужая гипотеза',
        status: HypothesisStatus.DRAFT,
        tags: [],
        productId: foreignProduct.id,
        userId: otherUser.id,
      },
    })

    expect(await moveStuckHypothesisToReview(foreign.id)).toEqual({
      ok: false,
      error: 'Гипотеза не найдена',
    })
    const after = await prisma.hypothesis.findUniqueOrThrow({ where: { id: foreign.id } })
    expect(after.status).toBe(HypothesisStatus.DRAFT)
  })
})
