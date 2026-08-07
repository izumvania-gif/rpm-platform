'use server'

import { z } from 'zod'
import { ResearchStatus, ResearchType, type Research } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { toTagsArray } from '@/lib/validation'

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

  const { tags, ...data } = parsed.data
  const research = await prisma.research.create({
    data: { ...data, tags: toTagsArray(tags), userId: getCurrentUserId() },
  })
  revalidatePath('/research')
  redirect(`/research/${research.id}`)
}

export async function updateResearch(id: string, formData: FormData) {
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
  await prisma.research.delete({ where: { id } })
  revalidatePath('/research')
  redirect('/research')
}

export async function toggleResearchPinned(id: string, pinned: boolean) {
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
