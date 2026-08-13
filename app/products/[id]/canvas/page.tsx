import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { SectionHeading } from '@/components/shared/section-heading'
import { buttonVariants } from '@/components/ui/button'
import { ProductCanvas } from '@/components/product-canvas/canvas'
import { nodeKey, type CanvasKind, type CanvasPosition } from '@/lib/product-canvas'
import { hypothesisStatusLabels } from '@/lib/labels'

export const dynamic = 'force-dynamic'

// The product canvas (plans/2.0-product-leap-plan.md, C2) — the discovery
// chain as one manipulable surface instead of three list pages.
export default async function ProductCanvasPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [segments, jtbds, hypotheses, layout] = await Promise.all([
    prisma.segment.findMany({
      where: { productId: product.id },
      select: { id: true, name: true, jtbds: { select: { id: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.jTBD.findMany({
      where: { productId: product.id },
      select: { id: true, title: true, category: true, confirmed: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.hypothesis.findMany({
      where: { productId: product.id },
      select: { id: true, statement: true, status: true, jtbdId: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.productCanvasLayout.findMany({ where: { productId: product.id } }),
  ])

  const positions: Record<string, CanvasPosition> = Object.fromEntries(
    layout.map((row) => [nodeKey(row.nodeKind as CanvasKind, row.nodeId), { x: row.x, y: row.y }])
  )

  return (
    <main className="container py-12 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          level={1}
          title={`Холст: ${product.name}`}
          description="Цепочка дискавери целиком: сегмент → задача клиента → гипотеза. Связи тянутся мышью, узел создаётся двойным кликом."
        />
        <div className="flex gap-2">
          <Link
            href={`/jtbd/graph?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Граф JTBD
          </Link>
          <Link
            href={`/products/${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            К продукту
          </Link>
        </div>
      </div>

      {segments.length === 0 && jtbds.length === 0 && hypotheses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Холст пуст. Двойной клик по пустому месту создаёт первый узел — начните с сегмента.
        </p>
      ) : null}

      <ProductCanvas
        productId={product.id}
        data={{
          segments: segments.map((s) => ({
            id: s.id,
            name: s.name,
            jtbdIds: s.jtbds.map((j) => j.id),
          })),
          jtbds,
          hypotheses: hypotheses.map((h) => ({
            ...h,
            status: hypothesisStatusLabels[h.status],
          })),
          positions,
        }}
      />
    </main>
  )
}
