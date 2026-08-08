import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateProduct } from '@/lib/actions/products'
import { ProductForm } from '@/components/forms/product-form'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [product, people] = await Promise.all([
    prisma.product.findFirst({ where: { id: params.id, userId } }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!product) notFound()

  const updateProductWithId = updateProduct.bind(null, product.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать продукт</h1>
      <ProductForm
        action={updateProductWithId}
        defaultValues={product}
        error={searchParams.error}
        submitLabel="Сохранить"
        people={people}
      />
    </main>
  )
}
