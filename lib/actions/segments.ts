'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalNumber, optionalString } from '@/lib/validation'

const segmentSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug обязателен')
    .regex(/^[a-z0-9-]+$/, 'Slug: только латиница, цифры и дефис'),
  audienceShare: optionalNumber(z.coerce.number().min(0).max(100)),
  color: z.string().trim().min(1),
  description: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseSegmentForm(formData: FormData) {
  return segmentSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    audienceShare: formData.get('audienceShare'),
    color: formData.get('color') || '#3B82F6',
    description: formData.get('description'),
    productId: formData.get('productId'),
  })
}

export async function createSegment(formData: FormData) {
  const parsed = parseSegmentForm(formData)
  if (!parsed.success) {
    redirect(`/segments/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  try {
    const segment = await prisma.segment.create({
      data: { ...parsed.data, userId: getCurrentUserId() },
    })
    revalidatePath('/segments')
    redirect(`/segments/${segment.id}`)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      redirect(
        `/segments/new?error=${encodeURIComponent('Сегмент с таким slug уже существует в этом продукте')}`
      )
    }
    throw e
  }
}

export async function updateSegment(id: string, formData: FormData) {
  const parsed = parseSegmentForm(formData)
  if (!parsed.success) {
    redirect(`/segments/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  try {
    await prisma.segment.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath('/segments')
    revalidatePath(`/segments/${id}`)
    redirect(`/segments/${id}`)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      redirect(
        `/segments/${id}/edit?error=${encodeURIComponent('Сегмент с таким slug уже существует в этом продукте')}`
      )
    }
    throw e
  }
}

export async function deleteSegment(id: string) {
  await prisma.segment.delete({ where: { id } })
  revalidatePath('/segments')
  redirect('/segments')
}
