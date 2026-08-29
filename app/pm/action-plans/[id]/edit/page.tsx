import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateActionPlan } from '@/lib/actions/action-plans'
import { ActionPlanForm } from '@/components/forms/action-plan-form'

export const dynamic = 'force-dynamic'

export default async function EditActionPlanPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const plan = await prisma.actionPlan.findFirst({ where: { id: params.id, userId } })
  if (!plan) notFound()

  const [product, people, processSteps] = await Promise.all([
    prisma.product.findFirst({ where: { id: plan.productId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.processStep.findMany({
      where: { process: { productId: plan.productId } },
      orderBy: { title: 'asc' },
    }),
  ])

  if (!product) notFound()

  const updateActionPlanWithId = updateActionPlan.bind(null, plan.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать экшн-план</h1>
      <ActionPlanForm
        action={updateActionPlanWithId}
        productId={product.id}
        productName={product.name}
        people={people}
        processSteps={processSteps}
        defaultValues={plan}
        error={searchParams.error}
        submitLabel="Сохранить"
        cancelHref={`/pm/action-plans?productId=${product.id}`}
      />
    </main>
  )
}
