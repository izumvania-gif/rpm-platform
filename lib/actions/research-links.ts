'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { denyUnowned } from '@/lib/ownership'
import type { ChainCandidate } from '@/lib/chain-gap'
import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

// Исследование знает, что на него опирается (фаза 26 плана 2.4, F6).
//
// Связь «запись ↔ исследование» ставилась только из формы каждой записи:
// задача, гипотеза и разговор знали своё исследование, а карточка
// исследования показывала одни инсайты. Разобрать после исследования, какие
// задачи оно подтвердило, значило открыть каждую задачу по очереди. Здесь та
// же пара, что у evidence.ts: список кандидатов и одна запись связи, с
// карточки исследования, не покидая её.
//
// Кандидаты — записи продукта без исследования: `researchId` у всех трёх
// моделей — одна связь на запись, и предложить уже привязанную значило бы
// отобрать её у другого исследования. Условие повторено на записи
// (`updateMany … where researchId: null`), потому что список мог устареть
// между показом и кликом.
//
// Оба id приходят с клиента и оба проходят denyUnowned — как в setLink,
// fillChainGap, attachEvidence и confirmJtbdWithResearch.

export type ResearchLinkKind = 'jtbd' | 'hypothesis' | 'conversation'

type CandidatesResult =
  { ok: true; candidates: ChainCandidate[]; productId: string } | { ok: false; error: string }

const NOT_FOUND = { ok: false, error: 'Запись не найдена' } as const

const KINDS: ResearchLinkKind[] = ['jtbd', 'hypothesis', 'conversation']

/** Записи продукта исследования, ещё не привязанные ни к какому исследованию. */
export async function researchLinkCandidates(
  researchId: string,
  kind: ResearchLinkKind
): Promise<CandidatesResult> {
  const userId = getCurrentUserId()
  if (!KINDS.includes(kind)) return { ok: false, error: 'Неизвестный тип записи' }
  const denied = await denyUnowned('research', researchId, userId)
  if (denied) return denied

  const research = await prisma.research.findUnique({
    where: { id: researchId },
    select: { productId: true },
  })
  if (!research) return NOT_FOUND

  const where = { userId, productId: research.productId, researchId: null }
  let candidates: ChainCandidate[]
  switch (kind) {
    case 'jtbd': {
      const rows = await prisma.jTBD.findMany({
        where,
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
      })
      candidates = rows.map((r) => ({
        id: r.id,
        label: jtbdKeyPhrase(r.title),
        fullLabel: r.title,
      }))
      break
    }
    case 'hypothesis': {
      const rows = await prisma.hypothesis.findMany({
        where,
        select: { id: true, statement: true },
        orderBy: { createdAt: 'desc' },
      })
      candidates = rows.map((r) => ({
        id: r.id,
        label: hypothesisKeyPhrase(r.statement),
        fullLabel: r.statement,
      }))
      break
    }
    case 'conversation': {
      const rows = await prisma.conversation.findMany({
        where,
        select: { id: true, title: true },
        orderBy: { date: 'desc' },
      })
      candidates = rows.map((r) => ({ id: r.id, label: r.title, fullLabel: r.title }))
      break
    }
  }
  return { ok: true, productId: research.productId, candidates }
}

/**
 * Привязать запись к исследованию.
 *
 * Для задачи это то же самое, что «Подтвердить исследованием» на её карточке:
 * связь и флаг ставятся вместе (см. jtbd-confirm.ts) — задача, у которой
 * появилось исследование, по определению им подтверждена, и оставить флаг
 * снятым значило бы показать в «Пробелах» задачу с исследованием как догадку.
 */
export async function attachToResearch(
  researchId: string,
  kind: ResearchLinkKind,
  recordId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = getCurrentUserId()
  if (!KINDS.includes(kind)) return { ok: false, error: 'Неизвестный тип записи' }

  const researchDenied = await denyUnowned('research', researchId, userId)
  if (researchDenied) return researchDenied
  const recordDenied = await denyUnowned(kind, recordId, userId)
  if (recordDenied) return recordDenied

  const research = await prisma.research.findUnique({
    where: { id: researchId },
    select: { productId: true },
  })
  if (!research) return NOT_FOUND

  // Продукт — условие записи, не только отбора: связь с исследованием другого
  // продукта не считает ни матрица, ни «Пробелы».
  const where = { id: recordId, researchId: null, productId: research.productId }
  let count: number
  switch (kind) {
    case 'jtbd':
      count = (await prisma.jTBD.updateMany({ where, data: { researchId, confirmed: true } })).count
      break
    case 'hypothesis':
      count = (await prisma.hypothesis.updateMany({ where, data: { researchId } })).count
      break
    case 'conversation':
      count = (await prisma.conversation.updateMany({ where, data: { researchId } })).count
      break
  }
  if (count === 0) {
    return {
      ok: false,
      error: 'Запись уже привязана к другому исследованию или из другого продукта',
    }
  }

  revalidatePath('/research')
  revalidatePath(`/research/${researchId}`)
  revalidatePath(
    `/${kind === 'jtbd' ? 'jtbd' : kind === 'hypothesis' ? 'hypotheses' : 'conversations'}`
  )
  revalidatePath('/reports/gaps')
  revalidatePath('/reports/segments-jtbd')
  revalidatePath('/')
  revalidatePath(`/products/${research.productId}`)
  return { ok: true }
}
