import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createResearch } from '@/lib/actions/research'
import { ResearchForm } from '@/components/forms/research-form'

export const dynamic = 'force-dynamic'

export default async function NewResearchPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string; duplicateFrom?: string }
}) {
  const userId = getCurrentUserId()
  const [products, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    searchParams.duplicateFrom
      ? prisma.research.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новое исследование</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — исследование должно быть привязано к продукту.
        </p>
      ) : (
        <ResearchForm
          action={createResearch}
          products={products}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
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
