'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString, toTagsArray } from '@/lib/validation'

const jtbdSchema = z.object({
  title: z.string().trim().min(1, 'Формулировка обязательна'),
  category: z.string().trim().min(1, 'Категория обязательна'),
  description: optionalString(),
  confirmed: z.coerce.boolean(),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  segmentId: optionalString(),
  researchId: optionalString(),
})

function parseJtbdForm(formData: FormData) {
  return jtbdSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    description: formData.get('description'),
    confirmed: formData.get('confirmed') === 'on',
    tags: formData.get('tags'),
    productId: formData.get('productId'),
    segmentId: formData.get('segmentId'),
    researchId: formData.get('researchId'),
  })
}

export async function createJtbd(formData: FormData) {
  const parsed = parseJtbdForm(formData)
  if (!parsed.success) {
    redirect(`/jtbd/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  const jtbd = await prisma.jTBD.create({
    data: { ...data, tags: toTagsArray(tags), userId: getCurrentUserId() },
  })
  revalidatePath('/jtbd')
  redirect(`/jtbd/${jtbd.id}`)
}

export async function updateJtbd(id: string, formData: FormData) {
  const parsed = parseJtbdForm(formData)
  if (!parsed.success) {
    redirect(`/jtbd/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  await prisma.jTBD.update({
    where: { id },
    data: { ...data, tags: toTagsArray(tags) },
  })
  revalidatePath('/jtbd')
  revalidatePath(`/jtbd/${id}`)
  redirect(`/jtbd/${id}`)
}

export async function deleteJtbd(id: string) {
  await prisma.jTBD.delete({ where: { id } })
  revalidatePath('/jtbd')
  redirect('/jtbd')
}

export async function toggleJtbdPinned(id: string, pinned: boolean) {
  await prisma.jTBD.update({ where: { id }, data: { pinned } })
  revalidatePath('/jtbd')
  revalidatePath(`/jtbd/${id}`)
  revalidatePath('/')
}
