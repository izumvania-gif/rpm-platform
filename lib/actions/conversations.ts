'use server'

import { z } from 'zod'
import type { Conversation } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalString, toTagsArray, type InlineFieldResult } from '@/lib/validation'

const conversationSchema = z.object({
  title: z.string().trim().min(1, 'Название обязательно'),
  transcript: optionalString(),
  date: z.coerce.date(),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  segmentId: optionalString(),
  researchId: optionalString(),
})

function parseConversationForm(formData: FormData) {
  return conversationSchema.safeParse({
    title: formData.get('title'),
    transcript: formData.get('transcript'),
    date: formData.get('date'),
    tags: formData.get('tags'),
    productId: formData.get('productId'),
    segmentId: formData.get('segmentId'),
    researchId: formData.get('researchId'),
  })
}

export async function createConversation(formData: FormData) {
  const parsed = parseConversationForm(formData)
  if (!parsed.success) {
    redirect(`/conversations/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const { tags, ...data } = parsed.data
  const conversation = await prisma.conversation.create({
    data: { ...data, tags: toTagsArray(tags), userId: getCurrentUserId() },
  })
  revalidatePath('/conversations')
  redirect(`/conversations/${conversation.id}`)
}

export async function updateConversation(id: string, formData: FormData) {
  await assertOwned('conversation', id, getCurrentUserId())

  const parsed = parseConversationForm(formData)
  if (!parsed.success) {
    redirect(
      `/conversations/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    )
  }

  const { tags, ...data } = parsed.data
  await prisma.conversation.update({
    where: { id },
    data: { ...data, tags: toTagsArray(tags) },
  })
  revalidatePath('/conversations')
  revalidatePath(`/conversations/${id}`)
  redirect(`/conversations/${id}`)
}

export async function deleteConversation(id: string) {
  await assertOwned('conversation', id, getCurrentUserId())

  await prisma.conversation.delete({ where: { id } })
  revalidatePath('/conversations')
  redirect('/conversations')
}

export async function toggleConversationPinned(id: string, pinned: boolean) {
  await assertOwned('conversation', id, getCurrentUserId())

  await prisma.conversation.update({ where: { id }, data: { pinned } })
  revalidatePath('/conversations')
  revalidatePath(`/conversations/${id}`)
  revalidatePath('/')
}

export async function createConversationQuick(
  productId: string,
  title: string,
  segmentId?: string | null,
  researchId?: string | null
): Promise<{ ok: true; conversation: Conversation } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedTitle = title.trim()
  if (!productId || !trimmedTitle) {
    return { ok: false, error: 'Укажите продукт и название' }
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: trimmedTitle,
      productId,
      segmentId: segmentId || undefined,
      researchId: researchId || undefined,
      userId: getCurrentUserId(),
    },
  })
  revalidatePath('/conversations')
  revalidatePath(`/products/${productId}/onboarding/research`)
  return { ok: true, conversation }
}

export async function updateConversationField(
  id: string,
  field: 'title' | 'transcript' | 'date' | 'tags',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('conversation', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'title': {
      const title = value.trim()
      if (!title) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.conversation.update({ where: { id }, data: { title } })
      break
    }
    case 'transcript':
      await prisma.conversation.update({
        where: { id },
        data: { transcript: value.trim() || null },
      })
      break
    case 'date': {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return { ok: false, error: 'Некорректная дата' }
      await prisma.conversation.update({ where: { id }, data: { date } })
      break
    }
    case 'tags':
      await prisma.conversation.update({ where: { id }, data: { tags: toTagsArray(value) } })
      break
  }
  revalidatePath('/conversations')
  revalidatePath(`/conversations/${id}`)
  return { ok: true }
}
