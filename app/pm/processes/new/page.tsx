import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createProcess } from '@/lib/actions/processes'
import { ProcessForm } from '@/components/forms/process-form'

export const dynamic = 'force-dynamic'

export default async function NewProcessPage({
  searchParams,
}: {
  searchParams: { productId?: string; error?: string }
}) {
  const userId = getCurrentUserId()
  const productId = searchParams.productId
  if (!productId) notFound()

  const product = await prisma.product.findFirst({ where: { id: productId, userId } })
  if (!product) notFound()

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый процесс</h1>
      <ProcessForm
        action={createProcess}
        productId={product.id}
        productName={product.name}
        error={searchParams.error}
        submitLabel="Создать"
        cancelHref={`/pm?productId=${product.id}&scrollTo=process`}
      />
    </main>
  )
}
