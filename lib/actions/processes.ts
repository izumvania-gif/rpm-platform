'use server'

import { z } from 'zod'
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
  redirect(`/pm?productId=${process.productId}&processId=${process.id}`)
}

export async function updateProcess(id: string, formData: FormData) {
  const parsed = parseProcessForm(formData)
  if (!parsed.success) {
    redirect(`/pm/processes/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const process = await prisma.process.update({ where: { id }, data: { title: parsed.data.title } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${process.productId}&processId=${process.id}`)
}

export async function deleteProcess(id: string) {
  const process = await prisma.process.delete({ where: { id } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${process.productId}`)
}
