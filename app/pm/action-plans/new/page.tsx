import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createActionPlan } from '@/lib/actions/action-plans'
import { ActionPlanForm } from '@/components/forms/action-plan-form'

export const dynamic = 'force-dynamic'

export default async function NewActionPlanPage({
  searchParams,
}: {
  searchParams: { productId?: string; error?: string }
}) {
  const userId = getCurrentUserId()
  const productId = searchParams.productId
  if (!productId) notFound()

  const [product, people, processSteps] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.processStep.findMany({ where: { productId }, orderBy: { title: 'asc' } }),
  ])

  if (!product) notFound()

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый экшн-план</h1>
      <ActionPlanForm
        action={createActionPlan}
        productId={product.id}
        productName={product.name}
        people={people}
        processSteps={processSteps}
        error={searchParams.error}
        submitLabel="Добавить"
      />
    </main>
  )
}
