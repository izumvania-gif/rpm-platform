import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createSegment } from '@/lib/actions/segments'
import { SegmentForm } from '@/components/forms/segment-form'

export const dynamic = 'force-dynamic'

export default async function NewSegmentPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string; duplicateFrom?: string }
}) {
  const userId = getCurrentUserId()
  const [products, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    searchParams.duplicateFrom
      ? prisma.segment.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый сегмент</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — сегмент должен быть привязан к продукту.
        </p>
      ) : (
        <SegmentForm
          action={createSegment}
          products={products}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  slug: `${duplicateSource.slug}-copy`,
                  productId: searchParams.productId ?? duplicateSource.productId,
                }
              : { productId: searchParams.productId }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
