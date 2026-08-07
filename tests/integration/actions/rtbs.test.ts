import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRTB,
  createRTBQuick,
  deleteRTB,
  toggleRTBPinned,
  updateRTB,
  updateRTBField,
} from '@/lib/actions/rtbs'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createRTB', () => {
  it('creates an RTB linked to features', async () => {
    const product = await createTestProduct()
    const feature = await prisma.feature.create({
      data: { name: 'F', productId: product.id, userId: product.userId },
    })

    const formData = buildFormData(
      { statement: 'Fastest onboarding in the category', productId: product.id },
      { featureIds: [feature.id] }
    )
    const redirectPath = await captureRedirect(() => createRTB(formData))
    const id = redirectPath.split('/').pop()!
    const rtb = await prisma.rTB.findUnique({ where: { id }, include: { features: true } })
    expect(rtb?.features.map((f) => f.id)).toEqual([feature.id])
  })

  it('allows an RTB with no linked features (flagged in docs as a red flag, not blocked)', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({ statement: 'Unsupported promise', productId: product.id })
    const redirectPath = await captureRedirect(() => createRTB(formData))
    expect(redirectPath).toMatch(/^\/marketing\//)
  })
})

describe('updateRTB / deleteRTB / toggleRTBPinned', () => {
  it('updates an RTB', async () => {
    const product = await createTestProduct()
    const rtb = await prisma.rTB.create({
      data: { statement: 'Old', productId: product.id, userId: product.userId },
    })
    const formData = buildFormData({ statement: 'New', productId: product.id })
    await captureRedirect(() => updateRTB(rtb.id, formData))
    expect((await prisma.rTB.findUnique({ where: { id: rtb.id } }))?.statement).toBe('New')
  })

  it('deletes an RTB', async () => {
    const product = await createTestProduct()
    const rtb = await prisma.rTB.create({
      data: { statement: 'Del', productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteRTB(rtb.id))
    expect(redirectPath).toBe('/marketing')
    expect(await prisma.rTB.findUnique({ where: { id: rtb.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const rtb = await prisma.rTB.create({
      data: { statement: 'Pin', productId: product.id, userId: product.userId },
    })
    await toggleRTBPinned(rtb.id, true)
    expect((await prisma.rTB.findUnique({ where: { id: rtb.id } }))?.pinned).toBe(true)
  })
})

describe('createRTBQuick / updateRTBField', () => {
  it('creates an RTB without a form', async () => {
    const product = await createTestProduct()
    const result = await createRTBQuick(product.id, 'Quick promise')
    expect(result.ok).toBe(true)
  })

  it('rejects an empty statement inline', async () => {
    const product = await createTestProduct()
    const rtb = await prisma.rTB.create({
      data: { statement: 'S', productId: product.id, userId: product.userId },
    })
    const result = await updateRTBField(rtb.id, '   ')
    expect(result.ok).toBe(false)
  })
})
