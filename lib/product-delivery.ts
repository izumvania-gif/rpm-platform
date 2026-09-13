// Блок «Доставка» на карточке продукта (фаза 21 аудита 2.3).
//
// Карточка продукта была хабом только дискавери: исследования, сегменты,
// задачи, гипотезы, позиционирование — и ни слова о том, что с этим продуктом
// происходит в «Доставке». Роадмап, вехи, процессы и команда жили на `/pm`, и
// со страницы продукта туда не вело ничего, кроме меню. Здесь — те же факты,
// что показывают вкладки `/pm`, свёрнутые до одной строки каждая.
//
// Чистый модуль: страница передаёт уже загруженные пункты роадмапа, дата «сейчас»
// приходит параметром, чтобы тест не зависел от календаря.

import { RoadmapStatus } from '@prisma/client'

export interface DeliveryRoadmapItem {
  id: string
  title: string
  status: RoadmapStatus
  startDate: Date | null
  isMilestone: boolean
}

/** Сколько пунктов в каждом статусе — в порядке `roadmapStatusOrder`, с нулями. */
export function roadmapStatusCounts(
  items: { status: RoadmapStatus }[]
): Record<RoadmapStatus, number> {
  const counts: Record<RoadmapStatus, number> = {
    PLANNED: 0,
    IN_PROGRESS: 0,
    SHIPPED: 0,
    PAUSED: 0,
  }
  for (const item of items) counts[item.status] += 1
  return counts
}

/**
 * Ближайшая веха: самая ранняя из тех, что ещё не прошли.
 *
 * Веха без даты — не веха на календаре, она не участвует. Прошедшие вехи тоже
 * не показываются: «ближайшая» — это то, к чему идут, а не то, что было. Порог
 * — начало сегодняшнего дня, чтобы веха на сегодня оставалась ближайшей до
 * полуночи, а не исчезала в ноль часов одну минуту.
 */
export function nextMilestone<T extends DeliveryRoadmapItem>(items: T[], now: Date): T | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let best: T | null = null
  for (const item of items) {
    if (!item.isMilestone || !item.startDate) continue
    if (item.startDate < today) continue
    if (!best || item.startDate < best.startDate!) best = item
  }
  return best
}
