'use server'

import { z } from 'zod'
import type { Process } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'

// CRUD for the Process entity itself (plans/platform-views-plan.md §10) —
// separate from lib/actions/process.ts, which owns the steps/edges inside
// one process's canvas. No dedicated detail page, same as RoadmapItem/
// ActionPlan: /pm?productId=X&processId=Y IS the detail view (the canvas).
const processSchema = z.object({
  title: z.string().trim().min(1, 'Название обязательно'),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseProcessForm(formData: FormData) {
  return processSchema.safeParse({
    title: formData.get('title'),
    productId: formData.get('productId'),
  })
}

export async function createProcess(formData: FormData) {
  const parsed = parseProcessForm(formData)
  if (!parsed.success) {
    const productId = formData.get('productId')
    redirect(
      `/pm/processes/new?productId=${productId}&error=${encodeURIComponent(parsed.error.issues[0].message)}`
    )
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const process = await prisma.process.create({ data: parsed.data })
  revalidatePath('/pm/processes')
  redirect(`/pm/processes?productId=${process.productId}&processId=${process.id}`)
}

export async function updateProcess(id: string, formData: FormData) {
  await assertOwned('process', id, getCurrentUserId())

  const parsed = parseProcessForm(formData)
  if (!parsed.success) {
    redirect(`/pm/processes/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const process = await prisma.process.update({ where: { id }, data: { title: parsed.data.title } })
  revalidatePath('/pm/processes')
  redirect(`/pm/processes?productId=${process.productId}&processId=${process.id}`)
}

// Inline "Добавить процесс" on /pm itself (plans/2.0-ux-improvement-plan.md,
// Фаза 5) — the full form only ever has a title anyway, so this is a
// straight Quick wrapper, not a trimmed subset like the roadmap/action-plan
// ones.
export async function createProcessQuick(
  productId: string,
  title: string
): Promise<{ ok: true; process: Process } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { ok: false, error: 'Название обязательно' }

  const process = await prisma.process.create({ data: { title: trimmedTitle, productId } })
  revalidatePath('/pm/processes')
  return { ok: true, process }
}

export async function deleteProcess(id: string) {
  await assertOwned('process', id, getCurrentUserId())

  const process = await prisma.process.delete({ where: { id } })
  revalidatePath('/pm/processes')
  redirect(`/pm/processes?productId=${process.productId}`)
}
