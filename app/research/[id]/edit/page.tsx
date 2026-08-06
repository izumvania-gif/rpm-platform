import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateResearch } from '@/lib/actions/research'
import { ResearchForm } from '@/components/forms/research-form'

export default async function EditResearchPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [research, products] = await Promise.all([
    prisma.research.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!research) notFound()

  const updateResearchWithId = updateResearch.bind(null, research.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать исследование</h1>
      <ResearchForm
        action={updateResearchWithId}
        products={products}
        defaultValues={research}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
