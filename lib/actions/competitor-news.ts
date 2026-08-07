'use server'

import type { CompetitorNewsItem } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createCompetitorNewsItem(
  competitorId: string,
  title: string,
  url?: string,
  date?: string,
  note?: string
): Promise<{ ok: true; item: CompetitorNewsItem } | { ok: false; error: string }> {
  const trimmedTitle = title.trim()
  if (!competitorId || !trimmedTitle) {
    return { ok: false, error: 'Укажите заголовок' }
  }

  const item = await prisma.competitorNewsItem.create({
    data: {
      title: trimmedTitle,
      url: url?.trim() || undefined,
      date: date ? new Date(date) : undefined,
      note: note?.trim() || undefined,
      competitorId,
    },
  })
  revalidatePath(`/competitors/${competitorId}`)
  return { ok: true, item }
}

export async function deleteCompetitorNewsItem(id: string, competitorId: string): Promise<void> {
  await prisma.competitorNewsItem.delete({ where: { id } })
  revalidatePath(`/competitors/${competitorId}`)
}
