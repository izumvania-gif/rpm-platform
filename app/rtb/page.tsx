import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { toggleRTBPinned } from '@/lib/actions/rtbs'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [{ value: 'created_desc', label: 'Сначала новые' }]

export default async function RTBPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const rtbs = await prisma.rTB.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { createdAt: 'desc' },
    include: { product: true, features: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">RTB</h1>
        <Link href="/rtb/new" className={buttonVariants()}>
          Новый RTB
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <form method="get">
          <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
        </form>
        <CsvExportButton
          filename="rtb.csv"
          rows={rtbs.map((r) => ({
            statement: r.statement,
            product: r.product.name,
            features: r.features.length,
          }))}
        />
      </div>

      {rtbs.length === 0 ? (
        <p className="text-muted-foreground">RTB пока нет.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rtbs.map((rtb) => (
            <Link key={rtb.id} href={`/rtb/${rtb.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-3 text-base">{rtb.statement}</CardTitle>
                    <PinButton
                      pinned={rtb.pinned}
                      action={toggleRTBPinned.bind(null, rtb.id, !rtb.pinned)}
                    />
                  </div>
                  <CardDescription>
                    {rtb.product.name} · {rtb.features.length} фич
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
