import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createCompetitor } from '@/lib/actions/competitors'
import { CompetitorForm } from '@/components/forms/competitor-form'

export const metadata = { title: 'Новый конкурент' }

export const dynamic = 'force-dynamic'

export default async function NewCompetitorPage({
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
      ? prisma.competitor.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый конкурент</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — конкурент должен быть привязан к продукту.
        </p>
      ) : (
        <CompetitorForm
          redirectTo={searchParams.from}
          action={createCompetitor}
          products={products}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
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
