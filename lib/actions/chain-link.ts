'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { denyUnowned } from '@/lib/ownership'
import { chainGapByKind, type ChainCandidate, type ChainGapKind } from '@/lib/chain-gap'
import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

// Починка разрыва в ленте цепочки (фаза 7 редизайна 2.1).
//
// Не редиректит — по той же причине, что и setLink: смысл всей затеи в том,
// что разрыв закрывается, не уводя с карточки. Отсюда конвенция createXQuick:
// `{ ok }` обратно на клиент, оптимистичное состояние и откат — на нём.
//
// Оба id приходят от клиента, поэтому оба проходят denyUnowned: и запись, чья
// карточка открыта, и выбранная цель. Проверить только одну значило бы
// оставить второй половине связи открытую межарендную запись — ровно ту дыру,
// на которую в lib/actions/links.ts есть отдельный интеграционный тест.

type CandidatesResult =
  { ok: true; candidates: ChainCandidate[]; productId: string } | { ok: false; error: string }

const NOT_FOUND = { ok: false, error: 'Запись не найдена' } as const

/** Продукт карточки — область, из которой вообще можно выбирать. */
async function anchorProductId(kind: ChainGapKind, anchorId: string): Promise<string | null> {
  const meta = chainGapByKind(kind)
  switch (meta.anchor) {
    case 'jtbd': {
      const row = await prisma.jTBD.findUnique({
        where: { id: anchorId },
        select: { productId: true },
      })
      return row?.productId ?? null
    }
    case 'feature': {
      const row = await prisma.feature.findUnique({
        where: { id: anchorId },
        select: { productId: true },
      })
      return row?.productId ?? null
    }
    case 'hypothesis': {
      const row = await prisma.hypothesis.findUnique({
        where: { id: anchorId },
        select: { productId: true },
      })
      return row?.productId ?? null
    }
  }
}

/**
 * Что можно выбрать, чтобы закрыть этот разрыв.
 *
 * Всегда в пределах продукта карточки: цепочка описывает один продукт, и
 * связь между продуктами тут не значила бы ничего — ни один отчёт её не
 * считает. Уже связанное исключается, иначе пикер предлагал бы действие,
 * которое ничего не меняет.
 */
export async function chainCandidates(
  kind: ChainGapKind,
  anchorId: string
): Promise<CandidatesResult> {
  const meta = chainGapByKind(kind)
  const userId = getCurrentUserId()

  const denied = await denyUnowned(meta.anchor, anchorId, userId)
  if (denied) return denied

  const productId = await anchorProductId(kind, anchorId)
  if (!productId) return NOT_FOUND

  const scope = { userId, productId }

  switch (kind) {
    case 'jtbd-segment': {
      const rows = await prisma.segment.findMany({
        where: { ...scope, jtbds: { none: { id: anchorId } } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({ id: r.id, label: r.name, fullLabel: r.name })),
      }
    }
    case 'jtbd-hypothesis': {
      // Только гипотезы, ни к какой задаче ещё не привязанные. Пикер, который
      // предлагает чужую гипотезу, на самом деле предлагает отобрать её —
      // связь `Hypothesis.jtbdId` одна на запись.
      const rows = await prisma.hypothesis.findMany({
        where: { ...scope, jtbdId: null },
        select: { id: true, statement: true },
        orderBy: { createdAt: 'desc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({
          id: r.id,
          label: hypothesisKeyPhrase(r.statement),
          fullLabel: r.statement,
        })),
      }
    }
    case 'jtbd-feature': {
      const rows = await prisma.feature.findMany({
        where: { ...scope, jtbds: { none: { id: anchorId } } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({ id: r.id, label: r.name, fullLabel: r.name })),
      }
    }
    case 'feature-jtbd': {
      const rows = await prisma.jTBD.findMany({
        where: { ...scope, features: { none: { id: anchorId } } },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({
          id: r.id,
          label: jtbdKeyPhrase(r.title),
          fullLabel: r.title,
        })),
      }
    }
    case 'feature-rtb': {
      const rows = await prisma.rTB.findMany({
        where: { ...scope, features: { none: { id: anchorId } } },
        select: { id: true, statement: true },
        orderBy: { createdAt: 'desc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({ id: r.id, label: r.statement, fullLabel: r.statement })),
      }
    }
    case 'hypothesis-segment': {
      const rows = await prisma.segment.findMany({
        where: scope,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({ id: r.id, label: r.name, fullLabel: r.name })),
      }
    }
    case 'hypothesis-jtbd': {
      const rows = await prisma.jTBD.findMany({
        where: scope,
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({
          id: r.id,
          label: jtbdKeyPhrase(r.title),
          fullLabel: r.title,
        })),
      }
    }
    case 'hypothesis-feature': {
      const rows = await prisma.feature.findMany({
        where: { ...scope, hypotheses: { none: { id: anchorId } } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      return {
        ok: true,
        productId,
        candidates: rows.map((r) => ({ id: r.id, label: r.name, fullLabel: r.name })),
      }
    }
  }
}

/** Поставить связь. Одно звено, одна запись — ровно то, что обещала кнопка. */
export async function fillChainGap(
  kind: ChainGapKind,
  anchorId: string,
  targetId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const meta = chainGapByKind(kind)
  const userId = getCurrentUserId()

  const anchorDenied = await denyUnowned(meta.anchor, anchorId, userId)
  if (anchorDenied) return anchorDenied
  const targetDenied = await denyUnowned(meta.target, targetId, userId)
  if (targetDenied) return targetDenied

  switch (kind) {
    case 'jtbd-segment':
      await prisma.jTBD.update({
        where: { id: anchorId },
        data: { segments: { connect: { id: targetId } } },
      })
      break
    case 'jtbd-hypothesis': {
      // Условие `jtbdId: null` — не оптимизация, а та же защита, что и в
      // отборе кандидатов, только на записи: между показом списка и кликом
      // гипотезу мог привязать кто-то другой, и молча переписать чужую связь
      // здесь нельзя. updateMany именно ради условия — update требует
      // уникального селектора.
      const { count } = await prisma.hypothesis.updateMany({
        where: { id: targetId, jtbdId: null },
        data: { jtbdId: anchorId },
      })
      if (count === 0) return { ok: false, error: 'Гипотеза уже привязана к другой задаче' }
      break
    }
    case 'jtbd-feature':
      await prisma.feature.update({
        where: { id: targetId },
        data: { jtbds: { connect: { id: anchorId } } },
      })
      break
    case 'feature-jtbd':
      await prisma.feature.update({
        where: { id: anchorId },
        data: { jtbds: { connect: { id: targetId } } },
      })
      break
    case 'feature-rtb':
      await prisma.feature.update({
        where: { id: anchorId },
        data: { rtbs: { connect: { id: targetId } } },
      })
      break
    case 'hypothesis-segment':
      await prisma.hypothesis.update({
        where: { id: anchorId },
        data: { segmentId: targetId },
      })
      break
    case 'hypothesis-jtbd':
      await prisma.hypothesis.update({
        where: { id: anchorId },
        data: { jtbdId: targetId },
      })
      break
    case 'hypothesis-feature':
      await prisma.feature.update({
        where: { id: targetId },
        data: { hypotheses: { connect: { id: anchorId } } },
      })
      break
  }

  // Всё, что считает связи, а не записи — тот же список, что у setLink.
  revalidatePath('/jtbd')
  revalidatePath('/features')
  revalidatePath('/marketing')
  revalidatePath('/segments')
  revalidatePath('/hypotheses')
  revalidatePath('/reports/gaps')
  revalidatePath('/reports/segments-jtbd')
  revalidatePath('/')
  return { ok: true }
}
