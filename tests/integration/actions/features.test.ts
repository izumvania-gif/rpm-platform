import { beforeEach, describe, expect, it } from 'vitest'
import {
  createFeature,
  createFeatureQuick,
  deleteFeature,
  toggleFeaturePinned,
  updateFeature,
  updateFeatureField,
} from '@/lib/actions/features'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createFeature', () => {
  it('creates a feature and links it to JTBDs and RTBs', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const rtb = await prisma.rTB.create({
      data: { statement: 'Promise', productId: product.id, userId: product.userId },
    })

    const formData = buildFormData(
      { name: 'Bulk export', productId: product.id },
      { jtbdIds: [jtbd.id], rtbIds: [rtb.id] }
    )
    const redirectPath = await captureRedirect(() => createFeature(formData))
    const id = redirectPath.split('/').pop()!
    const feature = await prisma.feature.findUnique({
      where: { id },
      include: { jtbds: true, rtbs: true },
    })
    expect(feature?.jtbds.map((j) => j.id)).toEqual([jtbd.id])
    expect(feature?.rtbs.map((r) => r.id)).toEqual([rtb.id])
  })
})

describe('updateFeature / deleteFeature / toggleFeaturePinned', () => {
  it('replaces the JTBD/RTB link sets', async () => {
    const product = await createTestProduct()
    const jtbdA = await prisma.jTBD.create({
      data: { title: 'A', category: 'C', productId: product.id, userId: product.userId },
    })
    const jtbdB = await prisma.jTBD.create({
      data: { title: 'B', category: 'C', productId: product.id, userId: product.userId },
    })
    const feature = await prisma.feature.create({
      data: {
        name: 'F',
        productId: product.id,
        userId: product.userId,
        jtbds: { connect: { id: jtbdA.id } },
      },
    })

    const formData = buildFormData({ name: 'F2', productId: product.id }, { jtbdIds: [jtbdB.id] })
    await captureRedirect(() => updateFeature(feature.id, formData))
    const updated = await prisma.feature.findUnique({
      where: { id: feature.id },
      include: { jtbds: true },
    })
    expect(updated?.jtbds.map((j) => j.id)).toEqual([jtbdB.id])
  })

  it('deletes a feature', async () => {
    const product = await createTestProduct()
    const feature = await prisma.feature.create({
      data: { name: 'Del', productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteFeature(feature.id))
    expect(redirectPath).toBe('/features')
    expect(await prisma.feature.findUnique({ where: { id: feature.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const feature = await prisma.feature.create({
      data: { name: 'Pin', productId: product.id, userId: product.userId },
    })
    await toggleFeaturePinned(feature.id, true)
    expect((await prisma.feature.findUnique({ where: { id: feature.id } }))?.pinned).toBe(true)
  })
})

describe('createFeatureQuick / updateFeatureField', () => {
  it('creates a feature without a form', async () => {
    const product = await createTestProduct()
    const result = await createFeatureQuick(product.id, 'Quick feature')
    expect(result.ok).toBe(true)
  })

  it('rejects an empty name inline', async () => {
    const product = await createTestProduct()
    const feature = await prisma.feature.create({
      data: { name: 'F', productId: product.id, userId: product.userId },
    })
    const result = await updateFeatureField(feature.id, 'name', '  ')
    expect(result.ok).toBe(false)
  })
})
