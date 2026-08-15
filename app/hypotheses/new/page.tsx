import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createHypothesis } from '@/lib/actions/hypotheses'
import { HypothesisForm } from '@/components/forms/hypothesis-form'

export const dynamic = 'force-dynamic'

export default async function NewHypothesisPage({
  searchParams,
}: {
  searchParams: {
    from?: string
    error?: string
    productId?: string
    jtbdId?: string
    duplicateFrom?: string
    statement?: string
  }
}) {
  const userId = getCurrentUserId()
  const [products, jtbds, segments, researches, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { userId } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
    searchParams.duplicateFrom
      ? prisma.hypothesis.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новая гипотеза</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — гипотеза должна быть привязана к продукту.
        </p>
      ) : (
        <HypothesisForm
          redirectTo={searchParams.from}
          action={createHypothesis}
          products={products}
          jtbds={jtbds}
          segments={segments}
          researches={researches}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  // Text handed over from quick capture wins: it is what the
                  // person just typed, and losing it is the whole failure the
                  // hand-off exists to avoid.
                  statement: searchParams.statement ?? duplicateSource.statement,
                }
              : { productId: searchParams.productId, jtbdId: searchParams.jtbdId }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
