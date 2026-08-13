// Tenant guard for mutations (plans/2.0-hardening-plan.md, A1 + Фаза 1).
//
// Almost every mutating Server Action took an id straight from the client and
// wrote to it: `prisma.segment.update({ where: { id } })`. That is only safe
// while `getCurrentUserId()` returns one hard-coded user. The day real
// sessions land — a one-line change in lib/current-user.ts — every one of
// those becomes a cross-tenant write, in a single commit, with nothing failing
// to warn about it.
//
// Why a check-then-write helper rather than `where: { id, userId }`: Prisma's
// `update`/`delete` require a *unique* selector, and `userId` is not part of
// any unique index here, so the filter cannot simply be widened. `updateMany`
// would accept it but silently succeeds on zero rows, which hides the very
// case this exists to catch.
//
// Not a Prisma middleware / RLS layer on purpose — the plan lists that as a
// separate architectural decision. This is deliberately boring and explicit:
// one lookup, one boolean, callable from anywhere, and compatible with either
// of those futures.
//
// This file is NOT 'use server' — a 'use server' module may only export async
// functions, and the model list below is data.

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

type Found = { id: string } | null

/**
 * Every model a mutation can target, mapped to the query that proves the
 * caller owns it.
 *
 * Fifteen models carry `userId` directly. The rest are reachable only through
 * a chain (the same convention that lets JtbdGraphLayout and ProcessStep skip
 * their own `userId`) and are filtered through that chain, so a nested record
 * is exactly as protected as its parent.
 */
const OWNERSHIP = {
  // --- direct userId ---
  product: (id: string, userId: string) =>
    prisma.product.findFirst({ where: { id, userId }, select: { id: true } }),
  department: (id: string, userId: string) =>
    prisma.department.findFirst({ where: { id, userId }, select: { id: true } }),
  research: (id: string, userId: string) =>
    prisma.research.findFirst({ where: { id, userId }, select: { id: true } }),
  segment: (id: string, userId: string) =>
    prisma.segment.findFirst({ where: { id, userId }, select: { id: true } }),
  jtbd: (id: string, userId: string) =>
    prisma.jTBD.findFirst({ where: { id, userId }, select: { id: true } }),
  hypothesis: (id: string, userId: string) =>
    prisma.hypothesis.findFirst({ where: { id, userId }, select: { id: true } }),
  conversation: (id: string, userId: string) =>
    prisma.conversation.findFirst({ where: { id, userId }, select: { id: true } }),
  competitor: (id: string, userId: string) =>
    prisma.competitor.findFirst({ where: { id, userId }, select: { id: true } }),
  productResource: (id: string, userId: string) =>
    prisma.productResource.findFirst({ where: { id, userId }, select: { id: true } }),
  feature: (id: string, userId: string) =>
    prisma.feature.findFirst({ where: { id, userId }, select: { id: true } }),
  rtb: (id: string, userId: string) =>
    prisma.rTB.findFirst({ where: { id, userId }, select: { id: true } }),
  insight: (id: string, userId: string) =>
    prisma.insight.findFirst({ where: { id, userId }, select: { id: true } }),
  person: (id: string, userId: string) =>
    prisma.person.findFirst({ where: { id, userId }, select: { id: true } }),
  roadmapItem: (id: string, userId: string) =>
    prisma.roadmapItem.findFirst({ where: { id, userId }, select: { id: true } }),
  actionPlan: (id: string, userId: string) =>
    prisma.actionPlan.findFirst({ where: { id, userId }, select: { id: true } }),

  // --- reached through a relation chain ---
  process: (id: string, userId: string) =>
    prisma.process.findFirst({ where: { id, product: { userId } }, select: { id: true } }),
  processStep: (id: string, userId: string) =>
    prisma.processStep.findFirst({
      where: { id, process: { product: { userId } } },
      select: { id: true },
    }),
  processEdge: (id: string, userId: string) =>
    prisma.processEdge.findFirst({
      where: { id, fromStep: { process: { product: { userId } } } },
      select: { id: true },
    }),
  competitorNewsItem: (id: string, userId: string) =>
    prisma.competitorNewsItem.findFirst({
      where: { id, competitor: { userId } },
      select: { id: true },
    }),
  jtbdSequenceEdge: (id: string, userId: string) =>
    prisma.jtbdSequenceEdge.findFirst({
      where: { id, fromJtbd: { userId } },
      select: { id: true },
    }),
  productTeamMember: (id: string, userId: string) =>
    prisma.productTeamMember.findFirst({
      where: { id, product: { userId } },
      select: { id: true },
    }),
} satisfies Record<string, (id: string, userId: string) => Promise<Found>>

export type OwnedModel = keyof typeof OWNERSHIP

/** The message every guard returns. Deliberately "not found", not "denied": */
/** a caller must not be able to probe which ids exist by reading the error. */
export const NOT_OWNED_ERROR = 'Запись не найдена'

/** True only if the record exists AND belongs to this user. */
export async function isOwned(model: OwnedModel, id: string, userId: string): Promise<boolean> {
  if (!id) return false
  return (await OWNERSHIP[model](id, userId)) !== null
}

/**
 * Guard for actions that return a result object.
 *
 * Returns `null` when the caller owns the record, or the error to hand back.
 * Reads as: `const denied = await denyUnowned(...); if (denied) return denied`.
 */
export async function denyUnowned(
  model: OwnedModel,
  id: string,
  userId: string
): Promise<{ ok: false; error: string } | null> {
  return (await isOwned(model, id, userId)) ? null : { ok: false, error: NOT_OWNED_ERROR }
}

/**
 * Guard for actions that `redirect()` instead of returning a result.
 *
 * Those have no error channel, so an unowned record raises a 404 — which is
 * also the right answer on the merits: from a caller who does not own it, the
 * record genuinely does not exist, and saying "forbidden" would confirm that
 * it does.
 */
export async function assertOwned(model: OwnedModel, id: string, userId: string): Promise<void> {
  if (!(await isOwned(model, id, userId))) notFound()
}
