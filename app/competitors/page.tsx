import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { toggleCompetitorPinned } from '@/lib/actions/competitors'

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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl font-bold">Конкуренты</h1>
        <Link href="/competitors/new" className={buttonVariants()}>
          Новый конкурент
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Обычно открывается из карточки продукта — этот список объединяет конкурентов по всем
        продуктам сразу.
      </p>

      {competitors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <form method="get">
              <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
            </form>
            <p className="text-sm text-muted-foreground">
              {groups.length} {groups.length === 1 ? 'продукт' : 'продуктов'} ·{' '}
              {competitors.length} записей
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((competitor) => (
                  <Link key={competitor.id} href={`/competitors/${competitor.id}`}>
                    <Card className="h-full hover:border-primary transition-colors">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="truncate">{competitor.name}</CardTitle>
                          <PinButton
                            pinned={competitor.pinned}
                            action={toggleCompetitorPinned.bind(
                              null,
                              competitor.id,
                              !competitor.pinned
                            )}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {competitor.positioning && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {competitor.positioning}
                          </p>
                        )}
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
