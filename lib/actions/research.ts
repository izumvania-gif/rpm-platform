'use server'

import { z } from 'zod'
import { ResearchStatus, ResearchType, type Research } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { toTagsArray, type InlineFieldResult } from '@/lib/validation'

const researchSchema = z.object({
  title: z.string().trim().min(1, 'Название обязательно'),
  description: z.string().trim().optional(),
  date: z.coerce.date(),
  status: z.nativeEnum(ResearchStatus),
  type: z.nativeEnum(ResearchType),
  tags: z.string().trim().optional(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseResearchForm(formData: FormData) {
  return researchSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    date: formData.get('date'),
    status: formData.get('status'),
    type: formData.get('type'),
    tags: formData.get('tags') || undefined,
    productId: formData.get('productId'),
  })
}

export async function createResearch(formData: FormData) {
  const parsed = parseResearchForm(formData)
  if (!parsed.success) {
    redirect(`/research/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const { tags, ...data } = parsed.data
  const research = await prisma.research.create({
    data: { ...data, tags: toTagsArray(tags), userId: getCurrentUserId() },
  })
  revalidatePath('/research')
  redirect(`/research/${research.id}`)
}

export async function updateResearch(id: string, formData: FormData) {
  await assertOwned('research', id, getCurrentUserId())

  const parsed = parseResearchForm(formData)
  if (!parsed.success) {
    redirect(`/research/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  await prisma.research.update({
    where: { id },
    data: { ...data, tags: toTagsArray(tags) },
  })
  revalidatePath('/research')
  revalidatePath(`/research/${id}`)
  redirect(`/research/${id}`)
}

export async function deleteResearch(id: string) {
  await assertOwned('research', id, getCurrentUserId())

  await prisma.research.delete({ where: { id } })
  revalidatePath('/research')
  redirect('/research')
}

export async function toggleResearchPinned(id: string, pinned: boolean) {
  await assertOwned('research', id, getCurrentUserId())

  await prisma.research.update({ where: { id }, data: { pinned } })
  revalidatePath('/research')
  revalidatePath(`/research/${id}`)
  revalidatePath('/')
}

export async function createResearchQuick(
  productId: string,
  title: string,
  type: ResearchType
): Promise<{ ok: true; research: Research } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedTitle = title.trim()
  if (!productId || !trimmedTitle) {
    return { ok: false, error: 'Укажите продукт и название' }
  }
  if (!Object.values(ResearchType).includes(type)) {
    return { ok: false, error: 'Некорректный тип исследования' }
  }

  const research = await prisma.research.create({
    data: {
      title: trimmedTitle,
      type,
      status: ResearchStatus.IN_PROGRESS,
      productId,
      userId: getCurrentUserId(),
    },
  })
  revalidatePath('/research')
  revalidatePath(`/products/${productId}/onboarding/research`)
  return { ok: true, research }
}

export async function updateResearchField(
  id: string,
  field: 'title' | 'description' | 'date' | 'status' | 'type' | 'tags',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('research', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'title': {
      const title = value.trim()
      if (!title) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.research.update({ where: { id }, data: { title } })
      break
    }
    case 'description':
      await prisma.research.update({ where: { id }, data: { description: value.trim() || null } })
      break
    case 'date': {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return { ok: false, error: 'Некорректная дата' }
      await prisma.research.update({ where: { id }, data: { date } })
      break
    }
    case 'status':
      if (!Object.values(ResearchStatus).includes(value as ResearchStatus)) {
        return { ok: false, error: 'Некорректный статус' }
      }
      await prisma.research.update({ where: { id }, data: { status: value as ResearchStatus } })
      break
    case 'type':
      if (!Object.values(ResearchType).includes(value as ResearchType)) {
        return { ok: false, error: 'Некорректный тип' }
      }
      await prisma.research.update({ where: { id }, data: { type: value as ResearchType } })
      break
    case 'tags':
      await prisma.research.update({ where: { id }, data: { tags: toTagsArray(value) } })
      break
  }
  revalidatePath('/research')
  revalidatePath(`/research/${id}`)
  return { ok: true }
}
