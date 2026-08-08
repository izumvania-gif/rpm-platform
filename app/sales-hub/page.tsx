import Link from 'next/link'
import { RoadmapStatus } from '@prisma/client'
import { CircleCheck, CircleDashed, CircleDot, CircleX, Package, Search } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { productResourceKindLabels, roadmapStatusLabels } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { SalesProductSwitcher } from '@/components/shared/sales-product-switcher'

export const dynamic = 'force-dynamic'

// Sales-relevant order: the sales kit itself first, everything else after —
// same list as ProductResourceKind's declaration order in schema.prisma.
const RESOURCE_KIND_ORDER = ['SALES_KIT', 'DEVELOPER_DOC', 'CONFLUENCE_LINK', 'JIRA_LINK', 'OTHER'] as const

// Only PLANNED/IN_PROGRESS are worth surfacing to sales as "coming soon" —
// SHIPPED should already have a matching Feature, and PAUSED isn't
// something to tell a client is on the way.
const SALES_RELEVANT_ROADMAP_STATUSES: RoadmapStatus[] = [
  RoadmapStatus.IN_PROGRESS,
  RoadmapStatus.PLANNED,
]

export default async function SalesHubPage({
  searchParams,
}: {
  searchParams: { productId?: string; q?: string }
}) {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })

  const selectedProductId =
    searchParams.productId && products.some((p) => p.id === searchParams.productId)
      ? searchParams.productId
      : undefined

  const q = (searchParams.q ?? '').trim()

  const [resources, matchedFeatures, matchedRoadmapItems] = selectedProductId
    ? await Promise.all([
        prisma.productResource.findMany({
          where: { productId: selectedProductId, userId },
          orderBy: { title: 'asc' },
        }),
        q
          ? prisma.feature.findMany({
              where: { productId: selectedProductId, userId, name: { contains: q, mode: 'insensitive' } },
              orderBy: { name: 'asc' },
            })
          : Promise.resolve([]),
        q
          ? prisma.roadmapItem.findMany({
              where: {
                productId: selectedProductId,
                userId,
                title: { contains: q, mode: 'insensitive' },
                status: { in: SALES_RELEVANT_ROADMAP_STATUSES },
              },
              orderBy: { title: 'asc' },
            })
          : Promise.resolve([]),
      ])
    : [[], [], []]

  resources.sort(
    (a, b) => RESOURCE_KIND_ORDER.indexOf(a.kind) - RESOURCE_KIND_ORDER.indexOf(b.kind)
  )

  return (
    <main className="container py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Продажи</h1>
        <p className="text-muted-foreground">
          Быстрый вход в материалы по продукту и ответ на «есть ли у нас фича X».
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
          <SalesProductSwitcher products={products} selectedProductId={selectedProductId} />

          {!selectedProductId ? (
            <p className="text-sm text-muted-foreground">
              Выберите продукт выше, чтобы увидеть материалы и найти фичу.
            </p>
          ) : (
            <>
              <DashboardWidgetCard
                icon={Package}
                title="Материалы"
                description="Sales-kit в первую очередь, остальные ресурсы — ниже"
              >
                {resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет ресурсов у этого продукта.</p>
                ) : (
                  <ul className="divide-y">
                    {resources.map((resource) => (
                      <li
                        key={resource.id}
                        className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0"
                      >
                        <Badge variant="outline">{productResourceKindLabels[resource.kind]}</Badge>
                        {resource.url ? (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm hover:underline"
                          >
                            {resource.title}
                          </a>
                        ) : (
                          <span className="text-sm">{resource.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardWidgetCard>

              <DashboardWidgetCard
                icon={Search}
                title="Есть ли у нас фича X?"
                description="Только качественный статус — без квартала/даты, чтобы не превращалось в обещание клиенту"
              >
                <form method="get" className="flex flex-wrap gap-2">
                  <input type="hidden" name="productId" value={selectedProductId} />
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Название фичи"
                    aria-label="Название фичи"
                    className="h-9 flex-1 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-md border border-input bg-background px-4 text-sm hover:border-primary/50"
                  >
                    Найти
                  </button>
                </form>

                {q && (
                  <div className="mt-4 space-y-2">
                    {matchedFeatures.length > 0 ? (
                      matchedFeatures.map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-center gap-2 rounded-md border p-3 text-sm"
                        >
                          <CircleCheck
                            size={15}
                            className="shrink-0 text-[hsl(var(--signal-violet-border))]"
                          />
                          <Link href={`/features/${feature.id}`} className="hover:underline">
                            {feature.name}
                          </Link>
                          <span className="text-muted-foreground">— уже есть</span>
                        </div>
                      ))
                    ) : matchedRoadmapItems.length > 0 ? (
                      matchedRoadmapItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-md border p-3 text-sm"
                        >
                          {item.status === 'IN_PROGRESS' ? (
                            <CircleDot size={15} className="shrink-0 text-[hsl(var(--signal-blue-border))]" />
                          ) : (
                            <CircleDashed size={15} className="shrink-0 text-[hsl(var(--signal-slate-border))]" />
                          )}
                          <span>{item.title}</span>
                          <span className="text-muted-foreground">
                            — {roadmapStatusLabels[item.status].toLowerCase()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                        <CircleX size={15} className="shrink-0" />
                        Не найдено — такой фичи нет и пока не в планах.
                      </div>
                    )}
                  </div>
                )}
              </DashboardWidgetCard>
            </>
          )}
        </>
      )}
    </main>
  )
}
