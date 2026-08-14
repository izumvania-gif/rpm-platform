import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createInsight } from '@/lib/actions/insights'
import { InsightForm } from '@/components/forms/insight-form'

export const dynamic = 'force-dynamic'

export default async function NewInsightPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string; duplicateFrom?: string; text?: string }
}) {
  const userId = getCurrentUserId()
  const [products, segments, jtbds, researches, conversations, duplicateSource] = await Promise.all(
    [
      prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      prisma.segment.findMany({ where: { userId } }),
      prisma.jTBD.findMany({ where: { userId } }),
      prisma.research.findMany({ where: { userId } }),
      prisma.conversation.findMany({ where: { userId } }),
      searchParams.duplicateFrom
        ? prisma.insight.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
        : null,
    ]
  )

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый инсайт</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — инсайт должен быть привязан к продукту.
        </p>
      ) : (
        <InsightForm
          action={createInsight}
          products={products}
          segments={segments}
          jtbds={jtbds}
          researches={researches}
          conversations={conversations}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  // Text handed over from quick capture wins: it is what the
                  // person just typed, and losing it is the whole failure the
                  // hand-off exists to avoid.
                  text: searchParams.text ?? duplicateSource.text,
                }
              : { productId: searchParams.productId, text: searchParams.text }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
