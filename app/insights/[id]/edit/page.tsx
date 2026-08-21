import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateInsight } from '@/lib/actions/insights'
import { InsightForm } from '@/components/forms/insight-form'

export const dynamic = 'force-dynamic'

export default async function EditInsightPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [insight, products, segments, jtbds, researches, conversations, hypotheses] =
    await Promise.all([
      prisma.insight.findFirst({ where: { id: params.id, userId } }),
      prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      prisma.segment.findMany({ where: { userId } }),
      prisma.jTBD.findMany({ where: { userId } }),
      prisma.research.findMany({ where: { userId } }),
      prisma.conversation.findMany({ where: { userId } }),
      prisma.hypothesis.findMany({ where: { userId } }),
    ])

  if (!insight) notFound()

  const updateInsightWithId = updateInsight.bind(null, insight.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать инсайт</h1>
      <InsightForm
        action={updateInsightWithId}
        products={products}
        segments={segments}
        jtbds={jtbds}
        researches={researches}
        conversations={conversations}
        hypotheses={hypotheses}
        defaultValues={insight}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
