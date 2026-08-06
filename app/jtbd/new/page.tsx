import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createJtbd } from '@/lib/actions/jtbd'
import { JtbdForm } from '@/components/forms/jtbd-form'

export const dynamic = 'force-dynamic'

export default async function NewJtbdPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string }
}) {
  const userId = getCurrentUserId()
  const [products, segments, researches, categoryRows] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
    prisma.jTBD.findMany({
      where: { userId },
      select: { category: true },
      distinct: ['category'],
    }),
  ])
  const categories = categoryRows.map((c) => c.category)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый JTBD</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — JTBD должен быть привязан к продукту.
        </p>
      ) : (
        <JtbdForm
          action={createJtbd}
          products={products}
          segments={segments}
          researches={researches}
          categories={categories}
          defaultValues={{ productId: searchParams.productId }}
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
