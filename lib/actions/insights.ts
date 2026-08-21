'use server'

import { z } from 'zod'
import { InsightStance, type Insight } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalString, optionalEnum, toTagsArray, type InlineFieldResult } from '@/lib/validation'

const insightSchema = z.object({
  text: z.string().trim().min(1, 'Текст обязателен'),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  segmentId: optionalString(),
  jtbdId: optionalString(),
  researchId: optionalString(),
  conversationId: optionalString(),
  hypothesisId: optionalString(),
  // Пустая строка из <select> — это «сторона не выбрана», то есть null, а не
  // ошибка валидации: инсайт имеет право быть просто наблюдением.
  stance: optionalEnum(z.nativeEnum(InsightStance)),
})

function parseInsightForm(formData: FormData) {
  return insightSchema.safeParse({
    text: formData.get('text'),
    tags: formData.get('tags'),
    productId: formData.get('productId'),
    segmentId: formData.get('segmentId'),
    jtbdId: formData.get('jtbdId'),
    researchId: formData.get('researchId'),
    conversationId: formData.get('conversationId'),
    hypothesisId: formData.get('hypothesisId'),
    stance: formData.get('stance'),
  })
}

export async function createInsight(formData: FormData) {
  const parsed = parseInsightForm(formData)
  if (!parsed.success) {
    redirect(`/insights/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const { tags, ...data } = parsed.data
  const insight = await prisma.insight.create({
    data: { ...data, tags: toTagsArray(tags), userId: getCurrentUserId() },
  })
  revalidatePath('/insights')
  redirect(safeRedirectPath(formData.get('redirectTo'), `/insights/${insight.id}`))
}

export async function updateInsight(id: string, formData: FormData) {
  await assertOwned('insight', id, getCurrentUserId())

  const parsed = parseInsightForm(formData)
  if (!parsed.success) {
    redirect(`/insights/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  await prisma.insight.update({
    where: { id },
    data: { ...data, tags: toTagsArray(tags) },
  })
  revalidatePath('/insights')
  revalidatePath(`/insights/${id}`)
  redirect(`/insights/${id}`)
}

export async function deleteInsight(id: string) {
  await assertOwned('insight', id, getCurrentUserId())

  await prisma.insight.delete({ where: { id } })
  revalidatePath('/insights')
  redirect('/insights')
}

export async function toggleInsightPinned(id: string, pinned: boolean) {
  await assertOwned('insight', id, getCurrentUserId())

  await prisma.insight.update({ where: { id }, data: { pinned } })
  revalidatePath('/insights')
  revalidatePath(`/insights/${id}`)
  revalidatePath('/')
}

export async function createInsightQuick(
  productId: string,
  text: string,
  segmentId?: string | null,
  jtbdId?: string | null,
  researchId?: string | null,
  conversationId?: string | null
): Promise<{ ok: true; insight: Insight } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedText = text.trim()
  if (!productId || !trimmedText) {
    return { ok: false, error: 'Укажите продукт и текст' }
  }

  const insight = await prisma.insight.create({
    data: {
      text: trimmedText,
      productId,
      segmentId: segmentId || undefined,
      jtbdId: jtbdId || undefined,
      researchId: researchId || undefined,
      conversationId: conversationId || undefined,
      userId: getCurrentUserId(),
    },
  })
  revalidatePath('/insights')
  revalidatePath(`/products/${productId}/onboarding/research`)
  return { ok: true, insight }
}

export async function updateInsightField(
  id: string,
  field: 'text' | 'tags',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('insight', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'text': {
      const text = value.trim()
      if (!text) return { ok: false, error: 'Текст не может быть пустым' }
      await prisma.insight.update({ where: { id }, data: { text } })
      break
    }
    case 'tags':
      await prisma.insight.update({ where: { id }, data: { tags: toTagsArray(value) } })
      break
  }
  revalidatePath('/insights')
  revalidatePath(`/insights/${id}`)
  return { ok: true }
}
