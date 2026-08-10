import Link from 'next/link'
import { ArrowLeft, CalendarClock, ClipboardList, Users2, Workflow } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteRoadmapItem, toggleRoadmapItemPinned } from '@/lib/actions/roadmap'
import { deleteActionPlan, toggleActionPlanPinned } from '@/lib/actions/action-plans'
import { deleteProcess } from '@/lib/actions/processes'
import { roadmapStatusIcon, roadmapStatusLabels, roadmapStatusTone } from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { getProductTeamWorkload } from '@/lib/team-workload'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { PmProductSwitcher } from '@/components/shared/pm-product-switcher'
import { TagBadges } from '@/components/shared/tag-badges'
import { PersonAvatar } from '@/components/shared/person-avatar'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { ScrollToSection } from '@/components/shared/scroll-to-section'
import { ProcessGraph } from '@/components/process-graph/canvas'
import { RoadmapViewTabs } from '@/components/shared/roadmap-view-tabs'
import { GanttChart } from '@/components/roadmap-gantt/gantt-chart'
import { groupByQuarter } from '@/lib/roadmap'
import { buildGanttLayout } from '@/lib/roadmap-gantt'
import { pluralizeRu } from '@/lib/utils'

const STEP_FORMS: [string, string, string] = ['шаг', 'шага', 'шагов']

export const dynamic = 'force-dynamic'

export default async function PmPage({
  searchParams,
}: {
  searchParams: { productId?: string; view?: string; processId?: string; scrollTo?: string }
}) {
  const roadmapView = searchParams.view === 'gantt' ? 'gantt' : 'list'
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })

  const selectedProductId =
    searchParams.productId && products.some((p) => p.id === searchParams.productId)
      ? searchParams.productId
      : undefined

  const [product, roadmapItems, teamWorkload, actionPlans, processes, people] = selectedProductId
    ? await Promise.all([
        prisma.product.findFirst({ where: { id: selectedProductId, userId } }),
        prisma.roadmapItem.findMany({
          where: { productId: selectedProductId, userId },
          orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
          include: { owner: true, feature: true, jtbd: true },
        }),
        getProductTeamWorkload(userId, selectedProductId),
        prisma.actionPlan.findMany({
          where: { productId: selectedProductId, userId },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          include: { owner: true, processStep: true },
        }),
        prisma.process.findMany({
          where: { productId: selectedProductId },
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { steps: true } } },
        }),
        prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      ])
    : [null, [], [], [], [], []]

  const selectedProcess =
    searchParams.processId && processes.some((p) => p.id === searchParams.processId)
      ? processes.find((p) => p.id === searchParams.processId)!
      : undefined

  const [processSteps, processEdges] = selectedProcess
    ? await Promise.all([
        prisma.processStep.findMany({
          where: { processId: selectedProcess.id },
          include: { assignedPerson: true },
        }),
        prisma.processEdge.findMany({
          where: { fromStep: { processId: selectedProcess.id } },
        }),
      ])
    : [[], []]

  return (
    <main className="container py-12 space-y-8">
      <ScrollToSection id={searchParams.scrollTo} />
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
              <Card id="roadmap" variant="content" className="scroll-mt-4">
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
                <div className="border-b px-5 py-3">
                  <RoadmapViewTabs active={roadmapView} productId={product.id} />
                </div>
                <CardContent className={roadmapView === 'gantt' ? 'p-5' : 'p-0'}>
                  {roadmapView === 'gantt' ? (
                    <GanttChart layout={buildGanttLayout(roadmapItems)} />
                  ) : roadmapItems.length === 0 ? (
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

              <DashboardWidgetCard
                id="team"
                icon={Users2}
                title="Команда"
                description="Кто сколько сейчас ведёт по роадмапу и шагам процесса этого продукта"
                tone="secondary"
                contentClassName="p-0"
              >
                {teamWorkload.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Пока никто не назначен ответственным по пунктам роадмапа или шагам процесса
                    этого продукта.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {teamWorkload.map(({ person, activeCount, totalCount }) => (
                      <li
                        key={person.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
                      >
                        <PersonAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/people/${person.id}`}
                            className="font-medium hover:underline"
                          >
                            {person.name}
                          </Link>
                          {person.role && (
                            <span className="ml-2 text-muted-foreground">{person.role}</span>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {activeCount} активных · {totalCount} всего
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardWidgetCard>

              <DashboardWidgetCard
                id="action-plans"
                icon={ClipboardList}
                title="Экшн-планы"
                description="Заранее написанное «что делать» для предсказуемых нештатных ситуаций — открыть готовый план быстрее, чем придумывать реакцию в моменте (plans/pm-time-allocation-research.md §1)"
                tone="secondary"
                contentClassName="p-0"
                action={
                  <Link
                    href={`/pm/action-plans/new?productId=${product.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Добавить план
                  </Link>
                }
              >
                {actionPlans.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Пока нет экшн-планов для этого продукта.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {actionPlans.map((plan) => (
                      <li key={plan.id} className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0">
                            <p className="font-medium">{plan.scenario}</p>
                            {plan.trigger && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Триггер: {plan.trigger}
                              </p>
                            )}
                            {plan.steps.length > 0 && (
                              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
                                {plan.steps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            )}
                            <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                              {plan.owner && <span>Координирует: {plan.owner.name}</span>}
                              {plan.processStep && (
                                <span>Шаг процесса: {plan.processStep.title}</span>
                              )}
                            </p>
                            {plan.tags.length > 0 && (
                              <div className="mt-2">
                                <TagBadges tags={plan.tags} />
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <PinButton
                              pinned={plan.pinned}
                              action={toggleActionPlanPinned.bind(null, plan.id, !plan.pinned)}
                            />
                            <Link
                              href={`/pm/action-plans/${plan.id}/edit`}
                              className={buttonVariants({ variant: 'outline', size: 'sm' })}
                            >
                              Редактировать
                            </Link>
                            <DeleteButton action={deleteActionPlan.bind(null, plan.id)} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardWidgetCard>

              <DashboardWidgetCard
                id="process"
                icon={Workflow}
                title={selectedProcess ? `Процесс: ${selectedProcess.title}` : 'Процесс'}
                description={
                  selectedProcess
                    ? 'Кто что делает и кому передаёт дальше'
                    : 'Продукт может описывать несколько процессов — выберите, чтобы увидеть схему'
                }
                tone="secondary"
                action={
                  selectedProcess ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/pm?productId=${product.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <ArrowLeft size={14} className="mr-1" />
                        Все процессы
                      </Link>
                      <Link
                        href={`/pm/processes/${selectedProcess.id}/edit`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Переименовать
                      </Link>
                      <DeleteButton
                        action={deleteProcess.bind(null, selectedProcess.id)}
                        confirmMessage="Удалить процесс вместе со всеми его шагами и связями?"
                      />
                    </div>
                  ) : (
                    <Link
                      href={`/pm/processes/new?productId=${product.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Добавить процесс
                    </Link>
                  )
                }
              >
                {selectedProcess ? (
                  <ProcessGraph
                    processId={selectedProcess.id}
                    steps={processSteps}
                    processEdges={processEdges}
                    people={people}
                  />
                ) : processes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    У этого продукта пока нет описанных процессов.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {processes.map((process) => (
                      <li key={process.id}>
                        <Link
                          href={`/pm?productId=${product.id}&processId=${process.id}`}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-accent/50"
                        >
                          <span className="min-w-0 flex-1 font-medium">{process.title}</span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {pluralizeRu(process._count.steps, STEP_FORMS)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardWidgetCard>
            </>
          )}
        </>
      )}
    </main>
  )
}
