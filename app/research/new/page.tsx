import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createResearch } from '@/lib/actions/research'
import { ResearchForm } from '@/components/forms/research-form'

export const metadata = { title: 'Новое исследование' }

export const dynamic = 'force-dynamic'

export default async function NewResearchPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string; productId?: string; duplicateFrom?: string }
}) {
  const userId = getCurrentUserId()
  // Продукт по умолчанию — активный, тот же, что назван в шапке (фаза 20):
  // раньше форма читала только cookie, а шапка ещё и подставляла первый
  // продукт, и в свежем браузере они расходились.
  const activeProductId = await getActiveProductId(userId)
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
          redirectTo={searchParams.from}
          action={createResearch}
          products={products}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                }
              : { productId: searchParams.productId ?? activeProductId ?? undefined }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
