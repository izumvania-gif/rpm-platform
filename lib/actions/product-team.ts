'use server'

import { Prisma, type Person } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

// Product team roster (plans/2.0-ux-improvement-plan.md, Фаза 2) — the two
// non-redirecting entry points mirror the createXQuick pattern already used
// by the process canvas/onboarding wizard: the roster is edited inline on
// /pm, so neither action can navigate away.
type ProductTeamMemberResult =
  { ok: true; member: { id: string; person: Person } } | { ok: false; error: string }

export async function addProductTeamMemberQuick(
  productId: string,
  personId: string
): Promise<ProductTeamMemberResult> {
  if (!personId) return { ok: false, error: 'Выберите человека' }

  try {
    const member = await prisma.productTeamMember.create({
      data: { productId, personId },
      include: { person: true },
    })
    revalidatePath('/pm')
    return { ok: true, member }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'Этот человек уже в команде продукта' }
    }
    throw e
  }
}

export async function createPersonAndAddToTeamQuick(
  productId: string,
  name: string,
  role: string
): Promise<ProductTeamMemberResult> {
  const trimmedName = name.trim()
  if (!trimmedName) return { ok: false, error: 'Укажите имя' }

  const member = await prisma.productTeamMember.create({
    data: {
      product: { connect: { id: productId } },
      person: {
        create: {
          name: trimmedName,
          role: role.trim() || null,
          skills: [],
          userId: getCurrentUserId(),
        },
      },
    },
    include: { person: true },
  })
  revalidatePath('/pm')
  revalidatePath('/people')
  return { ok: true, member }
}

// Removes someone from the roster only — same as every other /pm "Удалить"
// (RoadmapItem/ActionPlan/Process), a redirect back to a section anchor
// rather than a Quick action, since DeleteButton submits a real <form>.
// Does not touch the underlying Person record.
export async function removeProductTeamMember(id: string) {
  const member = await prisma.productTeamMember.delete({ where: { id } })
  revalidatePath('/pm')
  redirect(`/pm?productId=${member.productId}&scrollTo=team`)
}
