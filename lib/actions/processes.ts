'use server'

import { z } from 'zod'
import type { Process } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

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

  const process = await prisma.process.create({ data: parsed.data })
  revalidatePath('/pm')
  redirect(`/pm?productId=${process.productId}&processId=${process.id}&scrollTo=process`)
}

export async function updateProcess(id: string, formData: FormData) {
  const parsed = parseProcessForm(formData)
  if (!parsed.success) {
    redirect(`/pm/processes/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const process = await prisma.process.update({ where: { id }, data: { title: parsed.data.title } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${process.productId}&processId=${process.id}&scrollTo=process`)
}

// Inline "Добавить процесс" on /pm itself (plans/2.0-ux-improvement-plan.md,
// Фаза 5) — the full form only ever has a title anyway, so this is a
// straight Quick wrapper, not a trimmed subset like the roadmap/action-plan
// ones.
export async function createProcessQuick(
  productId: string,
  title: string
): Promise<{ ok: true; process: Process } | { ok: false; error: string }> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { ok: false, error: 'Название обязательно' }

  const process = await prisma.process.create({ data: { title: trimmedTitle, productId } })
  revalidatePath('/pm')
  return { ok: true, process }
}

export async function deleteProcess(id: string) {
  const process = await prisma.process.delete({ where: { id } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${process.productId}&scrollTo=process`)
}
