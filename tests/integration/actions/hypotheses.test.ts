import { beforeEach, describe, expect, it } from 'vitest'
import {
  createHypothesis,
  createHypothesisQuick,
  deleteHypothesis,
  toggleHypothesisPinned,
  updateHypothesis,
  updateHypothesisField,
  updateHypothesisStatus,
} from '@/lib/actions/hypotheses'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createHypothesis', () => {
  it('creates a hypothesis and records the initial status change', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      statement: 'Если добавим X, то вырастет Y',
      status: 'DRAFT',
      priority: '3',
      productId: product.id,
    })

    await captureRedirect(() => createHypothesis(formData))
    const hypothesis = await prisma.hypothesis.findFirst({ include: { statusChanges: true } })
    expect(hypothesis?.statusChanges).toHaveLength(1)
    expect(hypothesis?.statusChanges[0].status).toBe('DRAFT')
  })
})

describe('updateHypothesis', () => {
  it('records a status change only when the status actually changes', async () => {
    const product = await createTestProduct()
    const hypothesis = await prisma.hypothesis.create({
      data: {
        statement: 'S',
        status: 'DRAFT',
        productId: product.id,
        userId: product.userId,
        statusChanges: { create: { status: 'DRAFT' } },
      },
    })

    // Same status: no new history row.
    await captureRedirect(() =>
      updateHypothesis(
        hypothesis.id,
        buildFormData({ statement: 'S2', status: 'DRAFT', productId: product.id })
      )
    )
    expect(
      await prisma.hypothesisStatusChange.count({ where: { hypothesisId: hypothesis.id } })
    ).toBe(1)

    // Different status: new history row.
    await captureRedirect(() =>
      updateHypothesis(
        hypothesis.id,
        buildFormData({ statement: 'S2', status: 'IN_REVIEW', productId: product.id })
      )
    )
    expect(
      await prisma.hypothesisStatusChange.count({ where: { hypothesisId: hypothesis.id } })
    ).toBe(2)
  })
})

describe('deleteHypothesis / toggleHypothesisPinned / updateHypothesisStatus', () => {
  it('deletes a hypothesis', async () => {
    const product = await createTestProduct()
    const hypothesis = await prisma.hypothesis.create({
      data: { statement: 'S', status: 'DRAFT', productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteHypothesis(hypothesis.id))
    expect(redirectPath).toBe('/hypotheses')
    expect(await prisma.hypothesis.findUnique({ where: { id: hypothesis.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const hypothesis = await prisma.hypothesis.create({
      data: { statement: 'S', status: 'DRAFT', productId: product.id, userId: product.userId },
    })
    await toggleHypothesisPinned(hypothesis.id, true)
    expect((await prisma.hypothesis.findUnique({ where: { id: hypothesis.id } }))?.pinned).toBe(
      true
    )
  })

  it('updateHypothesisStatus moves the kanban card and appends history (used by drag-and-drop)', async () => {
    const product = await createTestProduct()
    const hypothesis = await prisma.hypothesis.create({
      data: { statement: 'S', status: 'DRAFT', productId: product.id, userId: product.userId },
    })
    await updateHypothesisStatus(hypothesis.id, 'CONFIRMED')
    const updated = await prisma.hypothesis.findUnique({
      where: { id: hypothesis.id },
      include: { statusChanges: true },
    })
    expect(updated?.status).toBe('CONFIRMED')
    expect(updated?.statusChanges.map((c) => c.status)).toEqual(['CONFIRMED'])
  })
})

describe('createHypothesisQuick', () => {
  it('creates a DRAFT hypothesis linked to a JTBD and segment', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const result = await createHypothesisQuick(product.id, 'Quick hypothesis', jtbd.id)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.hypothesis.status).toBe('DRAFT')
      expect(result.hypothesis.jtbdId).toBe(jtbd.id)
    }
  })
})

describe('updateHypothesisField', () => {
  it('rejects a non-integer priority', async () => {
    const product = await createTestProduct()
    const hypothesis = await prisma.hypothesis.create({
      data: { statement: 'S', status: 'DRAFT', productId: product.id, userId: product.userId },
    })
    const result = await updateHypothesisField(hypothesis.id, 'priority', '1.5')
    expect(result.ok).toBe(false)
  })

  it('clears priority when given an empty value', async () => {
    const product = await createTestProduct()
    const hypothesis = await prisma.hypothesis.create({
      data: {
        statement: 'S',
        status: 'DRAFT',
        priority: 5,
        productId: product.id,
        userId: product.userId,
      },
    })
    const result = await updateHypothesisField(hypothesis.id, 'priority', '')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.hypothesis.findUnique({ where: { id: hypothesis.id } }))?.priority
    ).toBeNull()
  })
})
