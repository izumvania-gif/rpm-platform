'use server'

import { z } from 'zod'
import { HypothesisStatus, type Hypothesis } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalNumber, optionalString, toTagsArray } from '@/lib/validation'

const hypothesisSchema = z.object({
  statement: z.string().trim().min(1, 'Формулировка обязательна'),
  status: z.nativeEnum(HypothesisStatus),
  priority: optionalNumber(z.coerce.number().int()),
  tags: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
  jtbdId: optionalString(),
  segmentId: optionalString(),
  researchId: optionalString(),
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
  })
}

export async function createHypothesis(formData: FormData) {
  const parsed = parseHypothesisForm(formData)
  if (!parsed.success) {
    redirect(`/hypotheses/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

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
  redirect('/hypotheses')
}

export async function updateHypothesis(id: string, formData: FormData) {
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
  await prisma.hypothesis.delete({ where: { id } })
  revalidatePath('/hypotheses')
  redirect('/hypotheses')
}

export async function updateHypothesisStatus(id: string, status: HypothesisStatus) {
  await prisma.hypothesis.update({
    where: { id },
    data: { status, statusChanges: { create: { status } } },
  })
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
}

export async function toggleHypothesisPinned(id: string, pinned: boolean) {
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
