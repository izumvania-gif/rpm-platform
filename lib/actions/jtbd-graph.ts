'use server'

import { revalidatePath } from 'next/cache'
import { JtbdJobType, type JTBD } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'

type ActionResult = { ok: true } | { ok: false; error: string }

async function isDescendant(rootId: string, candidateId: string, userId: string): Promise<boolean> {
  const children = await prisma.jTBD.findMany({
    where: { parentId: rootId, userId },
    select: { id: true },
  })
  for (const child of children) {
    if (child.id === candidateId) return true
    if (await isDescendant(child.id, candidateId, userId)) return true
  }
  return false
}

export async function setJtbdParent(id: string, parentId: string | null): Promise<ActionResult> {
  const denied = await denyUnowned('jtbd', id, getCurrentUserId())
  if (denied) return denied

  const userId = getCurrentUserId()

  if (parentId === id) {
    return { ok: false, error: 'Задача не может быть родителем самой себе' }
  }

  if (parentId) {
    const parent = await prisma.jTBD.findFirst({ where: { id: parentId, userId } })
    if (!parent) return { ok: false, error: 'Родительская задача не найдена' }
    if (await isDescendant(id, parentId, userId)) {
      return { ok: false, error: 'Нельзя сделать родителем собственного потомка' }
    }
  }

  await prisma.jTBD.update({ where: { id }, data: { parentId } })
  revalidatePath('/jtbd/graph')
  return { ok: true }
}

export async function createJtbdSequenceEdge(
  fromJtbdId: string,
  toJtbdId: string
): Promise<ActionResult> {
  if (fromJtbdId === toJtbdId) {
    return { ok: false, error: 'Задача не может предшествовать самой себе' }
  }

  // BOTH endpoints, not just one: an edge is a write that touches two records,
  // and checking only the source would let a foreign job be linked in as the
  // target.
  const userId = getCurrentUserId()
  const denied =
    (await denyUnowned('jtbd', fromJtbdId, userId)) ?? (await denyUnowned('jtbd', toJtbdId, userId))
  if (denied) return denied

  try {
    await prisma.jtbdSequenceEdge.create({ data: { fromJtbdId, toJtbdId } })
  } catch {
    return { ok: false, error: 'Такая связь уже существует' }
  }
  revalidatePath('/jtbd/graph')
  return { ok: true }
}

export async function deleteJtbdSequenceEdge(id: string): Promise<void> {
  // Returns void, so there is no channel to hand an error back through —
  // an unowned edge raises a 404 like the other void actions.
  await assertOwned('jtbdSequenceEdge', id, getCurrentUserId())

  await prisma.jtbdSequenceEdge.delete({ where: { id } })
  revalidatePath('/jtbd/graph')
}

export async function createJtbdQuick(
  productId: string,
  title: string,
  category: string,
  jobType: JtbdJobType,
  segmentIds?: string[]
): Promise<{ ok: true; jtbd: JTBD } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedTitle = title.trim()
  const trimmedCategory = category.trim()
  if (!productId || !trimmedTitle || !trimmedCategory) {
    return { ok: false, error: 'Укажите продукт, формулировку и категорию' }
  }
  if (!Object.values(JtbdJobType).includes(jobType)) {
    return { ok: false, error: 'Некорректный тип задачи' }
  }

  const jtbd = await prisma.jTBD.create({
    data: {
      title: trimmedTitle,
      category: trimmedCategory,
      jobType,
      productId,
      segments: { connect: (segmentIds ?? []).map((id) => ({ id })) },
      userId: getCurrentUserId(),
    },
  })
  revalidatePath('/jtbd/graph')
  revalidatePath('/jtbd')
  revalidatePath(`/products/${productId}/onboarding/jtbd`)
  return { ok: true, jtbd }
}

export async function saveJtbdGraphPositions(
  entries: { jtbdId: string; x: number; y: number }[],
  viewKey: string
): Promise<void> {
  if (entries.length === 0) return

  // Every id in the batch is checked. A layout save is a bulk write driven
  // entirely by client-supplied ids, so one unowned entry is enough to write
  // into someone else's graph.
  const userId = getCurrentUserId()
  for (const entry of entries) {
    await assertOwned('jtbd', entry.jtbdId, userId)
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.jtbdGraphLayout.upsert({
        where: { jtbdId_viewKey: { jtbdId: entry.jtbdId, viewKey } },
        create: { jtbdId: entry.jtbdId, viewKey, x: entry.x, y: entry.y },
        update: { x: entry.x, y: entry.y },
      })
    )
  )
  revalidatePath('/jtbd/graph')
}
