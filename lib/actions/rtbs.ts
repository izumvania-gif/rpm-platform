'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

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
    redirect(`/rtb/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const rtb = await prisma.rTB.create({
    data: {
      ...parsed.data,
      userId: getCurrentUserId(),
      features: { connect: featureIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/rtb')
  redirect(`/rtb/${rtb.id}`)
}

export async function updateRTB(id: string, formData: FormData) {
  const { parsed, featureIds } = parseRTBForm(formData)
  if (!parsed.success) {
    redirect(`/rtb/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  await prisma.rTB.update({
    where: { id },
    data: {
      ...parsed.data,
      features: { set: featureIds.map((featureId) => ({ id: featureId })) },
    },
  })
  revalidatePath('/rtb')
  revalidatePath(`/rtb/${id}`)
  redirect(`/rtb/${id}`)
}

export async function deleteRTB(id: string) {
  await prisma.rTB.delete({ where: { id } })
  revalidatePath('/rtb')
  redirect('/rtb')
}

export async function toggleRTBPinned(id: string, pinned: boolean) {
  await prisma.rTB.update({ where: { id }, data: { pinned } })
  revalidatePath('/rtb')
  revalidatePath(`/rtb/${id}`)
  revalidatePath('/')
}
