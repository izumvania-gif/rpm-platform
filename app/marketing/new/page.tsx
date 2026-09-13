import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createRTB } from '@/lib/actions/rtbs'
import { RTBForm } from '@/components/forms/rtb-form'

export const metadata = { title: 'Новое обещание' }

export const dynamic = 'force-dynamic'

export default async function NewRTBPage({
  searchParams,
}: {
  searchParams: {
    from?: string
    error?: string
    productId?: string
    duplicateFrom?: string
    // Set by the "this feature has no marketing claim" callout (C4) so the
    // form opens with that feature already ticked.
    featureId?: string
    statement?: string
  }
}) {
  const userId = getCurrentUserId()
  // Продукт по умолчанию — активный, тот же, что назван в шапке (фаза 20):
  // раньше форма читала только cookie, а шапка ещё и подставляла первый
  // продукт, и в свежем браузере они расходились.
  const activeProductId = await getActiveProductId(userId)
  const [products, features, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.feature.findMany({ where: { userId } }),
    searchParams.duplicateFrom
      ? prisma.rTB.findFirst({
          where: { id: searchParams.duplicateFrom, userId },
          include: { features: true },
        })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новое обещание</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — обещание должно быть привязано к продукту.
        </p>
      ) : (
        <RTBForm
          redirectTo={searchParams.from}
          action={createRTB}
          products={products}
          features={features}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  statement: searchParams.statement ?? duplicateSource.statement,
                  featureIds: duplicateSource.features.map((f) => f.id),
                }
              : {
                  productId: searchParams.productId ?? activeProductId ?? undefined,
                  statement: searchParams.statement,
                  featureIds: searchParams.featureId ? [searchParams.featureId] : undefined,
                }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
