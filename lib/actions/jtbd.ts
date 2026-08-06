'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

const jtbdSchema = z.object({
  title: z.string().trim().min(1, 'Формулировка обязательна'),
  category: z.string().trim().min(1, 'Категория обязательна'),
  description: z.string().trim().optional(),
  confirmed: z.coerce.boolean(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  segmentId: z
    .string()
    .trim()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  researchId: z
    .string()
    .trim()
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

function parseJtbdForm(formData: FormData) {
  return jtbdSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    description: formData.get('description') || undefined,
    confirmed: formData.get('confirmed') === 'on',
    productId: formData.get('productId'),
    segmentId: formData.get('segmentId') ?? '',
    researchId: formData.get('researchId') ?? '',
  })
}

export async function createJtbd(formData: FormData) {
  const parsed = parseJtbdForm(formData)
  if (!parsed.success) {
    redirect(`/jtbd/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const jtbd = await prisma.jTBD.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  })
  revalidatePath('/jtbd')
  redirect(`/jtbd/${jtbd.id}`)
}

export async function updateJtbd(id: string, formData: FormData) {
  const parsed = parseJtbdForm(formData)
  if (!parsed.success) {
    redirect(`/jtbd/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  await prisma.jTBD.update({
    where: { id },
    data: parsed.data,
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
