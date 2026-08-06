import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createProductResource } from '@/lib/actions/product-resources'
import { ProductResourceForm } from '@/components/forms/product-resource-form'

export const dynamic = 'force-dynamic'

export default async function NewProductResourcePage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string }
}) {
  const products = await prisma.product.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { name: 'asc' },
  })

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
          defaultValues={{ productId: searchParams.productId }}
          error={searchParams.error}
          submitLabel="Добавить"
        />
      )}
    </main>
  )
}
