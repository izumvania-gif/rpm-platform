'use server'

import { z } from 'zod'
import type { RTB } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import type { InlineFieldResult } from '@/lib/validation'

const rtbSchema = z.object({
  statement: z.string().trim().min(1, 'Формулировка обязательна'),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseRTBForm(formData: FormData) {
  const parsed = rtbSchema.safeParse({
    statement: formData.get('statement'),
    productId: formData.get('productId'),
  })
  return {
    parsed,
    featureIds: formData.getAll('featureIds').map(String),
  }
}

export async function createRTB(formData: FormData) {
  const { parsed, featureIds } = parseRTBForm(formData)
  if (!parsed.success) {
    redirect(`/marketing/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const rtb = await prisma.rTB.create({
    data: {
      ...parsed.data,
      userId: getCurrentUserId(),
      features: { connect: featureIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/marketing')
  redirect(`/marketing/${rtb.id}`)
}

export async function updateRTB(id: string, formData: FormData) {
  await assertOwned('rtb', id, getCurrentUserId())

  const { parsed, featureIds } = parseRTBForm(formData)
  if (!parsed.success) {
    redirect(`/marketing/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  await prisma.rTB.update({
    where: { id },
    data: {
      ...parsed.data,
      features: { set: featureIds.map((featureId) => ({ id: featureId })) },
    },
  })
  revalidatePath('/marketing')
  revalidatePath(`/marketing/${id}`)
  redirect(`/marketing/${id}`)
}

export async function deleteRTB(id: string) {
  await assertOwned('rtb', id, getCurrentUserId())

  await prisma.rTB.delete({ where: { id } })
  revalidatePath('/marketing')
  redirect('/marketing')
}

export async function toggleRTBPinned(id: string, pinned: boolean) {
  await assertOwned('rtb', id, getCurrentUserId())

  await prisma.rTB.update({ where: { id }, data: { pinned } })
  revalidatePath('/marketing')
  revalidatePath(`/marketing/${id}`)
  revalidatePath('/')
}

export async function createRTBQuick(
  productId: string,
  statement: string,
  featureIds: string[] = []
): Promise<{ ok: true; rtb: RTB } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedStatement = statement.trim()
  if (!productId || !trimmedStatement) {
    return { ok: false, error: 'Укажите продукт и формулировку' }
  }

  const rtb = await prisma.rTB.create({
    data: {
      statement: trimmedStatement,
      productId,
      userId: getCurrentUserId(),
      features: { connect: featureIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/marketing')
  revalidatePath(`/products/${productId}/onboarding/features`)
  return { ok: true, rtb }
}

export async function updateRTBField(id: string, value: string): Promise<InlineFieldResult> {
  const denied = await denyUnowned('rtb', id, getCurrentUserId())
  if (denied) return denied

  const statement = value.trim()
  if (!statement) return { ok: false, error: 'Формулировка не может быть пустой' }
  await prisma.rTB.update({ where: { id }, data: { statement } })
  revalidatePath('/marketing')
  revalidatePath(`/marketing/${id}`)
  return { ok: true }
}
