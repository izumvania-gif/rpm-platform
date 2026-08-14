'use server'

import { z } from 'zod'
import { Prisma, RoadmapStatus, RoadmapVisibility } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalDate, optionalString } from '@/lib/validation'

type RoadmapItemQuick = Prisma.RoadmapItemGetPayload<{
  include: { owner: true; feature: true; jtbd: true }
}>

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

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  await prisma.roadmapItem.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  })
  revalidatePath('/pm')
  redirect(`/pm?productId=${parsed.data.productId}&scrollTo=roadmap`)
}

export async function updateRoadmapItem(id: string, formData: FormData) {
  await assertOwned('roadmapItem', id, getCurrentUserId())

  const parsed = parseRoadmapItemForm(formData)
  if (!parsed.success) {
    redirect(`/pm/roadmap/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const item = await prisma.roadmapItem.update({ where: { id }, data: parsed.data })
  revalidatePath('/pm')
  redirect(`/pm?productId=${item.productId}&scrollTo=roadmap`)
}

export async function deleteRoadmapItem(id: string) {
  await assertOwned('roadmapItem', id, getCurrentUserId())

  const item = await prisma.roadmapItem.delete({ where: { id } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${item.productId}&scrollTo=roadmap`)
}

export async function toggleRoadmapItemPinned(id: string, pinned: boolean) {
  await assertOwned('roadmapItem', id, getCurrentUserId())

  await prisma.roadmapItem.update({ where: { id }, data: { pinned } })
  revalidatePath('/pm')
}

// Gantt drag-and-drop save (plans/2.0-ux-improvement-plan.md, Фаза 6) —
// called from GanttChart's Pointer Events handlers on pointerup, not the
// full edit form. Deliberately narrow (start/end/track only, no pass
// through the full 14-field roadmapItemSchema/Zod object) since a drag
// gesture only ever touches these three fields. `endDate` is omitted
// entirely for a milestone drag (only `startDate`, its marker date,
// moves) rather than passed as null, so the update never overwrites an
// unrelated field the gesture didn't touch.
export async function updateRoadmapItemDates(
  id: string,
  startDate: string,
  endDate?: string,
  track?: string,
  // Only the tray drop passes this: an unscheduled item has neither lane
  // field, so putting it on the timeline has to set the group as well as the
  // track. Dragging an existing bar still never rewrites its group.
  trackGroup?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const denied = await denyUnowned('roadmapItem', id, getCurrentUserId())
  if (denied) return denied

  const parsedStart = z.coerce.date().safeParse(startDate)
  if (!parsedStart.success) return { ok: false, error: 'Некорректная дата начала' }

  let newEndDate: Date | undefined
  if (endDate !== undefined) {
    const parsedEnd = z.coerce.date().safeParse(endDate)
    if (!parsedEnd.success) return { ok: false, error: 'Некорректная дата окончания' }
    if (parsedEnd.data < parsedStart.data) {
      return { ok: false, error: 'Дата окончания не может быть раньше даты начала' }
    }
    newEndDate = parsedEnd.data
  }

  await prisma.roadmapItem.update({
    where: { id },
    data: {
      startDate: parsedStart.data,
      ...(newEndDate !== undefined ? { endDate: newEndDate } : {}),
      ...(track !== undefined ? { track: track.trim() || null } : {}),
      ...(trackGroup !== undefined ? { trackGroup: trackGroup.trim() || null } : {}),
    },
  })
  revalidatePath('/pm')
  revalidatePath('/cpo')
  return { ok: true }
}

// Inline "Добавить пункт" on /pm itself (plans/2.0-ux-improvement-plan.md,
// Фаза 5) — a trimmed subset of the full form's 14 fields, same "quick
// capture now, refine via edit later" trade-off as every other createXQuick
// in this codebase (createJtbdQuick, createProcessStepQuick, etc.). The full
// page (createRoadmapItem above, still reachable via /pm/roadmap/new) stays
// the escape hatch for Gantt scheduling/feature/JTBD links/description.
export async function createRoadmapItemQuick(
  productId: string,
  title: string,
  status: RoadmapStatus,
  quarter: string,
  ownerId: string
): Promise<{ ok: true; item: RoadmapItemQuick } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { ok: false, error: 'Название обязательно' }

  const item = await prisma.roadmapItem.create({
    data: {
      title: trimmedTitle,
      status,
      quarter: quarter.trim() || null,
      ownerId: ownerId || null,
      visibility: RoadmapVisibility.INTERNAL,
      productId,
      userId: getCurrentUserId(),
    },
    include: { owner: true, feature: true, jtbd: true },
  })
  revalidatePath('/pm')
  return { ok: true, item }
}
