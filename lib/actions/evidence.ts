'use server'

import { revalidatePath } from 'next/cache'
import { InsightStance } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { denyUnowned } from '@/lib/ownership'
import type { ChainCandidate } from '@/lib/chain-gap'
import { insightKeyPhrase } from '@/lib/key-phrase'

// Доказательство к гипотезе, не уходя с карточки (фаза 21 аудита 2.3).
//
// «+ Добавить доказательство» вела на полную форму инсайта — единственный
// путь, даже когда нужный инсайт уже записан из разговора и его надо просто
// привязать. Здесь та же пара, что у chain-link.ts: список кандидатов и одна
// запись связи; создание нового — через createInsightQuick и потом сюда же,
// одним и тем же кодом, что и для существующего.
//
// Оба id приходят от клиента, поэтому оба проходят denyUnowned — по той же
// причине, что в setLink и fillChainGap: проверить только гипотезу значило
// бы оставить инсайту открытую межарендную запись.

type CandidatesResult =
  { ok: true; candidates: ChainCandidate[]; productId: string } | { ok: false; error: string }

const NOT_FOUND = { ok: false, error: 'Запись не найдена' } as const

/**
 * Инсайты продукта, ещё не привязанные ни к какой гипотезе.
 *
 * `Insight.hypothesisId` — одна связь на запись, и пикер, предлагающий уже
 * привязанный инсайт, на самом деле предлагал бы отобрать его у другой
 * гипотезы; поэтому такие не показываются вовсе, а не помечаются.
 */
export async function evidenceCandidates(hypothesisId: string): Promise<CandidatesResult> {
  const userId = getCurrentUserId()
  const denied = await denyUnowned('hypothesis', hypothesisId, userId)
  if (denied) return denied

  const hypothesis = await prisma.hypothesis.findUnique({
    where: { id: hypothesisId },
    select: { productId: true },
  })
  if (!hypothesis) return NOT_FOUND

  const rows = await prisma.insight.findMany({
    where: { userId, productId: hypothesis.productId, hypothesisId: null },
    select: { id: true, text: true },
    orderBy: { createdAt: 'desc' },
  })
  return {
    ok: true,
    productId: hypothesis.productId,
    candidates: rows.map((r) => ({ id: r.id, label: insightKeyPhrase(r.text), fullLabel: r.text })),
  }
}

/**
 * Привязать инсайт к гипотезе как доказательство.
 *
 * `stance` — null разрешён намеренно: инсайт может быть наблюдением, не
 * занимающим сторону, и выдуманный голос испортил бы баланс (фаза 2 схемы).
 * Условие `hypothesisId: null` повторено на записи, а не только в отборе:
 * между показом списка и кликом инсайт мог привязать кто-то другой, и молча
 * переписать чужую связь нельзя — updateMany именно ради условия.
 */
export async function attachEvidence(
  hypothesisId: string,
  insightId: string,
  stance: InsightStance | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = getCurrentUserId()

  const hypothesisDenied = await denyUnowned('hypothesis', hypothesisId, userId)
  if (hypothesisDenied) return hypothesisDenied
  const insightDenied = await denyUnowned('insight', insightId, userId)
  if (insightDenied) return insightDenied

  // Значение приходит с клиента: всё, что не из перечисления, — не сторона.
  if (stance !== null && !Object.values(InsightStance).includes(stance)) {
    return { ok: false, error: 'Неизвестная сторона доказательства' }
  }

  const hypothesis = await prisma.hypothesis.findUnique({
    where: { id: hypothesisId },
    select: { productId: true },
  })
  if (!hypothesis) return NOT_FOUND

  // Продукт — тоже условие записи: доказательство из другого продукта в
  // балансе этой гипотезы не значит ничего, ни один отчёт его не считает.
  const { count } = await prisma.insight.updateMany({
    where: { id: insightId, hypothesisId: null, productId: hypothesis.productId },
    data: { hypothesisId, stance },
  })
  if (count === 0) {
    return { ok: false, error: 'Инсайт уже привязан к другой гипотезе или из другого продукта' }
  }

  revalidatePath('/hypotheses')
  revalidatePath(`/hypotheses/${hypothesisId}`)
  revalidatePath('/insights')
  revalidatePath('/')
  return { ok: true }
}
