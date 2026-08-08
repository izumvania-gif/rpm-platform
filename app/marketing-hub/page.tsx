import Link from 'next/link'
import { Megaphone, Rocket } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { roadmapStatusLabels, roadmapStatusTone } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { MarketingSegmentFilterForm } from '@/components/forms/marketing-segment-filter-form'

export const dynamic = 'force-dynamic'

export default async function MarketingHubPage({
  searchParams,
}: {
  searchParams: { segmentId?: string }
}) {
  const userId = getCurrentUserId()
  const segments = await prisma.segment.findMany({
    where: { userId },
    include: { product: { select: { id: true, name: true } } },
    orderBy: [{ product: { name: 'asc' } }, { name: 'asc' }],
  })

  const selectedSegment =
    segments.find((s) => s.id === searchParams.segmentId) ?? segments[0] ?? null

  const [jtbds, upcoming] = selectedSegment
    ? await Promise.all([
        prisma.jTBD.findMany({
          where: { userId, segments: { some: { id: selectedSegment.id } } },
          include: { features: { include: { rtbs: true } } },
          orderBy: { title: 'asc' },
        }),
        prisma.roadmapItem.findMany({
          where: {
            userId,
            productId: selectedSegment.productId,
            status: { in: ['PLANNED', 'IN_PROGRESS'] },
          },
          orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
        }),
      ])
    : [[], []]

  return (
    <main className="container py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Маркетинг</h1>
        <p className="text-muted-foreground">
          Что уже можно сказать клиентам конкретного сегмента — и что скоро сможем.
        </p>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Пока нет ни одного сегмента ни у одного продукта.
        </p>
      ) : (
        <>
          <MarketingSegmentFilterForm segments={segments} segmentId={selectedSegment!.id} />

          <DashboardWidgetCard
            icon={Megaphone}
            title={`Что можно сказать сегменту «${selectedSegment!.name}»`}
            description="JTBD этого сегмента → закрывающие их фичи → опирающиеся на фичи RTB"
          >
            {jtbds.length === 0 ? (
              <p className="text-sm text-muted-foreground">У этого сегмента пока нет JTBD.</p>
            ) : (
              <ul className="space-y-3">
                {jtbds.map((jtbd) => (
                  <li key={jtbd.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/jtbd/${jtbd.id}`} className="font-medium hover:underline">
                        {jtbd.title}
                      </Link>
                      {jtbd.confirmed && <Badge variant="secondary">Подтверждён</Badge>}
                    </div>
                    {jtbd.features.length === 0 ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Нет фичи, закрывающей эту задачу.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5 border-l-2 pl-3">
                        {jtbd.features.map((feature) => (
                          <li key={feature.id} className="text-sm">
                            <Link href={`/features/${feature.id}`} className="hover:underline">
                              {feature.name}
                            </Link>
                            {feature.rtbs.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                {feature.rtbs.map((rtb) => (
                                  <li key={rtb.id}>RTB: {rtb.statement}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DashboardWidgetCard>

          <DashboardWidgetCard
            icon={Rocket}
            title="Скоро"
            description={`Роадмап продукта «${selectedSegment!.product.name}» — что скоро можно будет анонсировать`}
          >
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Пока нет запланированных или начатых пунктов роадмапа.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{item.title}</span>
                      {item.quarter && (
                        <span className="ml-2 text-xs text-muted-foreground">{item.quarter}</span>
                      )}
                    </div>
                    <Badge variant={roadmapStatusTone[item.status]}>
                      {roadmapStatusLabels[item.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </DashboardWidgetCard>
        </>
      )}
    </main>
  )
}
