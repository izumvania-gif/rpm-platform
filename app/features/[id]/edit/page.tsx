import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateFeature } from '@/lib/actions/features'
import { FeatureForm } from '@/components/forms/feature-form'

export default async function EditFeaturePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [feature, products, jtbds, rtbs] = await Promise.all([
    prisma.feature.findFirst({
      where: { id: params.id, userId },
      include: { jtbds: true, rtbs: true },
    }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { userId } }),
    prisma.rTB.findMany({ where: { userId } }),
  ])

  if (!feature) notFound()

  const updateFeatureWithId = updateFeature.bind(null, feature.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать фичу</h1>
      <FeatureForm
        action={updateFeatureWithId}
        products={products}
        jtbds={jtbds}
        rtbs={rtbs}
        defaultValues={{
          ...feature,
          jtbdIds: feature.jtbds.map((j) => j.id),
          rtbIds: feature.rtbs.map((r) => r.id),
        }}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
