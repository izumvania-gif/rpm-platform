'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString, toTagsArray } from '@/lib/validation'

const competitorSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  url: optionalString(),
  positioning: optionalString(),
  features: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseCompetitorForm(formData: FormData) {
  return competitorSchema.safeParse({
    name: formData.get('name'),
    url: formData.get('url'),
    positioning: formData.get('positioning'),
    features: formData.get('features'),
    productId: formData.get('productId'),
  })
}

export async function createCompetitor(formData: FormData) {
  const parsed = parseCompetitorForm(formData)
  if (!parsed.success) {
    redirect(`/competitors/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { features, ...data } = parsed.data
  const competitor = await prisma.competitor.create({
    data: { ...data, features: toTagsArray(features), userId: getCurrentUserId() },
  })
  revalidatePath('/competitors')
  redirect(`/competitors/${competitor.id}`)
}

export async function updateCompetitor(id: string, formData: FormData) {
  const parsed = parseCompetitorForm(formData)
  if (!parsed.success) {
    redirect(`/competitors/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { features, ...data } = parsed.data
  await prisma.competitor.update({
    where: { id },
    data: { ...data, features: toTagsArray(features) },
  })
  revalidatePath('/competitors')
  revalidatePath(`/competitors/${id}`)
  redirect(`/competitors/${id}`)
}

export async function deleteCompetitor(id: string) {
  await prisma.competitor.delete({ where: { id } })
  revalidatePath('/competitors')
  redirect('/competitors')
}
