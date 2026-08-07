'use server'

import { z } from 'zod'
import { JtbdJobType } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString, toTagsArray } from '@/lib/validation'

const jtbdSchema = z.object({
  title: z.string().trim().min(1, 'Формулировка обязательна'),
  category: z.string().trim().min(1, 'Категория обязательна'),
  description: optionalString(),
  jobType: z.nativeEnum(JtbdJobType),
  confirmed: z.coerce.boolean(),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  researchId: optionalString(),
})

function parseJtbdForm(formData: FormData) {
  const parsed = jtbdSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    description: formData.get('description'),
    jobType: formData.get('jobType') || JtbdJobType.SMALL_JOB,
    confirmed: formData.get('confirmed') === 'on',
    tags: formData.get('tags'),
    productId: formData.get('productId'),
    researchId: formData.get('researchId'),
  })
  return { parsed, segmentIds: formData.getAll('segmentIds').map(String) }
}

export async function createJtbd(formData: FormData) {
  const { parsed, segmentIds } = parseJtbdForm(formData)
  if (!parsed.success) {
    redirect(`/jtbd/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  const jtbd = await prisma.jTBD.create({
    data: {
      ...data,
      tags: toTagsArray(tags),
      userId: getCurrentUserId(),
      segments: { connect: segmentIds.map((id) => ({ id })) },
    },
  })
  revalidatePath('/jtbd')
  redirect(`/jtbd/${jtbd.id}`)
}

export async function updateJtbd(id: string, formData: FormData) {
  const { parsed, segmentIds } = parseJtbdForm(formData)
  if (!parsed.success) {
    redirect(`/jtbd/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  await prisma.jTBD.update({
    where: { id },
    data: {
      ...data,
      tags: toTagsArray(tags),
      segments: { set: segmentIds.map((segmentId) => ({ id: segmentId })) },
    },
  })
  revalidatePath('/jtbd')
  revalidatePath(`/jtbd/${id}`)
  const redirectTo = formData.get('redirectTo')
  redirect(typeof redirectTo === 'string' && redirectTo ? redirectTo : `/jtbd/${id}`)
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
