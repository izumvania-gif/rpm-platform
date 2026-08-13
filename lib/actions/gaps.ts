'use server'

import { revalidatePath } from 'next/cache'
import { HypothesisStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

// Actions applied straight from the gaps queue (plans/2.0-product-leap-plan.md, C3).
//
// Deliberately not a call to the existing updateHypothesisStatus: that one
// takes any status, checks no ownership, and revalidates only the hypothesis
// paths. The queue needs the opposite of a general-purpose setter — exactly
// one transition, the owner verified before the write, and /reports/gaps
// refreshed so the task disappears from the list it was pressed in.

export async function moveStuckHypothesisToReview(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: 'Не указана гипотеза' }

  const userId = getCurrentUserId()
  const hypothesis = await prisma.hypothesis.findFirst({ where: { id, userId } })
  if (!hypothesis) return { ok: false, error: 'Гипотеза не найдена' }

  // Only ever DRAFT -> IN_REVIEW. If it already moved (another tab, the kanban
  // board), leave it alone rather than dragging it backwards.
  if (hypothesis.status !== HypothesisStatus.DRAFT) {
    return { ok: false, error: 'Гипотеза уже не в черновике' }
  }

  await prisma.hypothesis.update({
    where: { id },
    data: {
      status: HypothesisStatus.IN_REVIEW,
      statusChanges: { create: { status: HypothesisStatus.IN_REVIEW } },
    },
  })

  revalidatePath('/reports/gaps')
  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${id}`)
  revalidatePath('/')
  return { ok: true }
}
