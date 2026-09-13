import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createFeature } from '@/lib/actions/features'
import { FeatureForm } from '@/components/forms/feature-form'

export const metadata = { title: 'Новая фича' }

export const dynamic = 'force-dynamic'

export default async function NewFeaturePage({
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
  const [products, jtbds, rtbs, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { userId } }),
    prisma.rTB.findMany({ where: { userId } }),
    searchParams.duplicateFrom
      ? prisma.feature.findFirst({
          where: { id: searchParams.duplicateFrom, userId },
          include: { jtbds: true, rtbs: true },
        })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новая фича</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — фича должна быть привязана к продукту.
        </p>
      ) : (
        <FeatureForm
          redirectTo={searchParams.from}
          action={createFeature}
          products={products}
          jtbds={jtbds}
          rtbs={rtbs}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  // Text handed over from quick capture wins: it is what the
                  // person just typed, and losing it is the whole failure the
                  // hand-off exists to avoid.
                  name: searchParams.name ?? duplicateSource.name,
                  jtbdIds: duplicateSource.jtbds.map((j) => j.id),
                  rtbIds: duplicateSource.rtbs.map((r) => r.id),
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
