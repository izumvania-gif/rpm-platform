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

export default async function FeaturesPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const features = await prisma.feature.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
    include: { product: true, jtbds: true, rtbs: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">Фичи</h1>
        <Link href="/features/new" className={buttonVariants()}>
          Новая фича
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <form method="get">
          <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
        </form>
        <CsvExportButton
          filename="features.csv"
          rows={features.map((f) => ({
            name: f.name,
            product: f.product.name,
            jtbds: f.jtbds.length,
            rtbs: f.rtbs.length,
          }))}
        />
      </div>

      {features.length === 0 ? (
        <p className="text-muted-foreground">Фич пока нет.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.id} href={`/features/${feature.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="truncate">{feature.name}</CardTitle>
                  <CardDescription>{feature.product.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.jtbds.length} JTBD · {feature.rtbs.length} RTB
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
