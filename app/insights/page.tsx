import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { toggleInsightPinned } from '@/lib/actions/insights'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [{ value: 'created_desc', label: 'Сначала новые' }]

export default async function InsightsPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const insights = await prisma.insight.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { createdAt: 'desc' },
    include: { product: true, segment: true, jtbd: true },
  })

  const byProduct = new Map<string, { name: string; items: typeof insights }>()
  for (const insight of insights) {
    if (!byProduct.has(insight.productId)) {
      byProduct.set(insight.productId, { name: insight.product.name, items: [] })
    }
    byProduct.get(insight.productId)!.items.push(insight)
  }
  const groups = Array.from(byProduct.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl font-bold">Инсайты</h1>
        <Link href="/insights/new" className={buttonVariants()}>
          Новый инсайт
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Атомарные цитаты и выводы из исследований и разговоров — с привязкой к сегменту и JTBD,
        отдельно от полного транскрипта.
      </p>

      {insights.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <form method="get">
              <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
            </form>
            <p className="text-sm text-muted-foreground">
              {groups.length} {groups.length === 1 ? 'продукт' : 'продуктов'} · {insights.length}{' '}
              записей
            </p>
          </div>
          <CsvExportButton
            filename="insights.csv"
            rows={insights.map((i) => ({
              text: i.text,
              product: i.product.name,
              segment: i.segment?.name ?? '',
              jtbd: i.jtbd?.title ?? '',
              tags: i.tags.join('; '),
            }))}
          />
        </div>
      )}

      {insights.length === 0 ? (
        <p className="text-muted-foreground">Инсайтов пока нет.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="text-lg font-semibold mb-3">
                {group.name}{' '}
                <span className="text-muted-foreground font-normal">({group.items.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((insight) => (
                  <Link key={insight.id} href={`/insights/${insight.id}`}>
                    <Card className="h-full hover:border-primary transition-colors">
                      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                        <p className="line-clamp-4 text-sm">{insight.text}</p>
                        <PinButton
                          pinned={insight.pinned}
                          action={toggleInsightPinned.bind(null, insight.id, !insight.pinned)}
                        />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(insight.segment || insight.jtbd) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[insight.segment?.name, insight.jtbd?.title]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        <TagBadges tags={insight.tags} />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
