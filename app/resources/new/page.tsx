import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createProductResource } from '@/lib/actions/product-resources'
import { ProductResourceForm } from '@/components/forms/product-resource-form'

export const metadata = { title: 'Новый ресурс' }

export const dynamic = 'force-dynamic'

export default async function NewProductResourcePage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string }
}) {
  const userId = getCurrentUserId()
  const [products, activeProductId] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    getActiveProductId(userId),
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый ресурс</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — ресурс должен быть привязан к продукту.
        </p>
      ) : (
        <ProductResourceForm
          action={createProductResource}
          products={products}
          defaultValues={{ productId: searchParams.productId ?? activeProductId ?? undefined }}
          error={searchParams.error}
          submitLabel="Добавить"
        />
      )}
    </main>
  )
}
