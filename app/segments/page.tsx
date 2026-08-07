import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleSegmentPinned } from '@/lib/actions/segments'
import { moduleByHref } from '@/lib/module-meta'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Сначала новые' },
  { value: 'name_asc', label: 'По названию' },
]

export default async function SegmentsPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const segments = await prisma.segment.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading title="Сегменты" description={moduleByHref['/segments'].description} />
        <div className="flex flex-wrap gap-2">
          <Link href="/reports/segments-jtbd" className={buttonVariants({ variant: 'outline' })}>
            Матрица Сегменты × JTBD
          </Link>
          <Link href="/segments/new" className={buttonVariants()}>
            Новый сегмент
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <form method="get">
          <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
        </form>
        <CsvExportButton
          filename="segments.csv"
          rows={segments.map((s) => ({
            name: s.name,
            product: s.product.name,
            audienceShare: s.audienceShare ?? '',
            tags: s.tags.join('; '),
          }))}
        />
      </div>

      {segments.length === 0 ? (
        <p className="text-muted-foreground">Сегментов пока нет.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Link key={segment.id} href={`/segments/${segment.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <CardTitle className="truncate">{segment.name}</CardTitle>
                    </div>
                    <PinButton
                      pinned={segment.pinned}
                      action={toggleSegmentPinned.bind(null, segment.id, !segment.pinned)}
                    />
                  </div>
                  <CardDescription>{segment.product.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {segment.audienceShare != null && (
                    <p className="text-sm text-muted-foreground">
                      {segment.audienceShare}% аудитории
                    </p>
                  )}
                  <TagBadges tags={segment.tags} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
