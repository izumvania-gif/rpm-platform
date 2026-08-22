import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { activeProductFilter } from '@/lib/product-context'
import { buttonVariants } from '@/components/ui/button'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleSegmentPinned } from '@/lib/actions/segments'
import { moduleByHref } from '@/lib/module-meta'
import { EmptyState } from '@/components/shared/empty-state'
import { QuickAddButton } from '@/components/shared/quick-add-button'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Сначала новые' },
  { value: 'name_asc', label: 'По названию' },
]

export default async function SegmentsPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  // Активный продукт (фаза 5 редизайна 2.1) — список показывает только его.

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const segments = await prisma.segment.findMany({
    where: { userId: getCurrentUserId(), ...activeProductFilter(activeProductId) },
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading
          level={1}
          title="Сегменты"
          description={moduleByHref['/segments'].description}
        />
        <div className="flex flex-wrap gap-2">
          <Link href="/reports/segments-jtbd" className={buttonVariants({ variant: 'outline' })}>
            Матрица Сегменты × JTBD
          </Link>
          <QuickAddButton
            type="segment"
            href="/segments/new"
            label="Быстро добавить сегмент, не уходя со страницы"
          />
          <Link href="/segments/new?from=/segments" className={buttonVariants()}>
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
        <EmptyState moduleKey="/segments" />
      ) : (
        <ul className="divide-y rounded-md border">
          {segments.map((segment) => (
            <li key={segment.id}>
              <Link
                href={`/segments/${segment.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="min-w-0 flex-1 font-medium">{segment.name}</span>
                <span className="shrink-0 text-muted-foreground">{segment.product.name}</span>
                {segment.audienceShare != null && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {segment.audienceShare}% аудитории
                  </span>
                )}
                <TagBadges tags={segment.tags} />
                <PinButton
                  pinned={segment.pinned}
                  action={toggleSegmentPinned.bind(null, segment.id, !segment.pinned)}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
