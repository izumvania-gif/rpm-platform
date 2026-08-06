import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateHypothesis } from '@/lib/actions/hypotheses'
import { HypothesisForm } from '@/components/forms/hypothesis-form'

export const dynamic = 'force-dynamic'

export default async function EditHypothesisPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [hypothesis, products, jtbds, segments, researches] = await Promise.all([
    prisma.hypothesis.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { userId } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
  ])

  if (!hypothesis) notFound()

  const updateHypothesisWithId = updateHypothesis.bind(null, hypothesis.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать гипотезу</h1>
      <HypothesisForm
        action={updateHypothesisWithId}
        products={products}
        jtbds={jtbds}
        segments={segments}
        researches={researches}
        defaultValues={hypothesis}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
