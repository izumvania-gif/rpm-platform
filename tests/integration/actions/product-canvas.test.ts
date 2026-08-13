import { beforeEach, describe, expect, it } from 'vitest'
import {
  createCanvasNode,
  linkCanvasNodes,
  saveCanvasPositions,
  unlinkCanvasNodes,
} from '@/lib/actions/product-canvas'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

async function seedChain() {
  const product = await createTestProduct()
  const segment = await prisma.segment.create({
    data: {
      name: 'Банки',
      slug: `banks-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tags: [],
      productId: product.id,
      userId: DEFAULT_USER_ID,
    },
  })
  const jtbd = await prisma.jTBD.create({
    data: {
      title: 'Выпустить сертификат',
      category: 'Онбординг',
      tags: [],
      productId: product.id,
      userId: DEFAULT_USER_ID,
    },
  })
  const hypothesis = await prisma.hypothesis.create({
    data: { statement: 'Если A, то B', tags: [], productId: product.id, userId: DEFAULT_USER_ID },
  })
  return { product, segment, jtbd, hypothesis }
}

describe('linkCanvasNodes', () => {
  it('links a segment to a job', async () => {
    const { product, segment, jtbd } = await seedChain()
    const result = await linkCanvasNodes(
      product.id,
      { kind: 'SEGMENT', id: segment.id },
      { kind: 'JTBD', id: jtbd.id }
    )
    expect(result).toEqual({ ok: true })

    const withJtbds = await prisma.segment.findUniqueOrThrow({
      where: { id: segment.id },
      include: { jtbds: true },
    })
    expect(withJtbds.jtbds.map((j) => j.id)).toEqual([jtbd.id])
  })

  it('links a job to a hypothesis', async () => {
    const { product, jtbd, hypothesis } = await seedChain()
    await linkCanvasNodes(
      product.id,
      { kind: 'JTBD', id: jtbd.id },
      { kind: 'HYPOTHESIS', id: hypothesis.id }
    )
    const updated = await prisma.hypothesis.findUniqueOrThrow({ where: { id: hypothesis.id } })
    expect(updated.jtbdId).toBe(jtbd.id)
  })

  it('refuses a link that runs against the chain', async () => {
    const { product, segment, jtbd } = await seedChain()
    const result = await linkCanvasNodes(
      product.id,
      { kind: 'JTBD', id: jtbd.id },
      { kind: 'SEGMENT', id: segment.id }
    )
    expect(result).toEqual({ ok: false, error: 'Такую связь провести нельзя' })
  })

  it('refuses to link a record belonging to another product', async () => {
    // The client supplies both ids, so a valid product id must not be enough
    // to pull a foreign record into this graph.
    const { product, segment } = await seedChain()
    const other = await createTestProduct({ slug: `other-${Date.now()}` })
    const foreignJtbd = await prisma.jTBD.create({
      data: {
        title: 'Чужая задача',
        category: 'X',
        tags: [],
        productId: other.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const result = await linkCanvasNodes(
      product.id,
      { kind: 'SEGMENT', id: segment.id },
      { kind: 'JTBD', id: foreignJtbd.id }
    )
    expect(result).toEqual({ ok: false, error: 'Запись не найдена в этом продукте' })

    const check = await prisma.segment.findUniqueOrThrow({
      where: { id: segment.id },
      include: { jtbds: true },
    })
    expect(check.jtbds).toHaveLength(0)
  })

  it('refuses to touch another user’s product', async () => {
    const { segment, jtbd } = await seedChain()
    const otherUser = await prisma.user.create({
      data: { email: `other-canvas-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-canvas-${Date.now()}`, userId: otherUser.id },
    })
    expect(
      await linkCanvasNodes(
        foreign.id,
        { kind: 'SEGMENT', id: segment.id },
        { kind: 'JTBD', id: jtbd.id }
      )
    ).toEqual({ ok: false, error: 'Продукт не найден' })
  })
})

describe('unlinkCanvasNodes', () => {
  it('removes a segment-job link without deleting either record', async () => {
    const { product, segment, jtbd } = await seedChain()
    await linkCanvasNodes(
      product.id,
      { kind: 'SEGMENT', id: segment.id },
      { kind: 'JTBD', id: jtbd.id }
    )
    await unlinkCanvasNodes(
      product.id,
      { kind: 'SEGMENT', id: segment.id },
      { kind: 'JTBD', id: jtbd.id }
    )

    const check = await prisma.segment.findUniqueOrThrow({
      where: { id: segment.id },
      include: { jtbds: true },
    })
    expect(check.jtbds).toHaveLength(0)
    expect(await prisma.jTBD.count({ where: { id: jtbd.id } })).toBe(1)
  })

  it('clears a hypothesis link but keeps the hypothesis', async () => {
    // Cutting an edge must never destroy a record the user thought about.
    const { product, jtbd, hypothesis } = await seedChain()
    await linkCanvasNodes(
      product.id,
      { kind: 'JTBD', id: jtbd.id },
      { kind: 'HYPOTHESIS', id: hypothesis.id }
    )
    await unlinkCanvasNodes(
      product.id,
      { kind: 'JTBD', id: jtbd.id },
      { kind: 'HYPOTHESIS', id: hypothesis.id }
    )

    const updated = await prisma.hypothesis.findUniqueOrThrow({ where: { id: hypothesis.id } })
    expect(updated.jtbdId).toBeNull()
    expect(updated.statement).toBe('Если A, то B')
  })
})

describe('saveCanvasPositions', () => {
  it('stores and then updates a node position', async () => {
    const { product, segment } = await seedChain()
    await saveCanvasPositions(product.id, [{ kind: 'SEGMENT', id: segment.id, x: 10, y: 20 }])
    await saveCanvasPositions(product.id, [{ kind: 'SEGMENT', id: segment.id, x: 30, y: 40 }])

    const rows = await prisma.productCanvasLayout.findMany({ where: { productId: product.id } })
    expect(rows).toHaveLength(1)
    expect({ x: rows[0].x, y: rows[0].y }).toEqual({ x: 30, y: 40 })
  })

  it('keeps positions separate for records of different kinds sharing an id', async () => {
    const { product } = await seedChain()
    await saveCanvasPositions(product.id, [
      { kind: 'SEGMENT', id: 'same', x: 1, y: 1 },
      { kind: 'JTBD', id: 'same', x: 2, y: 2 },
    ])
    expect(await prisma.productCanvasLayout.count({ where: { productId: product.id } })).toBe(2)
  })

  it('rejects an unowned product', async () => {
    expect(await saveCanvasPositions('nope', [{ kind: 'SEGMENT', id: 'x', x: 0, y: 0 }])).toEqual({
      ok: false,
      error: 'Продукт не найден',
    })
  })
})

describe('createCanvasNode', () => {
  it('creates a segment at the double-clicked point', async () => {
    const product = await createTestProduct()
    const result = await createCanvasNode(product.id, {
      kind: 'SEGMENT',
      title: 'Госзаказчики',
      x: 120,
      y: 240,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const layout = await prisma.productCanvasLayout.findFirstOrThrow({
      where: { productId: product.id, nodeId: result.id },
    })
    expect({ x: layout.x, y: layout.y }).toEqual({ x: 120, y: 240 })
    expect(await prisma.segment.count({ where: { id: result.id } })).toBe(1)
  })

  it('gives colliding segment names distinct slugs', async () => {
    const product = await createTestProduct()
    const a = await createCanvasNode(product.id, { kind: 'SEGMENT', title: 'Банки', x: 0, y: 0 })
    const b = await createCanvasNode(product.id, { kind: 'SEGMENT', title: 'банки!', x: 0, y: 0 })
    expect(a.ok && b.ok).toBe(true)
    const slugs = await prisma.segment.findMany({
      where: { productId: product.id },
      select: { slug: true },
    })
    expect(new Set(slugs.map((s) => s.slug)).size).toBe(2)
  })

  it('refuses a job without a category rather than inventing one', async () => {
    // A placeholder category would corrupt the coverage and gaps reports.
    const product = await createTestProduct()
    expect(
      await createCanvasNode(product.id, { kind: 'JTBD', title: 'Задача', x: 0, y: 0 })
    ).toEqual({ ok: false, error: 'У задачи клиента нужна категория' })
    expect(await prisma.jTBD.count({ where: { productId: product.id } })).toBe(0)
  })

  it('creates a job when the category is supplied', async () => {
    const product = await createTestProduct()
    const result = await createCanvasNode(product.id, {
      kind: 'JTBD',
      title: 'Выпустить сертификат',
      category: 'Онбординг',
      x: 5,
      y: 5,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const created = await prisma.jTBD.findUniqueOrThrow({ where: { id: result.id } })
    expect(created.category).toBe('Онбординг')
  })

  it('creates a hypothesis in DRAFT', async () => {
    const product = await createTestProduct()
    const result = await createCanvasNode(product.id, {
      kind: 'HYPOTHESIS',
      title: 'Если A, то B',
      x: 0,
      y: 0,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const created = await prisma.hypothesis.findUniqueOrThrow({ where: { id: result.id } })
    expect(created.status).toBe('DRAFT')
  })

  it('rejects a blank title', async () => {
    const product = await createTestProduct()
    expect(
      await createCanvasNode(product.id, { kind: 'SEGMENT', title: '   ', x: 0, y: 0 })
    ).toEqual({ ok: false, error: 'Введите название' })
  })

  it('refuses to create inside another user’s product', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-create-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-create-${Date.now()}`, userId: otherUser.id },
    })
    expect(
      await createCanvasNode(foreign.id, { kind: 'SEGMENT', title: 'Банки', x: 0, y: 0 })
    ).toEqual({ ok: false, error: 'Продукт не найден' })
    expect(await prisma.segment.count({ where: { productId: foreign.id } })).toBe(0)
  })
})
