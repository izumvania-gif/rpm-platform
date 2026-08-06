import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createResearch } from '@/lib/actions/research'
import { ResearchForm } from '@/components/forms/research-form'

export const dynamic = 'force-dynamic'

export default async function NewResearchPage({
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
      <h1 className="text-2xl font-bold mb-8">Новое исследование</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — исследование должно быть привязано к продукту.
        </p>
      ) : (
        <ResearchForm
          action={createResearch}
          products={products}
          defaultValues={{ productId: searchParams.productId }}
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
