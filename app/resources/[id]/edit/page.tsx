import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateProductResource } from '@/lib/actions/product-resources'
import { ProductResourceForm } from '@/components/forms/product-resource-form'

export default async function EditProductResourcePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [resource, products] = await Promise.all([
    prisma.productResource.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!resource) notFound()

  const updateProductResourceWithId = updateProductResource.bind(null, resource.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать ресурс</h1>
      <ProductResourceForm
        action={updateProductResourceWithId}
        products={products}
        defaultValues={resource}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
