'use server'

import { z } from 'zod'
import type { Competitor } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalDate, optionalString, toTagsArray } from '@/lib/validation'

const competitorSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  url: optionalString(),
  positioning: optionalString(),
  features: optionalString(),
  lastCheckedAt: optionalDate(),
  pricingModel: optionalString(),
  companySize: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseCompetitorForm(formData: FormData) {
  return competitorSchema.safeParse({
    name: formData.get('name'),
    url: formData.get('url'),
    positioning: formData.get('positioning'),
    features: formData.get('features'),
    lastCheckedAt: formData.get('lastCheckedAt'),
    pricingModel: formData.get('pricingModel'),
    companySize: formData.get('companySize'),
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

export async function toggleCompetitorPinned(id: string, pinned: boolean) {
  await prisma.competitor.update({ where: { id }, data: { pinned } })
  revalidatePath('/competitors')
  revalidatePath(`/competitors/${id}`)
  revalidatePath('/')
}

export async function createCompetitorQuick(
  productId: string,
  name: string,
  positioning?: string
): Promise<{ ok: true; competitor: Competitor } | { ok: false; error: string }> {
  const trimmedName = name.trim()
  if (!productId || !trimmedName) {
    return { ok: false, error: 'Укажите продукт и название' }
  }

  const competitor = await prisma.competitor.create({
    data: {
      name: trimmedName,
      positioning: positioning?.trim() || undefined,
      features: [],
      productId,
      userId: getCurrentUserId(),
    },
  })
  revalidatePath('/competitors')
  revalidatePath(`/products/${productId}/onboarding/competitors`)
  return { ok: true, competitor }
}
