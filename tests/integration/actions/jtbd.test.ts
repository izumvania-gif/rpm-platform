import { beforeEach, describe, expect, it } from 'vitest'
import {
  createJtbd,
  deleteJtbd,
  toggleJtbdPinned,
  updateJtbd,
  updateJtbdField,
} from '@/lib/actions/jtbd'
import {
  createJtbdQuick,
  createJtbdSequenceEdge,
  deleteJtbdSequenceEdge,
  saveJtbdGraphPositions,
  setJtbdParent,
} from '@/lib/actions/jtbd-graph'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createJtbd', () => {
  it('creates a JTBD and connects it to multiple segments', async () => {
    const product = await createTestProduct()
    const segmentA = await prisma.segment.create({
      data: {
        name: 'A',
        slug: 'a',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const segmentB = await prisma.segment.create({
      data: {
        name: 'B',
        slug: 'b',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })

    const formData = buildFormData(
      {
        title: 'Когда я планирую отпуск, я хочу быстро сравнить цены',
        category: 'Планирование',
        jobType: 'CORE_JOB',
        confirmed: 'on',
        productId: product.id,
      },
      { segmentIds: [segmentA.id, segmentB.id] }
    )

    const redirectPath = await captureRedirect(() => createJtbd(formData))
    const id = redirectPath.split('/').pop()!
    const jtbd = await prisma.jTBD.findUnique({ where: { id }, include: { segments: true } })
    expect(jtbd?.segments.map((s) => s.id).sort()).toEqual([segmentA.id, segmentB.id].sort())
    expect(jtbd?.confirmed).toBe(true)
  })
})

describe('updateJtbd', () => {
  it('replaces the segment set and honors redirectTo', async () => {
    const product = await createTestProduct()
    const segmentA = await prisma.segment.create({
      data: {
        name: 'A',
        slug: 'a',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const segmentB = await prisma.segment.create({
      data: {
        name: 'B',
        slug: 'b',
        color: '#3B82F6',
        tags: [],
        productId: product.id,
        userId: product.userId,
      },
    })
    const jtbd = await prisma.jTBD.create({
      data: {
        title: 'T',
        category: 'C',
        productId: product.id,
        userId: product.userId,
        segments: { connect: { id: segmentA.id } },
      },
    })

    const formData = buildFormData(
      {
        title: 'T2',
        category: 'C',
        jobType: 'SMALL_JOB',
        productId: product.id,
        redirectTo: '/jtbd/graph',
      },
      { segmentIds: [segmentB.id] }
    )
    const redirectPath = await captureRedirect(() => updateJtbd(jtbd.id, formData))
    expect(redirectPath).toBe('/jtbd/graph')

    const updated = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      include: { segments: true },
    })
    expect(updated?.segments.map((s) => s.id)).toEqual([segmentB.id])
  })
})

describe('deleteJtbd / toggleJtbdPinned', () => {
  it('deletes a JTBD', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteJtbd(jtbd.id))
    expect(redirectPath).toBe('/jtbd')
    expect(await prisma.jTBD.findUnique({ where: { id: jtbd.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    await toggleJtbdPinned(jtbd.id, true)
    expect((await prisma.jTBD.findUnique({ where: { id: jtbd.id } }))?.pinned).toBe(true)
  })
})

describe('updateJtbdField', () => {
  it('rejects an invalid jobType', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })
    const result = await updateJtbdField(jtbd.id, 'jobType', 'NOT_A_TYPE')
    expect(result.ok).toBe(false)
  })
})

describe('jtbd-graph actions', () => {
  it('setJtbdParent reparents a node', async () => {
    const product = await createTestProduct()
    const parent = await prisma.jTBD.create({
      data: { title: 'Parent', category: 'C', productId: product.id, userId: product.userId },
    })
    const child = await prisma.jTBD.create({
      data: { title: 'Child', category: 'C', productId: product.id, userId: product.userId },
    })

    const result = await setJtbdParent(child.id, parent.id)
    expect(result).toEqual({ ok: true })
    expect((await prisma.jTBD.findUnique({ where: { id: child.id } }))?.parentId).toBe(parent.id)
  })

  it("setJtbdParent rejects making a node its own descendant's child", async () => {
    const product = await createTestProduct()
    const grandparent = await prisma.jTBD.create({
      data: { title: 'GP', category: 'C', productId: product.id, userId: product.userId },
    })
    const parent = await prisma.jTBD.create({
      data: {
        title: 'P',
        category: 'C',
        productId: product.id,
        userId: product.userId,
        parentId: grandparent.id,
      },
    })

    const result = await setJtbdParent(grandparent.id, parent.id)
    expect(result.ok).toBe(false)
  })

  it('createJtbdSequenceEdge links two JTBDs and rejects a duplicate', async () => {
    const product = await createTestProduct()
    const a = await prisma.jTBD.create({
      data: { title: 'A', category: 'C', productId: product.id, userId: product.userId },
    })
    const b = await prisma.jTBD.create({
      data: { title: 'B', category: 'C', productId: product.id, userId: product.userId },
    })

    const first = await createJtbdSequenceEdge(a.id, b.id)
    expect(first).toEqual({ ok: true })
    const duplicate = await createJtbdSequenceEdge(a.id, b.id)
    expect(duplicate.ok).toBe(false)

    const edge = await prisma.jtbdSequenceEdge.findFirst({
      where: { fromJtbdId: a.id, toJtbdId: b.id },
    })
    expect(edge).not.toBeNull()
    await deleteJtbdSequenceEdge(edge!.id)
    expect(await prisma.jtbdSequenceEdge.count()).toBe(0)
  })

  it('createJtbdQuick creates a JTBD with segments in one call', async () => {
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

    const result = await createJtbdQuick(product.id, 'Quick job', 'Category', 'MICRO_JOB', [
      segment.id,
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.jtbd.jobType).toBe('MICRO_JOB')
    }
  })

  it('saveJtbdGraphPositions upserts positions per view', async () => {
    const product = await createTestProduct()
    const jtbd = await prisma.jTBD.create({
      data: { title: 'T', category: 'C', productId: product.id, userId: product.userId },
    })

    await saveJtbdGraphPositions([{ jtbdId: jtbd.id, x: 10, y: 20 }], 'overall')
    let layout = await prisma.jtbdGraphLayout.findUnique({
      where: { jtbdId_viewKey: { jtbdId: jtbd.id, viewKey: 'overall' } },
    })
    expect(layout).toMatchObject({ x: 10, y: 20 })

    await saveJtbdGraphPositions([{ jtbdId: jtbd.id, x: 30, y: 40 }], 'overall')
    layout = await prisma.jtbdGraphLayout.findUnique({
      where: { jtbdId_viewKey: { jtbdId: jtbd.id, viewKey: 'overall' } },
    })
    expect(layout).toMatchObject({ x: 30, y: 40 })
  })
})

describe('createJtbd, where it lands afterwards', () => {
  it('returns to the page that sent you, when one was given', async () => {
    // «Новый JTBD» on the list page carries ?from=/jtbd, so adding five jobs
    // does not mean walking back from five detail pages.
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Когда возврат, я хочу вернуться в список',
      category: 'Навигация',
      productId: product.id,
      redirectTo: '/jtbd',
    })
    expect(await captureRedirect(() => createJtbd(formData))).toBe('/jtbd')
  })

  it('falls back to the new record when no origin was given', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Когда пришли не из списка, я хочу увидеть запись',
      category: 'Навигация',
      productId: product.id,
    })
    expect(await captureRedirect(() => createJtbd(formData))).toMatch(/^\/jtbd\/c[a-z0-9]+$/)
  })

  it('ignores an off-site destination rather than bouncing the browser', async () => {
    // The value arrives from a hidden field, so a crafted link must not be
    // able to send someone elsewhere after a successful save.
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Когда подсунули чужой адрес, я хочу остаться здесь',
      category: 'Навигация',
      productId: product.id,
      redirectTo: 'https://evil.example/steal',
    })
    expect(await captureRedirect(() => createJtbd(formData))).toMatch(/^\/jtbd\/c[a-z0-9]+$/)
  })
})
