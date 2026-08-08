import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateRoadmapItem } from '@/lib/actions/roadmap'
import { RoadmapItemForm } from '@/components/forms/roadmap-item-form'

export const dynamic = 'force-dynamic'

export default async function EditRoadmapItemPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const item = await prisma.roadmapItem.findFirst({ where: { id: params.id, userId } })
  if (!item) notFound()

  const [product, people, features, jtbds] = await Promise.all([
    prisma.product.findFirst({ where: { id: item.productId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.feature.findMany({ where: { productId: item.productId, userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { productId: item.productId, userId }, orderBy: { title: 'asc' } }),
  ])

  if (!product) notFound()

  const updateRoadmapItemWithId = updateRoadmapItem.bind(null, item.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать пункт роадмапа</h1>
      <RoadmapItemForm
        action={updateRoadmapItemWithId}
        productId={product.id}
        productName={product.name}
        people={people}
        features={features}
        jtbds={jtbds}
        defaultValues={item}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
