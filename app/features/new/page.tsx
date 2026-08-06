import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createFeature } from '@/lib/actions/features'
import { FeatureForm } from '@/components/forms/feature-form'

export const dynamic = 'force-dynamic'

export default async function NewFeaturePage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string }
}) {
  const userId = getCurrentUserId()
  const [products, jtbds, rtbs] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { userId } }),
    prisma.rTB.findMany({ where: { userId } }),
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новая фича</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — фича должна быть привязана к продукту.
        </p>
      ) : (
        <FeatureForm
          action={createFeature}
          products={products}
          jtbds={jtbds}
          rtbs={rtbs}
          defaultValues={{ productId: searchParams.productId }}
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
