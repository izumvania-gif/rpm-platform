'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { denyUnowned } from '@/lib/ownership'
import type { ChainCandidate } from '@/lib/chain-gap'

// «Подтвердить исследованием» одним действием (фаза 25 плана 2.4).
//
// Подтверждение задачи значит «есть исследование, на которое она опирается»,
// и до этого оно делалось двумя полями в форме редактирования: выбрать
// исследование и отдельно поставить галочку. Одно намерение — два действия,
// а между ними форма. Здесь то же самое одним вызовом: исследование и флаг
// ставятся вместе. Без выбранного исследования флаг не ставится вовсе — это
// сохраняет правило, по которому у неподтверждённой задачи нет кнопки
// «подтвердить» в один клик (/reports/gaps, блок «Что мешает»).
//
// Оба id приходят с клиента и оба проходят denyUnowned — как в setLink,
// fillChainGap и attachEvidence.

type CandidatesResult =
  { ok: true; candidates: ChainCandidate[]; productId: string } | { ok: false; error: string }

const NOT_FOUND = { ok: false, error: 'Запись не найдена' } as const

/**
 * Исследования продукта задачи. Все, а не только «свободные»: одно
 * исследование подтверждает много задач, связь здесь не одна на запись.
 */
export async function confirmResearchCandidates(jtbdId: string): Promise<CandidatesResult> {
  const userId = getCurrentUserId()
  const denied = await denyUnowned('jtbd', jtbdId, userId)
  if (denied) return denied

  const jtbd = await prisma.jTBD.findUnique({ where: { id: jtbdId }, select: { productId: true } })
  if (!jtbd) return NOT_FOUND

  const rows = await prisma.research.findMany({
    where: { userId, productId: jtbd.productId },
    select: { id: true, number: true, title: true },
    orderBy: { number: 'desc' },
  })
  return {
    ok: true,
    productId: jtbd.productId,
    candidates: rows.map((r) => ({
      id: r.id,
      label: `#${r.number} ${r.title}`,
      fullLabel: `#${r.number} ${r.title}`,
    })),
  }
}

/** Привязать исследование и отметить задачу подтверждённой — одним действием. */
export async function confirmJtbdWithResearch(
  jtbdId: string,
  researchId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = getCurrentUserId()

  const jtbdDenied = await denyUnowned('jtbd', jtbdId, userId)
  if (jtbdDenied) return jtbdDenied
  if (!researchId) return { ok: false, error: 'Выберите исследование' }
  const researchDenied = await denyUnowned('research', researchId, userId)
  if (researchDenied) return researchDenied

  const [jtbd, research] = await Promise.all([
    prisma.jTBD.findUnique({ where: { id: jtbdId }, select: { productId: true } }),
    prisma.research.findUnique({ where: { id: researchId }, select: { productId: true } }),
  ])
  if (!jtbd || !research) return NOT_FOUND
  // Подтверждение исследованием другого продукта не значит ничего: ни матрица
  // покрытия, ни «Пробелы» не считают связи между продуктами.
  if (jtbd.productId !== research.productId) {
    return { ok: false, error: 'Исследование из другого продукта' }
  }

  await prisma.jTBD.update({ where: { id: jtbdId }, data: { researchId, confirmed: true } })

  // Всё, что считает подтверждённость: список, карточка, очередь, матрица,
  // дашборд и карточка продукта.
  revalidatePath('/jtbd')
  revalidatePath(`/jtbd/${jtbdId}`)
  revalidatePath('/reports/gaps')
  revalidatePath('/reports/segments-jtbd')
  revalidatePath('/')
  revalidatePath(`/products/${jtbd.productId}`)
  return { ok: true }
}
