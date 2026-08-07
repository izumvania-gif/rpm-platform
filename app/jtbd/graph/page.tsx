import type { Product } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { JtbdGraphFilterForm } from '@/components/forms/jtbd-graph-filter-form'
import { JtbdGraphCanvas } from '@/components/jtbd-graph/canvas'
import { JtbdViewTabs } from '@/components/shared/jtbd-view-tabs'
import { SectionHeading } from '@/components/shared/section-heading'
import { moduleByHref } from '@/lib/module-meta'

export const dynamic = 'force-dynamic'

export default async function JtbdGraphPage({
  searchParams,
}: {
  searchParams: { productId?: string; category?: string }
}) {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })
  const productId = products.find((p) => p.id === searchParams.productId)?.id ?? products[0]?.id

  return (
    <main className="container py-12 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading title="Граф JTBD" description={moduleByHref['/jtbd'].description} />
        <JtbdViewTabs active="graph" />
      </div>

      {!productId ? (
        <p className="text-muted-foreground">Сначала создайте продукт и хотя бы один JTBD.</p>
      ) : (
        <JtbdGraphSection
          productId={productId}
          category={searchParams.category}
          products={products}
        />
      )}
    </main>
  )
}

async function JtbdGraphSection({
  productId,
  category,
  products,
}: {
  productId: string
  category?: string
  products: Product[]
}) {
  const userId = getCurrentUserId()
  const jtbds = await prisma.jTBD.findMany({
    where: { productId, userId },
    orderBy: { createdAt: 'asc' },
  })
  const sequenceEdges = await prisma.jtbdSequenceEdge.findMany({
    where: { fromJtbd: { productId, userId } },
  })
  const categories = Array.from(new Set(jtbds.map((j) => j.category))).sort()
  const activeCategory = categories.includes(category ?? '') ? category : undefined

  return (
    <div className="space-y-4">
      <JtbdGraphFilterForm
        products={products}
        productId={productId}
        categories={categories}
        category={activeCategory}
      />
      <JtbdGraphCanvas
        productId={productId}
        jtbds={jtbds}
        sequenceEdges={sequenceEdges}
        categories={categories}
        category={activeCategory}
      />
    </div>
  )
}
