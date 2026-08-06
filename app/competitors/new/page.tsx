import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createCompetitor } from '@/lib/actions/competitors'
import { CompetitorForm } from '@/components/forms/competitor-form'

export const dynamic = 'force-dynamic'

export default async function NewCompetitorPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string; duplicateFrom?: string }
}) {
  const userId = getCurrentUserId()
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
          action={createCompetitor}
          products={products}
          defaultValues={
            duplicateSource
              ? { ...duplicateSource, productId: searchParams.productId ?? duplicateSource.productId }
              : { productId: searchParams.productId }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
