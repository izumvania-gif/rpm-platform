'use server'

import { z } from 'zod'
import type { Competitor } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalDate, optionalString, toTagsArray, type InlineFieldResult } from '@/lib/validation'

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

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const { features, ...data } = parsed.data
  const competitor = await prisma.competitor.create({
    data: { ...data, features: toTagsArray(features), userId: getCurrentUserId() },
  })
  revalidatePath('/competitors')
  redirect(`/competitors/${competitor.id}`)
}

export async function updateCompetitor(id: string, formData: FormData) {
  await assertOwned('competitor', id, getCurrentUserId())

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
  await assertOwned('competitor', id, getCurrentUserId())

  await prisma.competitor.delete({ where: { id } })
  revalidatePath('/competitors')
  redirect('/competitors')
}

export async function toggleCompetitorPinned(id: string, pinned: boolean) {
  await assertOwned('competitor', id, getCurrentUserId())

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
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

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

export async function updateCompetitorField(
  id: string,
  field:
    'name' | 'url' | 'positioning' | 'features' | 'pricingModel' | 'companySize' | 'lastCheckedAt',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('competitor', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'name': {
      const name = value.trim()
      if (!name) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.competitor.update({ where: { id }, data: { name } })
      break
    }
    case 'url':
      await prisma.competitor.update({ where: { id }, data: { url: value.trim() || null } })
      break
    case 'positioning':
      await prisma.competitor.update({
        where: { id },
        data: { positioning: value.trim() || null },
      })
      break
    case 'features':
      await prisma.competitor.update({ where: { id }, data: { features: toTagsArray(value) } })
      break
    case 'pricingModel':
      await prisma.competitor.update({
        where: { id },
        data: { pricingModel: value.trim() || null },
      })
      break
    case 'companySize':
      await prisma.competitor.update({
        where: { id },
        data: { companySize: value.trim() || null },
      })
      break
    case 'lastCheckedAt': {
      if (value.trim() === '') {
        await prisma.competitor.update({ where: { id }, data: { lastCheckedAt: null } })
        break
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return { ok: false, error: 'Некорректная дата' }
      await prisma.competitor.update({ where: { id }, data: { lastCheckedAt: date } })
      break
    }
  }
  revalidatePath('/competitors')
  revalidatePath(`/competitors/${id}`)
  return { ok: true }
}
