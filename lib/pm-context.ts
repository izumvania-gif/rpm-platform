import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import type { Department, Person, Product } from '@prisma/client'

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
  product: Product | null
  people: Person[]
  departments: Department[]
}

export async function loadPmContext(productIdParam?: string): Promise<PmContext> {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })

  // Проверка «продукт из параметра принадлежит пользователю» по уже
  // загруженному списку, а не отдельным запросом: id приходит из URL, и без
  // неё чужой id молча стал бы «выбранным».
  const selectedProductId =
    productIdParam && products.some((p) => p.id === productIdParam) ? productIdParam : undefined

  if (!selectedProductId) {
    return { userId, products, selectedProductId, product: null, people: [], departments: [] }
  }

  const [product, people, departments] = await Promise.all([
    prisma.product.findFirst({ where: { id: selectedProductId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  return { userId, products, selectedProductId, product, people, departments }
}
