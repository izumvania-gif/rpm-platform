import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'

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

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">Конкуренты</h1>
        <Link href="/competitors/new" className={buttonVariants()}>
          Новый конкурент
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <form method="get">
          <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
        </form>
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

      {competitors.length === 0 ? (
        <p className="text-muted-foreground">Конкурентов пока нет.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <Link key={competitor.id} href={`/competitors/${competitor.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="truncate">{competitor.name}</CardTitle>
                  <CardDescription>{competitor.product.name}</CardDescription>
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
      )}
    </main>
  )
}
