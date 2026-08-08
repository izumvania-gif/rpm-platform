'use server'

import { revalidatePath } from 'next/cache'
import type { ProcessStep } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ActionResult = { ok: true } | { ok: false; error: string }

// Process canvas actions (plans/platform-views-plan.md §3) — mirrors the
// shape of lib/actions/jtbd-graph.ts (quick-create, save positions, create/
// delete edge) but simpler: one canonical layout per product (position
// lives directly on ProcessStep.x/y, no per-view JtbdGraphLayout equivalent)
// and no hierarchy/reparent-on-drag logic — a process step doesn't nest
// inside another the way a JTBD can.
export async function createProcessStepQuick(
  productId: string,
  title: string,
  x: number,
  y: number,
  assignedPersonId?: string
): Promise<{ ok: true; step: ProcessStep } | { ok: false; error: string }> {
  const trimmedTitle = title.trim()
  if (!productId || !trimmedTitle) {
    return { ok: false, error: 'Укажите название шага' }
  }

  const step = await prisma.processStep.create({
    data: {
      title: trimmedTitle,
      x,
      y,
      productId,
      assignedPersonId: assignedPersonId || undefined,
    },
  })
  revalidatePath('/pm')
  return { ok: true, step }
}

export async function updateProcessStep(
  id: string,
  data: { title: string; assignedPersonId: string | null }
): Promise<ActionResult> {
  const title = data.title.trim()
  if (!title) return { ok: false, error: 'Название не может быть пустым' }

  await prisma.processStep.update({
    where: { id },
    data: { title, assignedPersonId: data.assignedPersonId },
  })
  revalidatePath('/pm')
  return { ok: true }
}

export async function deleteProcessStep(id: string): Promise<void> {
  await prisma.processStep.delete({ where: { id } })
  revalidatePath('/pm')
}

export async function saveProcessStepPositions(
  entries: { stepId: string; x: number; y: number }[]
): Promise<void> {
  if (entries.length === 0) return
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.processStep.update({
        where: { id: entry.stepId },
        data: { x: entry.x, y: entry.y },
      })
    )
  )
  revalidatePath('/pm')
}

export async function createProcessEdge(
  fromStepId: string,
  toStepId: string,
  label?: string
): Promise<ActionResult> {
  if (fromStepId === toStepId) {
    return { ok: false, error: 'Шаг не может вести сам в себя' }
  }

  try {
    await prisma.processEdge.create({
      data: { fromStepId, toStepId, label: label?.trim() || undefined },
    })
  } catch {
    return { ok: false, error: 'Такая связь уже существует' }
  }
  revalidatePath('/pm')
  return { ok: true }
}

export async function deleteProcessEdge(id: string): Promise<void> {
  await prisma.processEdge.delete({ where: { id } })
  revalidatePath('/pm')
}
