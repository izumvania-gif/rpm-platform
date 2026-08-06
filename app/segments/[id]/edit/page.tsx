import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateSegment } from '@/lib/actions/segments'
import { SegmentForm } from '@/components/forms/segment-form'

export default async function EditSegmentPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [segment, products] = await Promise.all([
    prisma.segment.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!segment) notFound()

  const updateSegmentWithId = updateSegment.bind(null, segment.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать сегмент</h1>
      <SegmentForm
        action={updateSegmentWithId}
        products={products}
        defaultValues={segment}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
