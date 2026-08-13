import { beforeEach, describe, expect, it } from 'vitest'
import {
  createSegment,
  createSegmentQuick,
  deleteSegment,
  toggleSegmentPinned,
  updateSegment,
  updateSegmentField,
} from '@/lib/actions/segments'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createSegment', () => {
  it('creates a segment', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      name: 'Enterprise',
      slug: 'enterprise',
      color: '#FF0000',
      tags: 'b2b, large',
      productId: product.id,
    })

    const redirectPath = await captureRedirect(() => createSegment(formData))
    const id = redirectPath.split('/').pop()!
    const segment = await prisma.segment.findUnique({ where: { id } })
    expect(segment).toMatchObject({ name: 'Enterprise', tags: ['b2b', 'large'] })
  })

  it('rejects a duplicate slug within the same product', async () => {
    const product = await createTestProduct()
    await prisma.segment.create({
      data: {
        name: 'A',
        slug: 'dup',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })

    const formData = buildFormData({
      name: 'B',
      slug: 'dup',
      color: '#3B82F6',
      productId: product.id,
    })
    const redirectPath = await captureRedirect(() => createSegment(formData))
    expect(redirectPath).toMatch(/^\/segments\/new\?error=/)
  })
})

describe('updateSegment / deleteSegment / toggleSegmentPinned', () => {
  it('updates a segment', async () => {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: {
        name: 'Old',
        slug: 'seg',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })

    const formData = buildFormData({
      name: 'New',
      slug: 'seg',
      color: '#00FF00',
      audienceShare: '42',
      productId: product.id,
    })
    await captureRedirect(() => updateSegment(segment.id, formData))
    const updated = await prisma.segment.findUnique({ where: { id: segment.id } })
    expect(updated).toMatchObject({ name: 'New', audienceShare: 42 })
  })

  it('deletes a segment and its graph layout rows', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const segment = await prisma.segment.create({
      data: {
        name: 'Del',
        slug: 'del',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    await prisma.jtbdGraphLayout.create({
      data: { jtbdId: jtbd.id, viewKey: segment.id, x: 1, y: 2 },
    })

    const redirectPath = await captureRedirect(() => deleteSegment(segment.id))
    expect(redirectPath).toBe('/segments')
    expect(await prisma.segment.findUnique({ where: { id: segment.id } })).toBeNull()
    expect(await prisma.jtbdGraphLayout.count({ where: { viewKey: segment.id } })).toBe(0)
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: {
        name: 'Pin',
        slug: 'pin',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    await toggleSegmentPinned(segment.id, true)
    expect((await prisma.segment.findUnique({ where: { id: segment.id } }))?.pinned).toBe(true)
  })
})

describe('createSegmentQuick', () => {
  it('creates a segment with a slugified name', async () => {
    const product = await createTestProduct()
    const result = await createSegmentQuick(product.id, 'Малый бизнес')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.segment.slug).toBe('malyy-biznes')
    }
  })

  it('disambiguates a slug collision instead of failing', async () => {
    const product = await createTestProduct()
    const first = await createSegmentQuick(product.id, 'Retail')
    const second = await createSegmentQuick(product.id, 'Retail')
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(first.segment.slug).not.toBe(second.segment.slug)
    }
  })

  it('rejects a missing name', async () => {
    const product = await createTestProduct()
    const result = await createSegmentQuick(product.id, '  ')
    expect(result.ok).toBe(false)
  })
})

describe('updateSegmentField', () => {
  it('updates audienceShare inline', async () => {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: {
        name: 'S',
        slug: 's',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const result = await updateSegmentField(segment.id, 'audienceShare', '55')
    expect(result).toEqual({ ok: true })
    expect((await prisma.segment.findUnique({ where: { id: segment.id } }))?.audienceShare).toBe(55)
  })

  it('rejects an out-of-range audienceShare', async () => {
    const product = await createTestProduct()
    const segment = await prisma.segment.create({
      data: {
        name: 'S',
        slug: 's2',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const result = await updateSegmentField(segment.id, 'audienceShare', '150')
    expect(result.ok).toBe(false)
  })
})
