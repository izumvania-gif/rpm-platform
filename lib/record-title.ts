import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

// Заголовок вкладки браузера для карточки записи (фаза 15).
//
// До этого все 83 страницы назывались «RPM Platform - Research & Product
// Management»: история браузера, переключение вкладок и закладки были
// бесполезны — двенадцать открытых карточек выглядели как одна. Шаблон
// заголовка живёт в корневом layout (`%s — RPM`), сюда приходит только имя.
//
// Один лёгкий запрос по `select` на нужное поле, а не полная загрузка записи:
// `generateMetadata` выполняется отдельно от страницы, и тащить сюда те же
// `include`, что и в теле, значило бы удвоить работу базы ради строки в
// заголовке. Отсутствующая запись — не ошибка: страница сама вызовет
// `notFound()`, а вкладка получит заголовок раздела.

const RECORD_TITLE = {
  segment: (id: string, userId: string) =>
    prisma.segment.findFirst({ where: { id, userId }, select: { name: true } }),
  jtbd: (id: string, userId: string) =>
    prisma.jTBD.findFirst({ where: { id, userId }, select: { title: true } }),
  hypothesis: (id: string, userId: string) =>
    prisma.hypothesis.findFirst({ where: { id, userId }, select: { statement: true } }),
  feature: (id: string, userId: string) =>
    prisma.feature.findFirst({ where: { id, userId }, select: { name: true } }),
  rtb: (id: string, userId: string) =>
    prisma.rTB.findFirst({ where: { id, userId }, select: { statement: true } }),
  competitor: (id: string, userId: string) =>
    prisma.competitor.findFirst({ where: { id, userId }, select: { name: true } }),
  research: (id: string, userId: string) =>
    prisma.research.findFirst({ where: { id, userId }, select: { title: true } }),
  conversation: (id: string, userId: string) =>
    prisma.conversation.findFirst({ where: { id, userId }, select: { title: true } }),
  insight: (id: string, userId: string) =>
    prisma.insight.findFirst({ where: { id, userId }, select: { text: true } }),
  product: (id: string, userId: string) =>
    prisma.product.findFirst({ where: { id, userId }, select: { name: true } }),
  person: (id: string, userId: string) =>
    prisma.person.findFirst({ where: { id, userId }, select: { name: true } }),
  department: (id: string, userId: string) =>
    prisma.department.findFirst({ where: { id, userId }, select: { name: true } }),
} as const

export type TitledModel = keyof typeof RECORD_TITLE

/** Длинные формулировки (гипотеза, инсайт) в заголовке вкладки обрезаются. */
const MAX_TITLE = 60

export function clipTitle(text: string): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > MAX_TITLE ? `${one.slice(0, MAX_TITLE - 1).trimEnd()}…` : one
}

/**
 * Имя записи для `generateMetadata`, либо `fallback` (имя раздела), если
 * записи нет или она чужая.
 */
export async function recordTitle(
  model: TitledModel,
  id: string,
  fallback: string
): Promise<string> {
  const row = await RECORD_TITLE[model](id, getCurrentUserId())
  if (!row) return fallback
  const text = Object.values(row)[0]
  return typeof text === 'string' && text.trim() ? clipTitle(text) : fallback
}
