'use server'

import { z } from 'zod'
import { RoadmapStatus, RoadmapVisibility } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalDate, optionalString } from '@/lib/validation'

const roadmapItemSchema = z
  .object({
    title: z.string().trim().min(1, 'Название обязательно'),
    description: optionalString(),
    status: z.nativeEnum(RoadmapStatus),
    quarter: optionalString(),
    visibility: z.nativeEnum(RoadmapVisibility),
    productId: z.string().trim().min(1, 'Продукт обязателен'),
    ownerId: optionalString(),
    featureId: optionalString(),
    jtbdId: optionalString(),
    trackGroup: optionalString(),
    track: optionalString(),
    startDate: optionalDate(),
    endDate: optionalDate(),
    isMilestone: z.coerce.boolean(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'Дата окончания не может быть раньше даты начала',
    path: ['endDate'],
  })

function parseRoadmapItemForm(formData: FormData) {
  return roadmapItemSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
    quarter: formData.get('quarter'),
    visibility: formData.get('visibility'),
    productId: formData.get('productId'),
    ownerId: formData.get('ownerId'),
    featureId: formData.get('featureId'),
    jtbdId: formData.get('jtbdId'),
    trackGroup: formData.get('trackGroup'),
    track: formData.get('track'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    isMilestone: formData.get('isMilestone') === 'on',
  })
}

// No dedicated detail/list page for RoadmapItem, same as ProductResource —
// items are rendered inline on /pm (plans/platform-views-plan.md §3), so
// every action redirects back there instead of to a page of its own.
export async function createRoadmapItem(formData: FormData) {
  const parsed = parseRoadmapItemForm(formData)
  if (!parsed.success) {
    const productId = formData.get('productId')
    redirect(
      `/pm/roadmap/new?productId=${productId}&error=${encodeURIComponent(parsed.error.issues[0].message)}`
    )
  }

  await prisma.roadmapItem.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  })
  revalidatePath('/pm')
  redirect(`/pm?productId=${parsed.data.productId}&scrollTo=roadmap`)
}

export async function updateRoadmapItem(id: string, formData: FormData) {
  const parsed = parseRoadmapItemForm(formData)
  if (!parsed.success) {
    redirect(
      `/pm/roadmap/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    )
  }

  const item = await prisma.roadmapItem.update({ where: { id }, data: parsed.data })
  revalidatePath('/pm')
  redirect(`/pm?productId=${item.productId}&scrollTo=roadmap`)
}

export async function deleteRoadmapItem(id: string) {
  const item = await prisma.roadmapItem.delete({ where: { id } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${item.productId}&scrollTo=roadmap`)
}

export async function toggleRoadmapItemPinned(id: string, pinned: boolean) {
  await prisma.roadmapItem.update({ where: { id }, data: { pinned } })
  revalidatePath('/pm')
}
