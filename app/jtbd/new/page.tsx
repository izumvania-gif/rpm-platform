import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createJtbd } from '@/lib/actions/jtbd'
import { JtbdForm } from '@/components/forms/jtbd-form'

export const dynamic = 'force-dynamic'

export default async function NewJtbdPage({
  searchParams,
}: {
  searchParams: {
    from?: string
    error?: string
    productId?: string
    duplicateFrom?: string
    // Set by the gaps queue (C3), which knows the segment whose missing JTBD
    // is the gap — arriving with it pre-ticked is the whole point of the link.
    segmentId?: string
    title?: string
    category?: string
  }
}) {
  const userId = getCurrentUserId()
  const [products, segments, researches, categoryRows, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
    prisma.jTBD.findMany({
      where: { userId },
      select: { category: true },
      distinct: ['category'],
    }),
    searchParams.duplicateFrom
      ? prisma.jTBD.findFirst({
          where: { id: searchParams.duplicateFrom, userId },
          include: { segments: { select: { id: true } } },
        })
      : null,
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
          redirectTo={searchParams.from}
          action={createJtbd}
          products={products}
          segments={segments}
          researches={researches}
          categories={categories}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  // What quick capture handed over wins over the duplicated
                  // record: it is what the person just typed.
                  title: searchParams.title ?? duplicateSource.title,
                  category: searchParams.category ?? duplicateSource.category,
                  segmentIds: duplicateSource.segments.map((s) => s.id),
                }
              : {
                  productId: searchParams.productId,
                  title: searchParams.title,
                  category: searchParams.category,
                  segmentIds: searchParams.segmentId ? [searchParams.segmentId] : undefined,
                }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
