import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRoadmapItem,
  deleteRoadmapItem,
  toggleRoadmapItemPinned,
  updateRoadmapItem,
} from '@/lib/actions/roadmap'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('createRoadmapItem', () => {
  it('creates an item and redirects back to /pm', async () => {
    const product = await createTestProduct()
    const owner = await prisma.person.create({
      data: { name: 'Owner', skills: [], userId: DEFAULT_USER_ID },
    })
    const feature = await prisma.feature.create({
      data: { name: 'Feature X', productId: product.id, userId: DEFAULT_USER_ID },
    })

    const formData = buildFormData({
      title: 'Ship the thing',
      description: 'Some detail',
      status: 'IN_PROGRESS',
      quarter: '2026 Q3',
      visibility: 'PUBLIC',
      productId: product.id,
      ownerId: owner.id,
      featureId: feature.id,
    })

    const redirectPath = await captureRedirect(() => createRoadmapItem(formData))
    expect(redirectPath).toBe(`/pm?productId=${product.id}`)

    const item = await prisma.roadmapItem.findFirst({ where: { productId: product.id } })
    expect(item).toMatchObject({
      title: 'Ship the thing',
      status: 'IN_PROGRESS',
      quarter: '2026 Q3',
      visibility: 'PUBLIC',
      ownerId: owner.id,
      featureId: feature.id,
    })
  })

  it('defaults status/visibility and rejects a missing title', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({ title: '  ', status: 'PLANNED', visibility: 'INTERNAL', productId: product.id })
    const redirectPath = await captureRedirect(() => createRoadmapItem(formData))
    expect(redirectPath).toMatch(/^\/pm\/roadmap\/new\?productId=.*&error=/)
    expect(await prisma.roadmapItem.count()).toBe(0)
  })
})

describe('updateRoadmapItem / deleteRoadmapItem / toggleRoadmapItemPinned', () => {
  it('updates an item', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'Old',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const formData = buildFormData({
      title: 'New',
      status: 'SHIPPED',
      visibility: 'INTERNAL',
      productId: product.id,
    })
    const redirectPath = await captureRedirect(() => updateRoadmapItem(item.id, formData))
    expect(redirectPath).toBe(`/pm?productId=${product.id}`)

    const updated = await prisma.roadmapItem.findUnique({ where: { id: item.id } })
    expect(updated).toMatchObject({ title: 'New', status: 'SHIPPED' })
  })

  it('deletes an item and redirects to its product roadmap', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'Del',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const redirectPath = await captureRedirect(() => deleteRoadmapItem(item.id))
    expect(redirectPath).toBe(`/pm?productId=${product.id}`)
    expect(await prisma.roadmapItem.findUnique({ where: { id: item.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'Pin',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    await toggleRoadmapItemPinned(item.id, true)
    expect((await prisma.roadmapItem.findUnique({ where: { id: item.id } }))?.pinned).toBe(true)
  })
})
