import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { loadPmContext } from '@/lib/pm-context'
import { deleteRoadmapItem, toggleRoadmapItemPinned } from '@/lib/actions/roadmap'
import { roadmapStatusIcon, roadmapStatusLabels, roadmapStatusTone } from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { AddRoadmapItemForm } from '@/components/shared/add-roadmap-item-form'
import { EmptyState } from '@/components/shared/empty-state'
import { PmShell } from '@/components/pm/pm-shell'
import { groupByQuarter } from '@/lib/roadmap'

export const dynamic = 'force-dynamic'

export default async function PmRoadmapPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const context = await loadPmContext(searchParams.productId)
  const { product, people, userId } = context

  const roadmapItems = product
    ? await prisma.roadmapItem.findMany({
        where: { productId: product.id, userId },
        orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
        include: { owner: true, feature: true, jtbd: true },
      })
    : []

  return (
    <PmShell context={context}>
      {product && (
        <Card variant="content">
          <CardHeader className="flex flex-col items-start gap-2 space-y-0 border-l-4 border-primary sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-1.5 text-base">
              <CalendarClock size={15} strokeWidth={1.75} className="text-primary" />
              Роадмап
            </CardTitle>
            <AddRoadmapItemForm productId={product.id} people={people} />
          </CardHeader>
          <CardContent className="p-0">
            {roadmapItems.length === 0 ? (
              <div className="p-5">
                <EmptyState moduleKey="/pm/roadmap" productId={product.id} variant="inline" />
              </div>
            ) : (
              <div className="divide-y">
                {groupByQuarter(roadmapItems).map(([quarter, items]) => (
                  <div key={quarter} className="p-5">
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{quarter}</h3>
                    <ul className="space-y-3">
                      {items.map((item) => {
                        const StatusIcon = roadmapStatusIcon[item.status]
                        const tone = signalToneColors[roadmapStatusTone[item.status]]
                        return (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border p-3"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{item.title}</span>
                                <span
                                  className="flex items-center gap-1 text-xs"
                                  style={{ color: tone.border }}
                                >
                                  <StatusIcon size={13} strokeWidth={2} />
                                  {roadmapStatusLabels[item.status]}
                                </span>
                                {item.visibility === 'PUBLIC' && (
                                  <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                                    публичный
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                {item.owner && <span>Ответственный: {item.owner.name}</span>}
                                {item.feature && <span>Фича: {item.feature.name}</span>}
                                {item.jtbd && <span>JTBD: {item.jtbd.title}</span>}
                              </p>
                              {item.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <PinButton
                                pinned={item.pinned}
                                action={toggleRoadmapItemPinned.bind(null, item.id, !item.pinned)}
                              />
                              <Link
                                href={`/pm/roadmap/${item.id}/edit`}
                                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                              >
                                Редактировать
                              </Link>
                              <DeleteButton
                                action={deleteRoadmapItem.bind(null, item.id)}
                                impact={{ model: 'roadmapItem', id: item.id }}
                                name={item.title}
                              />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PmShell>
  )
}
