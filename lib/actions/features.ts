'use server'

import { z } from 'zod'
import type { Feature } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalString, type InlineFieldResult } from '@/lib/validation'

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

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const feature = await prisma.feature.create({
    data: {
      ...parsed.data,
      userId: getCurrentUserId(),
      jtbds: { connect: jtbdIds.map((id) => ({ id })) },
      rtbs: { connect: rtbIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/features')
  redirect(safeRedirectPath(formData.get('redirectTo'), `/features/${feature.id}`))
}

export async function updateFeature(id: string, formData: FormData) {
  await assertOwned('feature', id, getCurrentUserId())

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
  await assertOwned('feature', id, getCurrentUserId())

  await prisma.feature.delete({ where: { id } })
  revalidatePath('/features')
  redirect('/features')
}

export async function toggleFeaturePinned(id: string, pinned: boolean) {
  await assertOwned('feature', id, getCurrentUserId())

  await prisma.feature.update({ where: { id }, data: { pinned } })
  revalidatePath('/features')
  revalidatePath(`/features/${id}`)
  revalidatePath('/')
}

export async function createFeatureQuick(
  productId: string,
  name: string,
  jtbdIds: string[] = []
): Promise<{ ok: true; feature: Feature } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedName = name.trim()
  if (!productId || !trimmedName) {
    return { ok: false, error: 'Укажите продукт и название' }
  }

  const feature = await prisma.feature.create({
    data: {
      name: trimmedName,
      productId,
      userId: getCurrentUserId(),
      jtbds: { connect: jtbdIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/features')
  revalidatePath(`/products/${productId}/onboarding/features`)
  return { ok: true, feature }
}

export async function updateFeatureField(
  id: string,
  field: 'name' | 'description',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('feature', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'name': {
      const name = value.trim()
      if (!name) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.feature.update({ where: { id }, data: { name } })
      break
    }
    case 'description':
      await prisma.feature.update({ where: { id }, data: { description: value.trim() || null } })
      break
  }
  revalidatePath('/features')
  revalidatePath(`/features/${id}`)
  return { ok: true }
}
