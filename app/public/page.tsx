import { Building2, CalendarClock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { stageLabels, roadmapStatusLabels, roadmapStatusTone } from '@/lib/labels'
import { groupByQuarter } from '@/lib/roadmap'
import { Badge } from '@/components/ui/badge'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'

export const dynamic = 'force-dynamic'

// Whitelist, not blocklist — see plans/platform-views-plan.md §4. This is
// the one route in the app that must work correctly even once real sessions
// exist and this page has no session at all, so every query below `select`s
// only the fields cleared for public display rather than fetching a model
// and trusting the JSX not to render the rest.
export default async function PublicDashboardPage() {
  const userId = getCurrentUserId()

  const [products, roadmapItems] = await Promise.all([
    prisma.product.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        stage: true,
        publicSummary: true,
        description: true,
        owner: { select: { name: true, role: true } },
      },
    }),
    prisma.roadmapItem.findMany({
      where: { userId, visibility: 'PUBLIC' },
      orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        status: true,
        quarter: true,
        product: { select: { name: true } },
      },
    }),
  ])

  const quarterGroups = groupByQuarter(roadmapItems)

  return (
    <main className="container py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Компания</h1>
        <p className="text-muted-foreground">
          Открытый дашборд без входа — какие есть продукты, кто ими управляет, что публично в
          роадмапе.
        </p>
      </div>

      <DashboardWidgetCard
        icon={Building2}
        title="Продукты"
        tone="secondary"
        contentClassName="p-0"
      >
        {products.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Пока нет продуктов.</p>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {products.map((product) => {
              const summary =
                product.publicSummary?.trim() ||
                (product.description ? product.description.slice(0, 200) : null)
              return (
                <div key={product.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="secondary">{stageLabels[product.stage]}</Badge>
                  </div>
                  {summary && <p className="mt-2 text-sm text-muted-foreground">{summary}</p>}
                  {product.owner && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ответственный: {product.owner.name}
                      {product.owner.role && ` (${product.owner.role})`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DashboardWidgetCard>

      <DashboardWidgetCard
        icon={CalendarClock}
        title="Публичный роадмап"
        tone="secondary"
        contentClassName="p-0"
      >
        {roadmapItems.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Пока нет публичных пунктов роадмапа.</p>
        ) : (
          <div className="divide-y">
            {quarterGroups.map(([quarter, items]) => (
              <div key={quarter} className="p-5">
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
