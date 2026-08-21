'use server'

import { z } from 'zod'
import { HypothesisStatus, type Hypothesis } from '@prisma/client'
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

const hypothesisSchema = z.object({
  statement: z.string().trim().min(1, 'Формулировка обязательна'),
  status: z.nativeEnum(HypothesisStatus),
  priority: optionalNumber(z.coerce.number().int()),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  jtbdId: optionalString(),
  segmentId: optionalString(),
  researchId: optionalString(),
  validationCriterion: optionalString(),
})

function parseHypothesisForm(formData: FormData) {
  return hypothesisSchema.safeParse({
    statement: formData.get('statement'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    tags: formData.get('tags'),
    productId: formData.get('productId'),
    jtbdId: formData.get('jtbdId'),
    segmentId: formData.get('segmentId'),
    researchId: formData.get('researchId'),
    validationCriterion: formData.get('validationCriterion'),
  })
}

export async function createHypothesis(formData: FormData) {
  const parsed = parseHypothesisForm(formData)
  if (!parsed.success) {
    redirect(`/hypotheses/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  // The product comes from the client's form, so it has to be proved
  // owned before anything is written into it.
  await assertOwned('product', parsed.data.productId, getCurrentUserId())

  const { tags, ...data } = parsed.data
  await prisma.hypothesis.create({
    data: {
      ...data,
      tags: toTagsArray(tags),
      userId: getCurrentUserId(),
      statusChanges: { create: { status: data.status } },
    },
  })
  revalidatePath('/hypotheses')
  redirect(safeRedirectPath(formData.get('redirectTo'), '/hypotheses'))
}

export async function updateHypothesis(id: string, formData: FormData) {
  await assertOwned('hypothesis', id, getCurrentUserId())

  const parsed = parseHypothesisForm(formData)
  if (!parsed.success) {
    redirect(`/hypotheses/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { tags, ...data } = parsed.data
  const existing = await prisma.hypothesis.findUnique({ where: { id }, select: { status: true } })
  await prisma.hypothesis.update({
    where: { id },
    data: {
      ...data,
      tags: toTagsArray(tags),
      ...(existing && existing.status !== data.status
        ? { statusChanges: { create: { status: data.status } } }
        : {}),
    },
  })
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
  redirect(`/hypotheses/${id}`)
}

export async function deleteHypothesis(id: string) {
  await assertOwned('hypothesis', id, getCurrentUserId())

  await prisma.hypothesis.delete({ where: { id } })
  revalidatePath('/hypotheses')
  redirect('/hypotheses')
}

export async function updateHypothesisStatus(id: string, status: HypothesisStatus) {
  await assertOwned('hypothesis', id, getCurrentUserId())

  await prisma.hypothesis.update({
    where: { id },
    data: { status, statusChanges: { create: { status } } },
  })
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
}

export async function toggleHypothesisPinned(id: string, pinned: boolean) {
  await assertOwned('hypothesis', id, getCurrentUserId())

  await prisma.hypothesis.update({ where: { id }, data: { pinned } })
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
  revalidatePath('/')
}

export async function createHypothesisQuick(
  productId: string,
  statement: string,
  jtbdId?: string | null,
  segmentId?: string | null
): Promise<{ ok: true; hypothesis: Hypothesis } | { ok: false; error: string }> {
  const denied = await denyUnowned('product', productId, getCurrentUserId())
  if (denied) return denied

  const trimmedStatement = statement.trim()
  if (!productId || !trimmedStatement) {
    return { ok: false, error: 'Укажите продукт и формулировку' }
  }

  const hypothesis = await prisma.hypothesis.create({
    data: {
      statement: trimmedStatement,
      status: HypothesisStatus.DRAFT,
      productId,
      jtbdId: jtbdId || undefined,
      segmentId: segmentId || undefined,
      userId: getCurrentUserId(),
      statusChanges: { create: { status: HypothesisStatus.DRAFT } },
    },
  })
  revalidatePath('/hypotheses')
  revalidatePath(`/products/${productId}/onboarding/hypotheses`)
  return { ok: true, hypothesis }
}

export async function updateHypothesisField(
  id: string,
  field: 'statement' | 'priority' | 'tags' | 'validationCriterion',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('hypothesis', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    // Пустая строка — это null, а не пустой текст: «критерия нет» и «критерий
    // задан пустым» должны быть одним состоянием, иначе чек-лист готовности
    // (фаза 3) засчитает второе как заполненное.
    case 'validationCriterion': {
      const criterion = value.trim()
      await prisma.hypothesis.update({
        where: { id },
        data: { validationCriterion: criterion || null },
      })
      break
    }
    case 'statement': {
      const statement = value.trim()
      if (!statement) return { ok: false, error: 'Формулировка не может быть пустой' }
      await prisma.hypothesis.update({ where: { id }, data: { statement } })
      break
    }
    case 'priority': {
      if (value.trim() === '') {
        await prisma.hypothesis.update({ where: { id }, data: { priority: null } })
        break
      }
      const priority = Number(value)
      if (!Number.isInteger(priority)) return { ok: false, error: 'Приоритет: целое число' }
      await prisma.hypothesis.update({ where: { id }, data: { priority } })
      break
    }
    case 'tags':
      await prisma.hypothesis.update({ where: { id }, data: { tags: toTagsArray(value) } })
      break
  }
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
  return { ok: true }
}
