import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateProcess } from '@/lib/actions/processes'
import { ProcessForm } from '@/components/forms/process-form'

export const dynamic = 'force-dynamic'

export default async function EditProcessPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const process = await prisma.process.findFirst({
    where: { id: params.id, product: { userId } },
    include: { product: true },
  })
  if (!process) notFound()

  const updateProcessWithId = updateProcess.bind(null, process.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать процесс</h1>
      <ProcessForm
        action={updateProcessWithId}
        productId={process.productId}
        productName={process.product.name}
        defaultValues={process}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
