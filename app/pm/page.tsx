import Link from 'next/link'
import { CalendarClock, Info, Users2, Workflow } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteRoadmapItem, toggleRoadmapItemPinned } from '@/lib/actions/roadmap'
import { roadmapStatusIcon, roadmapStatusLabels, roadmapStatusTone } from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { PmProductSwitcher } from '@/components/shared/pm-product-switcher'
import type { RoadmapItem, Feature, JTBD, Person } from '@prisma/client'

export const dynamic = 'force-dynamic'

const NO_QUARTER_LABEL = 'Без квартала'

type RoadmapItemWithRelations = RoadmapItem & {
  owner: Person | null
  feature: Feature | null
  jtbd: JTBD | null
}

function groupByQuarter(items: RoadmapItemWithRelations[]) {
  const groups = new Map<string, RoadmapItemWithRelations[]>()
  for (const item of items) {
    const key = item.quarter?.trim() || NO_QUARTER_LABEL
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === NO_QUARTER_LABEL) return 1
    if (b === NO_QUARTER_LABEL) return -1
    return a.localeCompare(b, 'ru')
  })
}

function ComingSoon({
  icon: Icon,
  title,
  phase,
  description,
}: {
  icon: typeof Users2
  title: string
  phase: string
  description: string
}) {
  return (
    <Card variant="content" className="border-l-4 border-muted-foreground/30">
      <CardContent className="flex gap-3 py-5">
        <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {title} <span className="font-normal text-muted-foreground">— {phase}</span>
          </p>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function PmPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })

  const selectedProductId =
    searchParams.productId && products.some((p) => p.id === searchParams.productId)
      ? searchParams.productId
      : undefined

  const [product, roadmapItems] = selectedProductId
    ? await Promise.all([
        prisma.product.findFirst({ where: { id: selectedProductId, userId } }),
        prisma.roadmapItem.findMany({
          where: { productId: selectedProductId, userId },
          orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
          include: { owner: true, feature: true, jtbd: true },
        }),
      ])
    : [null, []]

  return (
    <main className="container py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">PM</h1>
        <p className="text-muted-foreground">
          Хаб на один продукт за раз: роадмап, команда, процесс, экшн-планы.
        </p>
      </div>

      {products.length === 0 ? (
        <Card variant="content" className="border-l-4 border-primary">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">
              Сначала создайте продукт —{' '}
              <Link href="/products/new" className="underline">
                новый продукт
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PmProductSwitcher products={products} selectedProductId={selectedProductId} />

          {!product ? (
            <p className="text-sm text-muted-foreground">
              Выберите продукт выше, чтобы увидеть его роадмап.
            </p>
          ) : (
            <>
              <Card variant="content">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-l-4 border-primary">
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <CalendarClock size={15} strokeWidth={1.75} className="text-primary" />
                    Роадмап
                  </CardTitle>
                  <Link
                    href={`/pm/roadmap/new?productId=${product.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Добавить пункт
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  {roadmapItems.length === 0 ? (
                    <p className="p-5 text-sm text-muted-foreground">
                      Пока нет пунктов роадмапа для этого продукта.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {groupByQuarter(roadmapItems).map(([quarter, items]) => (
                        <div key={quarter} className="p-5">
                          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                            {quarter}
                          </h3>
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
                                      action={toggleRoadmapItemPinned.bind(
                                        null,
                                        item.id,
                                        !item.pinned
                                      )}
                                    />
                                    <Link
                                      href={`/pm/roadmap/${item.id}/edit`}
                                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                                    >
                                      Редактировать
                                    </Link>
                                    <DeleteButton action={deleteRoadmapItem.bind(null, item.id)} />
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

              <ComingSoon
                icon={Users2}
                title="Командный дашборд / матрица делегирования"
                phase="Фаза 2"
                description="Кто чем занят прямо сейчас — на основе назначенных пунктов роадмапа и шагов процесса."
              />
              <ComingSoon
                icon={Workflow}
                title="Диаграмма процесса и экшн-планы"
                phase="Фаза 3"
                description="Как устроен внутренний процесс продукта и что делать в предсказуемых нештатных ситуациях."
              />
            </>
          )}
        </>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Раздел в разработке — см. plans/platform-views-plan.md.</span>
      </div>
    </main>
  )
}
