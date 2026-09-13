import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createSegment } from '@/lib/actions/segments'
import { SegmentForm } from '@/components/forms/segment-form'

export const metadata = { title: 'Новый сегмент' }

export const dynamic = 'force-dynamic'

export default async function NewSegmentPage({
  searchParams,
}: {
  searchParams: {
    from?: string
    error?: string
    productId?: string
    duplicateFrom?: string
    name?: string
  }
}) {
  const userId = getCurrentUserId()
  // Продукт по умолчанию — активный, тот же, что назван в шапке (фаза 20):
  // раньше форма читала только cookie, а шапка ещё и подставляла первый
  // продукт, и в свежем браузере они расходились.
  const activeProductId = await getActiveProductId(userId)
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
          redirectTo={searchParams.from}
          action={createSegment}
          products={products}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  slug: `${duplicateSource.slug}-copy`,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  // Text handed over from quick capture wins: it is what the
                  // person just typed, and losing it is the whole failure the
                  // hand-off exists to avoid.
                  name: searchParams.name ?? duplicateSource.name,
                }
              : {
                  productId: searchParams.productId ?? activeProductId ?? undefined,
                  name: searchParams.name,
                }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
