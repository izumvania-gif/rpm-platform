import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createActionPlan } from '@/lib/actions/action-plans'
import { ActionPlanForm } from '@/components/forms/action-plan-form'

export const dynamic = 'force-dynamic'

export default async function NewActionPlanPage({
  searchParams,
}: {
  searchParams: { productId?: string; error?: string }
}) {
  const userId = getCurrentUserId()
  // Продукт из ссылки, иначе активный из шапки (фаза 13). Прежде без
  // `?productId=` страница отдавала жёсткий 404 — по закладке, по ссылке из
  // чата или просто по истории браузера человек упирался в «страница не
  // найдена» там, где приложение прекрасно знает, какой продукт он ведёт.
  const productId = searchParams.productId ?? (await getActiveProductId(userId))
  if (!productId) notFound()

  const [product, people, processSteps] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.processStep.findMany({ where: { process: { productId } }, orderBy: { title: 'asc' } }),
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
        cancelHref={`/pm/action-plans?productId=${product.id}`}
      />
    </main>
  )
}
