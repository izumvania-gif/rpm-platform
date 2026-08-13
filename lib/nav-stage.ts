import { prisma } from '@/lib/prisma'
import { deriveNavStage, type NavStage } from '@/lib/nav-disclosure'

// Server side of the nav's progressive disclosure (C1). Kept apart from
// lib/nav-disclosure.ts so the pure half stays importable from client
// components; only this file touches Prisma.

/**
 * True once anything exists outside the base chain (Продукт/Сегмент/JTBD).
 *
 * Deliberately an existence check per module rather than a single "has the
 * user got a JTBD yet" proxy: the invariant that basic mode never hides a
 * non-empty module is what makes the whole feature safe, and a proxy would
 * break it for anyone who filled, say, only Конкуренты (an import, a
 * different working order). Each query is an indexed lookup on userId with
 * LIMIT 1 and they all run in parallel, so this costs one round trip's
 * latency — measured at ~3ms locally against a populated database.
 *
 * If it ever needs to be cheaper, this is the single place to cache: the
 * answer only flips once per workspace, and only in one direction.
 */
export async function hasDataBeyondBase(userId: string): Promise<boolean> {
  const pick = { where: { userId }, select: { id: true } } as const

  const found = await Promise.all([
    prisma.research.findFirst(pick),
    prisma.hypothesis.findFirst(pick),
    prisma.conversation.findFirst(pick),
    prisma.insight.findFirst(pick),
    prisma.competitor.findFirst(pick),
    prisma.feature.findFirst(pick),
    prisma.rTB.findFirst(pick),
    prisma.person.findFirst(pick),
    prisma.department.findFirst(pick),
  ])

  return found.some((row) => row !== null)
}

export async function getNavStage(userId: string): Promise<NavStage> {
  return deriveNavStage(await hasDataBeyondBase(userId))
}
