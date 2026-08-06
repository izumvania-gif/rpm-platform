import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createCompetitor } from '@/lib/actions/competitors'
import { CompetitorForm } from '@/components/forms/competitor-form'

export const dynamic = 'force-dynamic'

export default async function NewCompetitorPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string }
}) {
  const products = await prisma.product.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { name: 'asc' },
  })

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
          defaultValues={{ productId: searchParams.productId }}
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
