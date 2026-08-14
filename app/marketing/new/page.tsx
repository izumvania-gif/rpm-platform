import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createRTB } from '@/lib/actions/rtbs'
import { RTBForm } from '@/components/forms/rtb-form'

export const dynamic = 'force-dynamic'

export default async function NewRTBPage({
  searchParams,
}: {
  searchParams: {
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
      <h1 className="text-2xl font-bold mb-8">Новый RTB</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — RTB должен быть привязан к продукту.
        </p>
      ) : (
        <RTBForm
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
                  productId: searchParams.productId,
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
