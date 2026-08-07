import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleCompetitorPinned } from '@/lib/actions/competitors'
import { moduleByHref } from '@/lib/module-meta'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Сначала новые' },
  { value: 'name_asc', label: 'По названию' },
]

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: { sort?: string }
}) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const competitors = await prisma.competitor.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
    include: { product: true },
  })

  const byProduct = new Map<string, { name: string; items: typeof competitors }>()
  for (const competitor of competitors) {
    if (!byProduct.has(competitor.productId)) {
      byProduct.set(competitor.productId, { name: competitor.product.name, items: [] })
    }
    byProduct.get(competitor.productId)!.items.push(competitor)
  }
  const groups = Array.from(byProduct.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading title="Конкуренты" description={moduleByHref['/competitors'].description} />
        <Link href="/competitors/new" className={buttonVariants()}>
          Новый конкурент
        </Link>
      </div>

      {competitors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <form method="get">
              <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
            </form>
            <p className="text-sm text-muted-foreground">
              {groups.length} {groups.length === 1 ? 'продукт' : 'продуктов'} · {competitors.length}{' '}
              записей
            </p>
          </div>
          <CsvExportButton
            filename="competitors.csv"
            rows={competitors.map((c) => ({
              name: c.name,
              product: c.product.name,
              url: c.url ?? '',
              features: c.features.join('; '),
            }))}
          />
        </div>
      )}

      {competitors.length === 0 ? (
        <p className="text-muted-foreground">Конкурентов пока нет.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="text-lg font-semibold mb-3">
                {group.name}{' '}
                <span className="text-muted-foreground font-normal">({group.items.length})</span>
              </h2>
              <ul className="divide-y rounded-md border">
                {group.items.map((competitor) => (
                  <li key={competitor.id}>
                    <Link
                      href={`/competitors/${competitor.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
                    >
                      <span className="min-w-0 shrink-0 font-medium">{competitor.name}</span>
                      {competitor.positioning && (
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {competitor.positioning}
                        </span>
                      )}
                      <PinButton
                        pinned={competitor.pinned}
                        action={toggleCompetitorPinned.bind(
                          null,
                          competitor.id,
                          !competitor.pinned
                        )}
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
