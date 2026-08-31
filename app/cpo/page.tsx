import Link from 'next/link'
import { Building2, CalendarClock, ClipboardList, GitMerge } from 'lucide-react'
import { getCurrentUserId } from '@/lib/current-user'
import {
  stageLabels,
  roadmapStatusLabels,
  roadmapStatusOrder,
  roadmapStatusTone,
} from '@/lib/labels'
import {
  getCrossProductGaps,
  getEcosystemCorrelations,
  getMultiProductGanttLayout,
  getMultiProductRoadmap,
  getProductsOverview,
  getRoadmapStatusByProduct,
  groupByDepartment,
  NO_DEPARTMENT_LABEL,
} from '@/lib/cpo-metrics'
import { Badge } from '@/components/ui/badge'
import { signalToneColors } from '@/lib/signal-colors'
import { pluralizeRu } from '@/lib/plural'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { MultiRoadmapViewTabs } from '@/components/shared/multi-roadmap-view-tabs'
import { GanttChart } from '@/components/roadmap-gantt/gantt-chart'

export const dynamic = 'force-dynamic'

const PRODUCT_FORMS: [string, string, string] = ['продукт', 'продукта', 'продуктов']

export default async function CpoViewPage({ searchParams }: { searchParams: { view?: string } }) {
  const roadmapView = searchParams.view === 'gantt' ? 'gantt' : 'list'
  const userId = getCurrentUserId()

  const [products, ecosystem, gaps, roadmapByProduct, multiRoadmap, ganttLayout] =
    await Promise.all([
      getProductsOverview(userId),
      getEcosystemCorrelations(userId),
      getCrossProductGaps(userId),
      getRoadmapStatusByProduct(userId),
      roadmapView === 'list' ? getMultiProductRoadmap(userId) : Promise.resolve([]),
      roadmapView === 'gantt' ? getMultiProductGanttLayout(userId) : Promise.resolve(null),
    ])

  const productGroups = groupByDepartment(products)

  const gapsStats = [
    { label: 'JTBD без подтверждения', count: gaps.totals.unconfirmedJtbds },
    { label: 'Сегменты без JTBD', count: gaps.totals.segmentsWithoutJtbd },
    { label: 'Гипотезы в черновике 14+ дней', count: gaps.totals.stuckHypotheses },
    { label: 'Продукты без свежих исследований', count: gaps.totals.productsWithoutRecentResearch },
  ]

  return (
    <main className="container py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">CPO</h1>
        <p className="text-muted-foreground">
          Все продукты как экосистема: обзор, пересечения, ключевые направления, мультипродуктовый
          роадмап.
        </p>
      </div>

      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href="#products" className="text-primary hover:underline">
          Продукты
        </a>
        <a href="#ecosystem" className="text-primary hover:underline">
          Экосистема
        </a>
        <a href="#gaps" className="text-primary hover:underline">
          Ключевые направления
        </a>
        <a href="#roadmap" className="text-primary hover:underline">
          Мультипродуктовый роадмап
        </a>
      </nav>

      <DashboardWidgetCard
        id="products"
        icon={Building2}
        title="Продукты"
        description="Обзорная сетка всех продуктов — покрытие JTBD и активные гипотезы"
      >
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет продуктов.</p>
        ) : (
          <div className="space-y-5">
            {productGroups.map((group) => (
              <div key={group.department?.id ?? 'none'}>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  {group.department && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: group.department.color }}
                    />
                  )}
                  {group.department ? (
                    <Link href={`/departments/${group.department.id}`} className="hover:underline">
                      {group.department.name}
                    </Link>
                  ) : (
                    NO_DEPARTMENT_LABEL
                  )}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((product) => {
                    const activeHypotheses =
                      product.hypothesisCounts.DRAFT + product.hypothesisCounts.IN_REVIEW
                    return (
                      <Link
                        key={product.id}
                        href={`/pm?productId=${product.id}`}
                        className="rounded-md border p-3 transition-colors hover:border-primary/50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          <Badge variant="secondary">{stageLabels[product.stage]}</Badge>
                        </div>
                        <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>JTBD подтверждено: {product.jtbdCoverage.percent}%</span>
                          <span>Активных гипотез: {activeHypotheses}</span>
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardWidgetCard>

      <DashboardWidgetCard
        id="ecosystem"
        icon={GitMerge}
        title="Экосистема"
        description="Вычисляемые пересечения между продуктами — по точному совпадению названия сегмента или категории JTBD (не хранится, не редактируется вручную)"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Похожие сегменты</h3>
            {ecosystem.segmentGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Совпадений не найдено.</p>
            ) : (
              <ul className="space-y-2">
                {ecosystem.segmentGroups.map((group) => (
                  <li key={group.key} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{group.key}</span>
                      <Badge variant="slate">
                        {pluralizeRu(group.products.length, PRODUCT_FORMS)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.products.map((p) => p.name).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Общие категории JTBD
            </h3>
            {ecosystem.jtbdCategoryGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Совпадений не найдено.</p>
            ) : (
              <ul className="space-y-2">
                {ecosystem.jtbdCategoryGroups.map((group) => (
                  <li key={group.key} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{group.key}</span>
                      <Badge variant="slate">
                        {pluralizeRu(group.products.length, PRODUCT_FORMS)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.products.map((p) => p.name).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DashboardWidgetCard>

      <DashboardWidgetCard
        id="gaps"
        icon={ClipboardList}
        title="Ключевые направления развития"
        description="Пробелы и статус роадмапа по каждому продукту"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gapsStats.map((stat) => {
            const hasIssue = stat.count > 0
            const tone = signalToneColors.red
            return (
              <div
                key={stat.label}
                className="rounded-md border p-3"
                style={
                  hasIssue ? { borderColor: tone.border, backgroundColor: tone.bg } : undefined
                }
              >
                <p className="mb-1.5 truncate text-xs text-muted-foreground">{stat.label}</p>
                <span
                  className="font-mono text-2xl font-bold"
                  style={hasIssue ? { color: tone.text } : undefined}
                >
                  {stat.count}
                </span>
              </div>
            )
          })}
        </div>

        {gaps.byProduct.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3 sticky left-0 bg-background">Продукт</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">JTBD без подтв.</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Сегменты без JTBD</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Гипотезы 14+ дней</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Исследования устарели</th>
                </tr>
              </thead>
              <tbody>
                {gaps.byProduct.map((row) => (
                  <tr key={row.product.id} className="border-b last:border-b-0">
                    <td className="py-2 px-3 sticky left-0 bg-background font-medium">
                      {row.product.name}
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums">{row.unconfirmedJtbds}</td>
                    <td className="py-2 px-3 text-center tabular-nums">
                      {row.segmentsWithoutJtbd}
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums">{row.stuckHypotheses}</td>
                    <td className="py-2 px-3 text-center">
                      {row.staleResearch ? (
                        <Badge variant="amber">да</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {roadmapByProduct.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3 sticky left-0 bg-background">Продукт</th>
                  {roadmapStatusOrder.map((status) => (
                    <th key={status} className="py-2 px-3 text-center whitespace-nowrap">
                      {roadmapStatusLabels[status]}
                    </th>
                  ))}
                  <th className="py-2 px-3 text-center whitespace-nowrap">
                    Зависло в «Запланировано»
                  </th>
                </tr>
              </thead>
              <tbody>
                {roadmapByProduct.map((row) => (
                  <tr key={row.product.id} className="border-b last:border-b-0">
                    <td className="py-2 px-3 sticky left-0 bg-background font-medium">
                      {row.product.name}
                    </td>
                    {roadmapStatusOrder.map((status) => (
                      <td key={status} className="py-2 px-3 text-center tabular-nums">
                        {row.counts[status]}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center tabular-nums">{row.stuckPlanned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardWidgetCard>

      <DashboardWidgetCard
        id="roadmap"
        icon={CalendarClock}
        title="Мультипродуктовый роадмап"
        description={
          roadmapView === 'gantt'
            ? 'Все продукты на одной диаграмме, сгруппированные по департаментам'
            : 'Все пункты роадмапа всех продуктов, сгруппированные по кварталу'
        }
        action={<MultiRoadmapViewTabs active={roadmapView} />}
      >
        {roadmapView === 'gantt' ? (
          ganttLayout && (ganttLayout.groups.length > 0 || ganttLayout.milestones.length > 0) ? (
            <GanttChart layout={ganttLayout} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Пока нет пунктов роадмапа с датами начала и конца.
            </p>
          )
        ) : multiRoadmap.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет пунктов роадмапа.</p>
        ) : (
          <div className="divide-y">
            {multiRoadmap.map(([quarter, items]) => (
              <div key={quarter} className="py-4 first:pt-0">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{quarter}</h3>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{item.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.product.name}
                        </span>
                      </div>
                      <Badge variant={roadmapStatusTone[item.status]}>
                        {roadmapStatusLabels[item.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DashboardWidgetCard>
    </main>
  )
}
