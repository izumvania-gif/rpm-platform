'use server'

import { z } from 'zod'
import { Prisma, type Segment } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import {
  optionalNumber,
  optionalString,
  toTagsArray,
  type InlineFieldResult,
} from '@/lib/validation'
import { slugify } from '@/lib/utils'

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
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseSegmentForm(formData: FormData) {
  return segmentSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    audienceShare: formData.get('audienceShare'),
    color: formData.get('color') || '#3B82F6',
    description: formData.get('description'),
    tags: formData.get('tags'),
    productId: formData.get('productId'),
  })
}

export async function createSegment(formData: FormData) {
  const parsed = parseSegmentForm(formData)
  if (!parsed.success) {
    redirect(`/segments/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const { tags, ...data } = parsed.data
  try {
    const segment = await prisma.segment.create({
      data: { ...data, tags: toTagsArray(tags), userId: getCurrentUserId() },
    })
    revalidatePath('/segments')
    redirect(safeRedirectPath(formData.get('redirectTo'), `/segments/${segment.id}`))
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
  await assertOwned('segment', id, getCurrentUserId())

  const parsed = parseSegmentForm(formData)
  if (!parsed.success) {
    redirect(`/segments/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  try {
    await prisma.segment.update({
      where: { id },
      data: { ...data, tags: toTagsArray(tags) },
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
  await assertOwned('segment', id, getCurrentUserId())

  // The segment's own id doubles as the viewKey for its JTBD graph layout —
  // no FK to clean up automatically (viewKey is a plain string, not a
  // relation), so drop those rows explicitly before/alongside the segment.
  await prisma.jtbdGraphLayout.deleteMany({ where: { viewKey: id } })
  await prisma.segment.delete({ where: { id } })
  revalidatePath('/segments')
  redirect('/segments')
}

export async function toggleSegmentPinned(id: string, pinned: boolean) {
  await assertOwned('segment', id, getCurrentUserId())

  await prisma.segment.update({ where: { id }, data: { pinned } })
  revalidatePath('/segments')
  revalidatePath(`/segments/${id}`)
  revalidatePath('/')
}

export async function createSegmentQuick(
  productId: string,
  name: string
): Promise<{ ok: true; segment: Segment } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedName = name.trim()
  if (!productId || !trimmedName) {
    return { ok: false, error: 'Укажите продукт и название' }
  }

  const slug = slugify(trimmedName)
  try {
    const segment = await prisma.segment.create({
      data: {
        name: trimmedName,
        slug,
        color: '#3B82F6',
        tags: [],
        productId,
        userId: getCurrentUserId(),
      },
    })
    revalidatePath('/segments')
    return { ok: true, segment }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const segment = await prisma.segment.create({
        data: {
          name: trimmedName,
          slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
          color: '#3B82F6',
          tags: [],
          productId,
          userId: getCurrentUserId(),
        },
      })
      revalidatePath('/segments')
      return { ok: true, segment }
    }
    throw e
  }
}

export async function updateSegmentField(
  id: string,
  field: 'name' | 'description' | 'audienceShare' | 'tags',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('segment', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'name': {
      const name = value.trim()
      if (!name) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.segment.update({ where: { id }, data: { name } })
      break
    }
    case 'description':
      await prisma.segment.update({ where: { id }, data: { description: value.trim() || null } })
      break
    case 'audienceShare': {
      if (value.trim() === '') {
        await prisma.segment.update({ where: { id }, data: { audienceShare: null } })
        break
      }
      const audienceShare = Number(value)
      if (!Number.isFinite(audienceShare) || audienceShare < 0 || audienceShare > 100) {
        return { ok: false, error: 'Доля аудитории: число от 0 до 100' }
      }
      await prisma.segment.update({ where: { id }, data: { audienceShare } })
      break
    }
    case 'tags':
      await prisma.segment.update({ where: { id }, data: { tags: toTagsArray(value) } })
      break
  }
  revalidatePath('/segments')
  revalidatePath(`/segments/${id}`)
  return { ok: true }
}
