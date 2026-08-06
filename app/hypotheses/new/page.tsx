import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createHypothesis } from '@/lib/actions/hypotheses'
import { HypothesisForm } from '@/components/forms/hypothesis-form'

export const dynamic = 'force-dynamic'

export default async function NewHypothesisPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string; jtbdId?: string }
}) {
  const userId = getCurrentUserId()
  const [products, jtbds, segments, researches] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { userId } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
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
          action={createHypothesis}
          products={products}
          jtbds={jtbds}
          segments={segments}
          researches={researches}
          defaultValues={{ productId: searchParams.productId, jtbdId: searchParams.jtbdId }}
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
