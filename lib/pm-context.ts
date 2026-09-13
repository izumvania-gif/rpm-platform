import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { ACTIVE_PRODUCT_COOKIE, resolveActiveProductId } from '@/lib/product-context'
import type { Person, Product } from '@prisma/client'

// Общая часть всех вкладок «Доставки» (фаза 9 редизайна 2.1).
//
// Каждая вкладка — отдельный маршрут и грузит только свои данные, но шапка у
// них одна: список продуктов для переключателя, выбранный продукт и справочники
// людей и департаментов, из которых собраны инлайн-поля в карточке продукта.
// Раз шапка одна, то и запрос под неё должен быть один — иначе пять страниц
// начнут расходиться в том, что считают «выбранным продуктом».
//
// Не `'use server'`: это не Server Action, а обычный серверный хелпер, который
// вызывает Server Component.

export interface PmContext {
  userId: string
  products: Product[]
  /** undefined, когда продукт не выбран или выбран несуществующий. */
  selectedProductId: string | undefined
  /** В ссылке был `productId`, но такого продукта нет — показан другой (фаза 20). */
  requestedProductMissing: boolean
  product: Product | null
  people: Person[]
}

export async function loadPmContext(productIdParam?: string): Promise<PmContext> {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })

  // Проверка «продукт из параметра принадлежит пользователю» по уже
  // загруженному списку, а не отдельным запросом: id приходит из URL, и без
  // неё чужой id молча стал бы «выбранным».
  //
  // Если параметра нет — берём активный продукт из cookie, тот же, по которому
  // фильтруется вся цепочка дискавери (фаза 13). До этого «Доставка» была
  // единственным местом, которое забывало, над каким продуктом человек только
  // что работал: он выбирал продукт в шапке, проходил сегменты и гипотезы, а
  // на вкладке роадмапа его встречало пустое «Выберите продукт». Явный
  // параметр по-прежнему главнее — ссылки вида `/pm/roadmap?productId=…`
  // должны вести именно туда, куда написано.
  const explicit =
    productIdParam && products.some((p) => p.id === productIdParam) ? productIdParam : undefined
  const fromCookie = resolveActiveProductId(
    cookies().get(ACTIVE_PRODUCT_COOKIE)?.value,
    products.map((p) => p.id)
  )
  const selectedProductId = explicit ?? fromCookie ?? undefined
  const requestedProductMissing = Boolean(productIdParam) && !explicit

  if (!selectedProductId) {
    return {
      userId,
      products,
      selectedProductId,
      requestedProductMissing,
      product: null,
      people: [],
    }
  }

  // Департаменты здесь больше не грузятся (фаза 21): карточка продукта на
  // «Доставке» свёрнута до одной строки — название, стадия, ответственный, —
  // а департамент и описание правятся на полной карточке.
  const [product, people] = await Promise.all([
    prisma.product.findFirst({ where: { id: selectedProductId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  return {
    userId,
    products,
    selectedProductId,
    requestedProductMissing,
    product,
    people,
  }
}
