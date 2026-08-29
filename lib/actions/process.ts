'use server'

import { revalidatePath } from 'next/cache'
import type { ProcessStep } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'

type ActionResult = { ok: true } | { ok: false; error: string }

// Process canvas actions (plans/platform-views-plan.md §3) — mirrors the
// shape of lib/actions/jtbd-graph.ts (quick-create, save positions, create/
// delete edge) but simpler: one canonical layout per process (position
// lives directly on ProcessStep.x/y, no per-view JtbdGraphLayout equivalent)
// and no hierarchy/reparent-on-drag logic — a process step doesn't nest
// inside another the way a JTBD can. §10: steps belong to a Process, not
// directly to a Product — a product can describe several separate processes.
export async function createProcessStepQuick(
  processId: string,
  title: string,
  x: number,
  y: number,
  assignedPersonId?: string
): Promise<{ ok: true; step: ProcessStep } | { ok: false; error: string }> {
  const denied = await denyUnowned('process', processId, getCurrentUserId())
  if (denied) return denied

  const trimmedTitle = title.trim()
  if (!processId || !trimmedTitle) {
    return { ok: false, error: 'Укажите название шага' }
  }

  const step = await prisma.processStep.create({
    data: {
      title: trimmedTitle,
      x,
      y,
      processId,
      assignedPersonId: assignedPersonId || undefined,
    },
  })
  revalidatePath('/pm/processes')
  return { ok: true, step }
}

export async function updateProcessStep(
  id: string,
  data: { title: string; assignedPersonId: string | null }
): Promise<ActionResult> {
  const denied = await denyUnowned('processStep', id, getCurrentUserId())
  if (denied) return denied

  const title = data.title.trim()
  if (!title) return { ok: false, error: 'Название не может быть пустым' }

  await prisma.processStep.update({
    where: { id },
    data: { title, assignedPersonId: data.assignedPersonId },
  })
  revalidatePath('/pm/processes')
  return { ok: true }
}

export async function deleteProcessStep(id: string): Promise<void> {
  // Void return — no channel for an error, so an unowned record 404s.
  await assertOwned('processStep', id, getCurrentUserId())

  await prisma.processStep.delete({ where: { id } })
  revalidatePath('/pm/processes')
}

export async function saveProcessStepPositions(
  entries: { stepId: string; x: number; y: number }[]
): Promise<void> {
  if (entries.length === 0) return

  // Same reasoning as saveJtbdGraphPositions: a bulk write driven by
  // client-supplied ids has to check every one of them.
  const userId = getCurrentUserId()
  for (const entry of entries) {
    await assertOwned('processStep', entry.stepId, userId)
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.processStep.update({
        where: { id: entry.stepId },
        data: { x: entry.x, y: entry.y },
      })
    )
  )
  revalidatePath('/pm/processes')
}

export async function createProcessEdge(
  fromStepId: string,
  toStepId: string,
  label?: string
): Promise<ActionResult> {
  if (fromStepId === toStepId) {
    return { ok: false, error: 'Шаг не может вести сам в себя' }
  }

  // Both endpoints — see createJtbdSequenceEdge for why one is not enough.
  const userId = getCurrentUserId()
  const denied =
    (await denyUnowned('processStep', fromStepId, userId)) ??
    (await denyUnowned('processStep', toStepId, userId))
  if (denied) return denied

  try {
    await prisma.processEdge.create({
      data: { fromStepId, toStepId, label: label?.trim() || undefined },
    })
  } catch {
    return { ok: false, error: 'Такая связь уже существует' }
  }
  revalidatePath('/pm/processes')
  return { ok: true }
}

export async function deleteProcessEdge(id: string): Promise<void> {
  // Void return — no channel for an error, so an unowned record 404s.
  await assertOwned('processEdge', id, getCurrentUserId())

  await prisma.processEdge.delete({ where: { id } })
  revalidatePath('/pm/processes')
}
