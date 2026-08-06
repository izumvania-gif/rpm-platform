'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString } from '@/lib/validation'

const featureSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  description: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseFeatureForm(formData: FormData) {
  const parsed = featureSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    productId: formData.get('productId'),
  })
  return {
    parsed,
    jtbdIds: formData.getAll('jtbdIds').map(String),
    rtbIds: formData.getAll('rtbIds').map(String),
  }
}

export async function createFeature(formData: FormData) {
  const { parsed, jtbdIds, rtbIds } = parseFeatureForm(formData)
  if (!parsed.success) {
    redirect(`/features/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const feature = await prisma.feature.create({
    data: {
      ...parsed.data,
      userId: getCurrentUserId(),
      jtbds: { connect: jtbdIds.map((id) => ({ id })) },
      rtbs: { connect: rtbIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/features')
  redirect(`/features/${feature.id}`)
}

export async function updateFeature(id: string, formData: FormData) {
  const { parsed, jtbdIds, rtbIds } = parseFeatureForm(formData)
  if (!parsed.success) {
    redirect(`/features/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  await prisma.feature.update({
    where: { id },
    data: {
      ...parsed.data,
      jtbds: { set: jtbdIds.map((jtbdId) => ({ id: jtbdId })) },
      rtbs: { set: rtbIds.map((rtbId) => ({ id: rtbId })) },
    },
  })
  revalidatePath('/features')
  revalidatePath(`/features/${id}`)
  redirect(`/features/${id}`)
}

export async function deleteFeature(id: string) {
  await prisma.feature.delete({ where: { id } })
  revalidatePath('/features')
  redirect('/features')
}

export async function toggleFeaturePinned(id: string, pinned: boolean) {
  await prisma.feature.update({ where: { id }, data: { pinned } })
  revalidatePath('/features')
  revalidatePath(`/features/${id}`)
  revalidatePath('/')
}
