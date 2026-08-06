'use server'

import { z } from 'zod'
import { HypothesisStatus } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalNumber, optionalString } from '@/lib/validation'

const hypothesisSchema = z.object({
  statement: z.string().trim().min(1, 'Формулировка обязательна'),
  status: z.nativeEnum(HypothesisStatus),
  priority: optionalNumber(z.coerce.number().int()),
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

  const hypothesis = await prisma.hypothesis.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  })
  revalidatePath('/hypotheses')
  redirect(`/hypotheses/${hypothesis.id}`)
}

export async function updateHypothesis(id: string, formData: FormData) {
  const parsed = parseHypothesisForm(formData)
  if (!parsed.success) {
    redirect(`/hypotheses/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  await prisma.hypothesis.update({
    where: { id },
    data: parsed.data,
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
  await prisma.hypothesis.update({ where: { id }, data: { status } })
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
}
