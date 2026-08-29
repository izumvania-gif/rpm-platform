import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRoadmapItem,
  createRoadmapItemQuick,
  deleteRoadmapItem,
  toggleRoadmapItemPinned,
  updateRoadmapItem,
  updateRoadmapItemDates,
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
    expect(redirectPath).toBe(`/pm/roadmap?productId=${product.id}`)

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
    const formData = buildFormData({
      title: '  ',
      status: 'PLANNED',
      visibility: 'INTERNAL',
      productId: product.id,
    })
    const redirectPath = await captureRedirect(() => createRoadmapItem(formData))
    expect(redirectPath).toMatch(/^\/pm\/roadmap\/new\?productId=.*&error=/)
    expect(await prisma.roadmapItem.count()).toBe(0)
  })

  it('creates a Gantt bar item with track/trackGroup/dates', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Frontend redesign',
      status: 'PLANNED',
      visibility: 'INTERNAL',
      productId: product.id,
      trackGroup: 'Разработка',
      track: 'Фронт',
      startDate: '2026-09-01',
      endDate: '2026-09-20',
    })
    const redirectPath = await captureRedirect(() => createRoadmapItem(formData))
    expect(redirectPath).toBe(`/pm/roadmap?productId=${product.id}`)

    const item = await prisma.roadmapItem.findFirst({ where: { productId: product.id } })
    expect(item).toMatchObject({
      trackGroup: 'Разработка',
      track: 'Фронт',
      isMilestone: false,
    })
    expect(item?.startDate?.toISOString().slice(0, 10)).toBe('2026-09-01')
    expect(item?.endDate?.toISOString().slice(0, 10)).toBe('2026-09-20')
  })

  it('creates a milestone item', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'v2.5',
      status: 'PLANNED',
      visibility: 'INTERNAL',
      productId: product.id,
      startDate: '2026-09-25',
      isMilestone: 'on',
    })
    const redirectPath = await captureRedirect(() => createRoadmapItem(formData))
    expect(redirectPath).toBe(`/pm/roadmap?productId=${product.id}`)

    const item = await prisma.roadmapItem.findFirst({ where: { productId: product.id } })
    expect(item?.isMilestone).toBe(true)
    expect(item?.startDate?.toISOString().slice(0, 10)).toBe('2026-09-25')
  })

  it('rejects an end date before the start date', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Backwards',
      status: 'PLANNED',
      visibility: 'INTERNAL',
      productId: product.id,
      startDate: '2026-09-20',
      endDate: '2026-09-01',
    })
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
    expect(redirectPath).toBe(`/pm/roadmap?productId=${product.id}`)

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
    expect(redirectPath).toBe(`/pm/roadmap?productId=${product.id}`)
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

describe('createRoadmapItemQuick', () => {
  it('creates an item with the trimmed field set, no redirect', async () => {
    const product = await createTestProduct()
    const owner = await prisma.person.create({
      data: { name: 'Quick Owner', skills: [], userId: DEFAULT_USER_ID },
    })

    const result = await createRoadmapItemQuick(
      product.id,
      'Ship v2',
      'IN_PROGRESS',
      '2026 Q4',
      owner.id
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.item).toMatchObject({
      title: 'Ship v2',
      status: 'IN_PROGRESS',
      quarter: '2026 Q4',
      ownerId: owner.id,
      visibility: 'INTERNAL',
      productId: product.id,
    })
    expect(result.item.owner).toMatchObject({ id: owner.id })
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const result = await createRoadmapItemQuick(product.id, '   ', 'PLANNED', '', '')
    expect(result.ok).toBe(false)
  })
})

describe('updateRoadmapItemDates', () => {
  it('moves a bar (both dates shift, track untouched)', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'Bar',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
        track: 'Фронт',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-20'),
      },
    })

    const result = await updateRoadmapItemDates(
      item.id,
      new Date('2026-09-05').toISOString(),
      new Date('2026-09-24').toISOString()
    )
    expect(result.ok).toBe(true)

    const updated = await prisma.roadmapItem.findUnique({ where: { id: item.id } })
    expect(updated?.startDate?.toISOString().slice(0, 10)).toBe('2026-09-05')
    expect(updated?.endDate?.toISOString().slice(0, 10)).toBe('2026-09-24')
    expect(updated?.track).toBe('Фронт')
  })

  it('reassigns the track when one is passed', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'Bar',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
        track: 'Фронт',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-20'),
      },
    })

    const result = await updateRoadmapItemDates(
      item.id,
      new Date('2026-09-01').toISOString(),
      new Date('2026-09-20').toISOString(),
      'Бэк'
    )
    expect(result.ok).toBe(true)
    expect((await prisma.roadmapItem.findUnique({ where: { id: item.id } }))?.track).toBe('Бэк')
  })

  it('moves a milestone by start date only, leaving endDate untouched', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'v2.5',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
        isMilestone: true,
        startDate: new Date('2026-09-30'),
      },
    })

    const result = await updateRoadmapItemDates(item.id, new Date('2026-10-02').toISOString())
    expect(result.ok).toBe(true)

    const updated = await prisma.roadmapItem.findUnique({ where: { id: item.id } })
    expect(updated?.startDate?.toISOString().slice(0, 10)).toBe('2026-10-02')
    expect(updated?.endDate).toBeNull()
  })

  it('rejects an end date before the start date', async () => {
    const product = await createTestProduct()
    const item = await prisma.roadmapItem.create({
      data: {
        title: 'Bar',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
        startDate: new Date('2026-09-10'),
        endDate: new Date('2026-09-20'),
      },
    })

    const result = await updateRoadmapItemDates(
      item.id,
      new Date('2026-09-25').toISOString(),
      new Date('2026-09-20').toISOString()
    )
    expect(result.ok).toBe(false)

    const unchanged = await prisma.roadmapItem.findUnique({ where: { id: item.id } })
    expect(unchanged?.startDate?.toISOString().slice(0, 10)).toBe('2026-09-10')
  })
})
