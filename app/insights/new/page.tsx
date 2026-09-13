import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createInsight } from '@/lib/actions/insights'
import { InsightForm } from '@/components/forms/insight-form'

export const metadata = { title: 'Новый инсайт' }

export const dynamic = 'force-dynamic'

export default async function NewInsightPage({
  searchParams,
}: {
  searchParams: {
    from?: string
    error?: string
    productId?: string
    duplicateFrom?: string
    text?: string
    // Приходит с карточки гипотезы (блок «Что можно сделать»): кнопка обязана
    // приводить в форму, где связь уже проставлена, иначе она отправляет
    // искать нужный пункт в списке руками.
    hypothesisId?: string
    // С карточек задачи и сегмента (секции «Инсайты», фаза 21) — та же логика.
    jtbdId?: string
    segmentId?: string
  }
}) {
  const userId = getCurrentUserId()
  // Продукт по умолчанию — активный, тот же, что назван в шапке (фаза 20):
  // раньше форма читала только cookie, а шапка ещё и подставляла первый
  // продукт, и в свежем браузере они расходились.
  const activeProductId = await getActiveProductId(userId)
  const [products, segments, jtbds, researches, conversations, hypotheses, duplicateSource] =
    await Promise.all([
      prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      prisma.segment.findMany({ where: { userId } }),
      prisma.jTBD.findMany({ where: { userId } }),
      prisma.research.findMany({ where: { userId } }),
      prisma.conversation.findMany({ where: { userId } }),
      prisma.hypothesis.findMany({ where: { userId } }),
      searchParams.duplicateFrom
        ? prisma.insight.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
        : null,
    ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый инсайт</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — инсайт должен быть привязан к продукту.
        </p>
      ) : (
        <InsightForm
          redirectTo={searchParams.from}
          action={createInsight}
          products={products}
          segments={segments}
          jtbds={jtbds}
          researches={researches}
          conversations={conversations}
          hypotheses={hypotheses}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                  hypothesisId: searchParams.hypothesisId ?? duplicateSource.hypothesisId,
                  jtbdId: searchParams.jtbdId ?? duplicateSource.jtbdId,
                  segmentId: searchParams.segmentId ?? duplicateSource.segmentId,
                  // Text handed over from quick capture wins: it is what the
                  // person just typed, and losing it is the whole failure the
                  // hand-off exists to avoid.
                  text: searchParams.text ?? duplicateSource.text,
                }
              : {
                  productId: searchParams.productId ?? activeProductId ?? undefined,
                  text: searchParams.text,
                  hypothesisId: searchParams.hypothesisId,
                  jtbdId: searchParams.jtbdId,
                  segmentId: searchParams.segmentId,
                }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
