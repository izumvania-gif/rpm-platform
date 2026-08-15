import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { SectionHeading } from '@/components/shared/section-heading'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkMatrix } from '@/components/shared/link-matrix'
import { LINK_MATRICES, linkKey, type MatrixAxisItem } from '@/lib/link-matrix'
import { jtbdKeyPhrase } from '@/lib/key-phrase'

export const dynamic = 'force-dynamic'

// Связи — the three many-to-many relations of one product as three grids.
//
// Every other entry surface in the app creates records; this one creates the
// links between them, which is the half the discovery chain, the gaps report
// and /marketing-hub actually read. Doing it through the edit forms costs one
// page load per record; here it costs one click per link, with no navigation
// at all.
export default async function ProductLinksPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [segments, jtbds, features, rtbs] = await Promise.all([
    prisma.segment.findMany({
      where: { productId: product.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.jTBD.findMany({
      where: { productId: product.id },
      select: { id: true, title: true, segments: { select: { id: true } } },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.feature.findMany({
      where: { productId: product.id },
      select: {
        id: true,
        name: true,
        jtbds: { select: { id: true } },
        rtbs: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.rTB.findMany({
      where: { productId: product.id },
      select: { id: true, statement: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Key phrases here for the same reason as everywhere else a templated record
  // is scanned rather than read: «Когда …, я хочу X, чтобы …» truncated from
  // the left shows only the context, and two different jobs look identical.
  // The untouched text stays in fullLabel, which the title attribute renders.
  const jtbdAxis: MatrixAxisItem[] = jtbds.map((j) => ({
    id: j.id,
    label: jtbdKeyPhrase(j.title),
    fullLabel: j.title,
    href: `/jtbd/${j.id}`,
  }))
  const segmentAxis: MatrixAxisItem[] = segments.map((s) => ({ id: s.id, label: s.name }))
  const featureAxis: MatrixAxisItem[] = features.map((f) => ({
    id: f.id,
    label: f.name,
    href: `/features/${f.id}`,
  }))
  const rtbAxis: MatrixAxisItem[] = rtbs.map((r) => ({ id: r.id, label: r.statement }))

  const links = {
    'segment-jtbd': jtbds.flatMap((j) => j.segments.map((s) => linkKey(j.id, s.id))),
    'jtbd-feature': features.flatMap((f) => f.jtbds.map((j) => linkKey(f.id, j.id))),
    'feature-rtb': features.flatMap((f) => f.rtbs.map((r) => linkKey(f.id, r.id))),
  }
  const axes = {
    'segment-jtbd': { rows: jtbdAxis, cols: segmentAxis },
    'jtbd-feature': { rows: featureAxis, cols: jtbdAxis },
    'feature-rtb': { rows: featureAxis, cols: rtbAxis },
  }

  return (
    <main className="container py-12 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          level={1}
          title={`Связи: ${product.name}`}
          description="Записи уже есть — здесь они соединяются. Отметка ставится сразу, без перехода на форму."
        />
        <div className="flex gap-2">
          <Link
            href={`/products/${product.id}/canvas`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Холст продукта
          </Link>
          <Link
            href={`/products/${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            К продукту
          </Link>
        </div>
      </div>

      {LINK_MATRICES.map((meta) => {
        const { rows, cols } = axes[meta.kind]
        return (
          <Card key={meta.kind}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{meta.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{meta.hint}</p>
            </CardHeader>
            <CardContent>
              {rows.length === 0 || cols.length === 0 ? (
                <p className="text-sm text-muted-foreground">{meta.emptyMessage}</p>
              ) : (
                <LinkMatrix
                  kind={meta.kind}
                  rows={rows}
                  cols={cols}
                  initialLinks={links[meta.kind]}
                  rowHeader={meta.rowHeader}
                  colHeader={meta.colHeader}
                />
              )}
            </CardContent>
          </Card>
        )
      })}
    </main>
  )
}
