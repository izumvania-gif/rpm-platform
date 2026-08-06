import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateJtbd } from '@/lib/actions/jtbd'
import { JtbdForm } from '@/components/forms/jtbd-form'

export const dynamic = 'force-dynamic'

export default async function EditJtbdPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [jtbd, products, segments, researches, categoryRows] = await Promise.all([
    prisma.jTBD.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
    prisma.jTBD.findMany({ where: { userId }, select: { category: true }, distinct: ['category'] }),
  ])

  if (!jtbd) notFound()

  const updateJtbdWithId = updateJtbd.bind(null, jtbd.id)
  const categories = categoryRows.map((c) => c.category)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать JTBD</h1>
      <JtbdForm
        action={updateJtbdWithId}
        products={products}
        segments={segments}
        researches={researches}
        categories={categories}
        defaultValues={jtbd}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
