import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createProcess } from '@/lib/actions/processes'
import { ProcessForm } from '@/components/forms/process-form'

export const metadata = { title: 'Новый процесс' }

export const dynamic = 'force-dynamic'

export default async function NewProcessPage({
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
        cancelHref={`/pm/processes?productId=${product.id}`}
      />
    </main>
  )
}
