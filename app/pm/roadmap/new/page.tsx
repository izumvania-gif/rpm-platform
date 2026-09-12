import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createRoadmapItem } from '@/lib/actions/roadmap'
import { RoadmapItemForm } from '@/components/forms/roadmap-item-form'

export const dynamic = 'force-dynamic'

export default async function NewRoadmapItemPage({
  searchParams,
}: {
  searchParams: { productId?: string; error?: string }
}) {
  const userId = getCurrentUserId()
  // Продукт из ссылки, иначе активный из шапки (фаза 13). Прежде без
  // `?productId=` страница отдавала жёсткий 404 — по закладке, по ссылке из
  // чата или просто по истории браузера человек упирался в «страница не
  // найдена» там, где приложение прекрасно знает, какой продукт он ведёт.
  const productId = searchParams.productId ?? (await getActiveProductId(userId))
  if (!productId) notFound()

  const [product, people, features, jtbds] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.feature.findMany({ where: { productId, userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { productId, userId }, orderBy: { title: 'asc' } }),
  ])

  if (!product) notFound()

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый пункт роадмапа</h1>
      <RoadmapItemForm
        action={createRoadmapItem}
        productId={product.id}
        productName={product.name}
        people={people}
        features={features}
        jtbds={jtbds}
        error={searchParams.error}
        submitLabel="Добавить"
        cancelHref={`/pm/roadmap?productId=${product.id}`}
      />
    </main>
  )
}
