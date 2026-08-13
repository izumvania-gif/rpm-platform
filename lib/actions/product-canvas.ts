'use server'

import { revalidatePath } from 'next/cache'
import { CanvasNodeKind, JtbdJobType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { slugify } from '@/lib/utils'
import { canLink, relationFor, type CanvasKind } from '@/lib/product-canvas'

// Writes behind the product canvas (plans/2.0-product-leap-plan.md, C2).
//
// Direct manipulation means every gesture is a real mutation, so each one
// verifies the product belongs to the caller *and* that the records involved
// belong to that product before touching anything — a canvas takes ids from
// the client, and without the second check a valid product id would be enough
// to link someone else's records into your graph.

// `object` and not `undefined` as the default: `{ ok: true } & undefined`
// collapses to never, which makes every success branch a type error.
type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string }

async function ownedProduct(productId: string) {
  if (!productId) return null
  return prisma.product.findFirst({ where: { id: productId, userId: getCurrentUserId() } })
}

function revalidateCanvas(productId: string) {
  revalidatePath(`/products/${productId}/canvas`)
  revalidatePath(`/products/${productId}`)
}

export async function saveCanvasPositions(
  productId: string,
  entries: { kind: CanvasKind; id: string; x: number; y: number }[]
): Promise<Result> {
  const product = await ownedProduct(productId)
  if (!product) return { ok: false, error: 'Продукт не найден' }
  if (entries.length === 0) return { ok: true }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.productCanvasLayout.upsert({
        where: {
          productId_nodeKind_nodeId: {
            productId,
            nodeKind: entry.kind as CanvasNodeKind,
            nodeId: entry.id,
          },
        },
        create: {
          productId,
          nodeKind: entry.kind as CanvasNodeKind,
          nodeId: entry.id,
          x: entry.x,
          y: entry.y,
        },
        update: { x: entry.x, y: entry.y },
      })
    )
  )
  // Deliberately no revalidatePath: moving a node is a layout change the
  // client already shows, and refreshing the route would fight the drag.
  return { ok: true }
}

/** Confirms both endpoints really live in this product before linking them. */
async function endpointsBelong(
  productId: string,
  source: { kind: CanvasKind; id: string },
  target: { kind: CanvasKind; id: string }
): Promise<boolean> {
  const exists = async (kind: CanvasKind, id: string) => {
    if (kind === 'SEGMENT') return !!(await prisma.segment.findFirst({ where: { id, productId } }))
    if (kind === 'JTBD') return !!(await prisma.jTBD.findFirst({ where: { id, productId } }))
    return !!(await prisma.hypothesis.findFirst({ where: { id, productId } }))
  }
  const [a, b] = await Promise.all([exists(source.kind, source.id), exists(target.kind, target.id)])
  return a && b
}

export async function linkCanvasNodes(
  productId: string,
  source: { kind: CanvasKind; id: string },
  target: { kind: CanvasKind; id: string }
): Promise<Result> {
  const product = await ownedProduct(productId)
  if (!product) return { ok: false, error: 'Продукт не найден' }

  const relation = relationFor(source.kind, target.kind)
  if (!relation || !canLink(source.kind, target.kind)) {
    return { ok: false, error: 'Такую связь провести нельзя' }
  }
  if (!(await endpointsBelong(productId, source, target))) {
    return { ok: false, error: 'Запись не найдена в этом продукте' }
  }

  if (relation === 'segment-jtbd') {
    await prisma.segment.update({
      where: { id: source.id },
      data: { jtbds: { connect: { id: target.id } } },
    })
  } else {
    await prisma.hypothesis.update({ where: { id: target.id }, data: { jtbdId: source.id } })
  }

  revalidateCanvas(productId)
  return { ok: true }
}

export async function unlinkCanvasNodes(
  productId: string,
  source: { kind: CanvasKind; id: string },
  target: { kind: CanvasKind; id: string }
): Promise<Result> {
  const product = await ownedProduct(productId)
  if (!product) return { ok: false, error: 'Продукт не найден' }

  const relation = relationFor(source.kind, target.kind)
  if (!relation) return { ok: false, error: 'Такой связи нет' }
  if (!(await endpointsBelong(productId, source, target))) {
    return { ok: false, error: 'Запись не найдена в этом продукте' }
  }

  if (relation === 'segment-jtbd') {
    await prisma.segment.update({
      where: { id: source.id },
      data: { jtbds: { disconnect: { id: target.id } } },
    })
  } else {
    // Only clears the link, never deletes the hypothesis: cutting an edge on a
    // canvas must not destroy a record the user spent thought on.
    await prisma.hypothesis.update({ where: { id: target.id }, data: { jtbdId: null } })
  }

  revalidateCanvas(productId)
  return { ok: true }
}

export async function createCanvasNode(
  productId: string,
  input: { kind: CanvasKind; title: string; category?: string; x: number; y: number }
): Promise<Result<{ id: string }>> {
  const product = await ownedProduct(productId)
  if (!product) return { ok: false, error: 'Продукт не найден' }

  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Введите название' }

  const userId = getCurrentUserId()
  let id: string

  if (input.kind === 'SEGMENT') {
    const base = slugify(title) || 'segment'
    const taken = new Set(
      (await prisma.segment.findMany({ where: { productId }, select: { slug: true } })).map(
        (s) => s.slug
      )
    )
    let slug = base
    let n = 2
    while (taken.has(slug)) slug = `${base}-${n++}`
    const created = await prisma.segment.create({
      data: { name: title, slug, tags: [], productId, userId },
    })
    id = created.id
  } else if (input.kind === 'JTBD') {
    // A category is required rather than defaulted: a JTBD with a placeholder
    // category poisons the coverage and gaps reports the model exists to feed.
    // Same line drawn in bulk entry (A1) and the Inbox (B1).
    const category = input.category?.trim()
    if (!category) return { ok: false, error: 'У задачи клиента нужна категория' }
    const created = await prisma.jTBD.create({
      data: {
        title,
        category,
        jobType: JtbdJobType.SMALL_JOB,
        tags: [],
        productId,
        userId,
      },
    })
    id = created.id
  } else {
    const created = await prisma.hypothesis.create({
      data: { statement: title, tags: [], productId, userId },
    })
    id = created.id
  }

  await prisma.productCanvasLayout.create({
    data: { productId, nodeKind: input.kind as CanvasNodeKind, nodeId: id, x: input.x, y: input.y },
  })

  revalidateCanvas(productId)
  revalidatePath('/segments')
  revalidatePath('/jtbd')
  revalidatePath('/hypotheses')
  return { ok: true, id }
}
