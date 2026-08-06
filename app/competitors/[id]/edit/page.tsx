import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateCompetitor } from '@/lib/actions/competitors'
import { CompetitorForm } from '@/components/forms/competitor-form'

export default async function EditCompetitorPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [competitor, products] = await Promise.all([
    prisma.competitor.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!competitor) notFound()

  const updateCompetitorWithId = updateCompetitor.bind(null, competitor.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать конкурента</h1>
      <CompetitorForm
        action={updateCompetitorWithId}
        products={products}
        defaultValues={competitor}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
