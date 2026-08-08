import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createProduct } from '@/lib/actions/products'
import { ProductForm } from '@/components/forms/product-form'

export const dynamic = 'force-dynamic'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const people = await prisma.person.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый продукт</h1>
      <ProductForm
        action={createProduct}
        error={searchParams.error}
        submitLabel="Создать"
        showOnboardingOption
        people={people}
      />
    </main>
  )
}
