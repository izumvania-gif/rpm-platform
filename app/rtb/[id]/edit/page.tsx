import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateRTB } from '@/lib/actions/rtbs'
import { RTBForm } from '@/components/forms/rtb-form'

export default async function EditRTBPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [rtb, products, features] = await Promise.all([
    prisma.rTB.findFirst({ where: { id: params.id, userId }, include: { features: true } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.feature.findMany({ where: { userId } }),
  ])

  if (!rtb) notFound()

  const updateRTBWithId = updateRTB.bind(null, rtb.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать RTB</h1>
      <RTBForm
        action={updateRTBWithId}
        products={products}
        features={features}
        defaultValues={{ ...rtb, featureIds: rtb.features.map((f) => f.id) }}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
