import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  ACTIVE_PRODUCT_COOKIE,
  ACTIVE_PRODUCT_COOKIE_MAX_AGE,
  resolveActiveProductId,
} from '@/lib/product-context'

// Серверная половина «активного продукта»: чтение cookie + проверка по базе.
// Отдельным файлом от lib/product-context.ts, потому что `cookies()` из
// next/headers и Prisma не поднимаются в юнит-тесте, а правила разрешения
// значения проверять надо — они там и живут, чистыми.
//
// Это НЕ `'use server'`-модуль: такой может экспортировать только async
// функции, а отсюда нужны и обычные значения.

export interface ActiveProduct {
  id: string
  name: string
}

/**
 * Активный продукт и список всех продуктов пользователя одним заходом.
 *
 * Один запрос, а не два: список всё равно нужен переключателю в шапке, а
 * проверка «принадлежит ли id из cookie этому пользователю» делается по тому
 * же списку, без второго обращения к базе.
 */
export async function getProductContext(userId: string): Promise<{
  products: ActiveProduct[]
  activeProductId: string | null
}> {
  const products = await prisma.product.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const cookieValue = cookies().get(ACTIVE_PRODUCT_COOKIE)?.value
  return {
    products,
    activeProductId: resolveActiveProductId(
      cookieValue,
      products.map((p) => p.id)
    ),
  }
}

/** Только id — для страниц, которым список продуктов не нужен. */
export async function getActiveProductId(userId: string): Promise<string | null> {
  return (await getProductContext(userId)).activeProductId
}

/**
 * Сделать продукт активным. Вызывается из Server Action — только там cookie
 * можно записать; из Server Component (рендер страницы) Next это запрещает.
 */
export function setActiveProductCookie(productId: string) {
  cookies().set(ACTIVE_PRODUCT_COOKIE, productId, {
    path: '/',
    maxAge: ACTIVE_PRODUCT_COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
}

export function clearActiveProductCookie() {
  cookies().delete(ACTIVE_PRODUCT_COOKIE)
}
