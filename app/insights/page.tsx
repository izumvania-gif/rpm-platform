import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleInsightPinned } from '@/lib/actions/insights'
import { moduleByHref } from '@/lib/module-meta'
import { EmptyState } from '@/components/shared/empty-state'
import { insightKeyPhrase } from '@/lib/key-phrase'

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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <SectionHeading
          level={1}
          title="Инсайты"
          description={moduleByHref['/insights'].description}
        />
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
        <EmptyState moduleKey="/insights" />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="text-lg font-semibold mb-3">
                {group.name}{' '}
                <span className="text-muted-foreground font-normal">({group.items.length})</span>
              </h2>
              <ul className="divide-y rounded-md border">
                {group.items.map((insight) => (
                  <li key={insight.id}>
                    <Link
                      href={`/insights/${insight.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1 truncate" title={insight.text}>
                        {insightKeyPhrase(insight.text)}
                      </span>
                      {(insight.segment || insight.jtbd) && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {[insight.segment?.name, insight.jtbd?.title].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <TagBadges tags={insight.tags} />
                      <PinButton
                        pinned={insight.pinned}
                        action={toggleInsightPinned.bind(null, insight.id, !insight.pinned)}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
