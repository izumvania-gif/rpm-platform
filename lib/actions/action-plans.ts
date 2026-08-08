'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString, toLines, toTagsArray } from '@/lib/validation'

const actionPlanSchema = z.object({
  scenario: z.string().trim().min(1, 'Сценарий обязателен'),
  trigger: optionalString(),
  steps: optionalString(),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  ownerId: optionalString(),
  processStepId: optionalString(),
})

function parseActionPlanForm(formData: FormData) {
  return actionPlanSchema.safeParse({
    scenario: formData.get('scenario'),
    trigger: formData.get('trigger'),
    steps: formData.get('steps'),
    tags: formData.get('tags'),
    productId: formData.get('productId'),
    ownerId: formData.get('ownerId'),
    processStepId: formData.get('processStepId'),
  })
}

// No dedicated detail page — same reasoning as RoadmapItem (plans/
// platform-views-plan.md §1): the list on /pm is the fast-access path a PM
// needs mid-"fire," not a page to navigate to.
export async function createActionPlan(formData: FormData) {
  const parsed = parseActionPlanForm(formData)
  if (!parsed.success) {
    const productId = formData.get('productId')
    redirect(
      `/pm/action-plans/new?productId=${productId}&error=${encodeURIComponent(parsed.error.issues[0].message)}`
    )
  }

  const { steps, tags, ...data } = parsed.data
  await prisma.actionPlan.create({
    data: { ...data, steps: toLines(steps), tags: toTagsArray(tags), userId: getCurrentUserId() },
  })
  revalidatePath('/pm')
  redirect(`/pm?productId=${parsed.data.productId}`)
}

export async function updateActionPlan(id: string, formData: FormData) {
  const parsed = parseActionPlanForm(formData)
  if (!parsed.success) {
    redirect(
      `/pm/action-plans/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    )
  }

  const { steps, tags, ...data } = parsed.data
  const plan = await prisma.actionPlan.update({
    where: { id },
    data: { ...data, steps: toLines(steps), tags: toTagsArray(tags) },
  })
  revalidatePath('/pm')
  redirect(`/pm?productId=${plan.productId}`)
}

export async function deleteActionPlan(id: string) {
  const plan = await prisma.actionPlan.delete({ where: { id } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${plan.productId}`)
}

export async function toggleActionPlanPinned(id: string, pinned: boolean) {
  await prisma.actionPlan.update({ where: { id }, data: { pinned } })
  revalidatePath('/pm')
}
