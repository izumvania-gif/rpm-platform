'use server'

import { z } from 'zod'
import { ResearchStatus, ResearchType } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

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

function toTagsArray(tags?: string): string[] {
  if (!tags) return []
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
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
