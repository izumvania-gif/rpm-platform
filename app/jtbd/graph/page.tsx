import type { Product } from '@prisma/client'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { JtbdGraphFilterForm } from '@/components/forms/jtbd-graph-filter-form'
import { JtbdGraphCanvas } from '@/components/jtbd-graph/canvas'
import { JtbdViewTabs } from '@/components/shared/jtbd-view-tabs'
import { SectionHeading } from '@/components/shared/section-heading'
import { buttonVariants } from '@/components/ui/button'
import { moduleByHref } from '@/lib/module-meta'
import { layoutTree, OVERALL_VIEW_KEY, type LayoutPosition } from '@/lib/jtbd-graph-layout'

export const dynamic = 'force-dynamic'

export default async function JtbdGraphPage({
  searchParams,
}: {
  searchParams: { productId?: string; category?: string; segment?: string }
}) {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })
  const productId = products.find((p) => p.id === searchParams.productId)?.id ?? products[0]?.id

  return (
    <main className="container py-12 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          level={1}
          title="Граф JTBD"
          description={moduleByHref['/jtbd'].description}
        />
        <div className="flex flex-wrap items-center gap-2">
          <JtbdViewTabs active="graph" />
          {/* Обратная ссылка на холст продукта (фаза 12). С холста на этот граф
              ссылка была с самого начала, а обратно — нет, и два графа читались
              как несвязанные. Они отвечают на разные вопросы («как задачи
              связаны между собой» и «сходится ли цепочка»), и переход между
              ними — часть ответа. */}
          {productId && (
            <Link
              href={`/products/${productId}/canvas`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Холст продукта
            </Link>
          )}
        </div>
      </div>

      {!productId ? (
        <p className="text-muted-foreground">Сначала создайте продукт и хотя бы один JTBD.</p>
      ) : (
        <JtbdGraphSection
          productId={productId}
          category={searchParams.category}
          segment={searchParams.segment}
          products={products}
        />
      )}
    </main>
  )
}

async function JtbdGraphSection({
  productId,
  category,
  segment,
  products,
}: {
  productId: string
  category?: string
  segment?: string
  products: Product[]
}) {
  const userId = getCurrentUserId()
  const segments = await prisma.segment.findMany({
    where: { productId, userId },
    orderBy: { name: 'asc' },
  })
  const activeSegment =
    segment && segment !== OVERALL_VIEW_KEY ? segments.find((s) => s.id === segment) : undefined
  const viewKey = activeSegment ? activeSegment.id : OVERALL_VIEW_KEY

  const jtbds = await prisma.jTBD.findMany({
    where: {
      productId,
      userId,
      ...(activeSegment ? { segments: { some: { id: activeSegment.id } } } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
  const sequenceEdges = await prisma.jtbdSequenceEdge.findMany({
    where: { fromJtbd: { productId, userId } },
  })
  const categories = Array.from(new Set(jtbds.map((j) => j.category))).sort()
  const activeCategory = categories.includes(category ?? '') ? category : undefined

  const existingLayouts = await prisma.jtbdGraphLayout.findMany({
    where: { viewKey, jtbdId: { in: jtbds.map((j) => j.id) } },
  })
  const savedPositions: Record<string, LayoutPosition> = {}
  for (const layout of existingLayouts) {
    savedPositions[layout.jtbdId] = { x: layout.x, y: layout.y }
  }
  const missing = jtbds.filter((j) => !savedPositions[j.id])
  if (missing.length > 0) {
    const computed = layoutTree(jtbds)
    const upserts = missing.map((j) => {
      const pos = computed.get(j.id) ?? { x: 0, y: 0 }
      savedPositions[j.id] = pos
      return prisma.jtbdGraphLayout.upsert({
        where: { jtbdId_viewKey: { jtbdId: j.id, viewKey } },
        create: { jtbdId: j.id, viewKey, x: pos.x, y: pos.y },
        update: {},
      })
    })
    await prisma.$transaction(upserts)
  }

  return (
    <div className="space-y-4">
      <JtbdGraphFilterForm
        products={products}
        productId={productId}
        categories={categories}
        category={activeCategory}
        segments={segments}
        segment={activeSegment?.id}
      />
      <JtbdGraphCanvas
        productId={productId}
        jtbds={jtbds}
        sequenceEdges={sequenceEdges}
        categories={categories}
        category={activeCategory}
        viewKey={viewKey}
        savedPositions={savedPositions}
      />
    </div>
  )
}
