import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleRTBPinned } from '@/lib/actions/rtbs'
import { moduleByHref } from '@/lib/module-meta'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [{ value: 'created_desc', label: 'Сначала новые' }]

export default async function MarketingPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const rtbs = await prisma.rTB.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { createdAt: 'desc' },
    include: { product: true, features: true },
  })

  const byProduct = new Map<string, { name: string; items: typeof rtbs }>()
  for (const rtb of rtbs) {
    if (!byProduct.has(rtb.productId))
      byProduct.set(rtb.productId, { name: rtb.product.name, items: [] })
    byProduct.get(rtb.productId)!.items.push(rtb)
  }
  const groups = Array.from(byProduct.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <SectionHeading title="Маркетинг" description={moduleByHref['/marketing'].description} />
        <Link href="/marketing/new" className={buttonVariants()}>
          Новый RTB
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        RTB (Reasons To Believe) — маркетинговые обещания, опирающиеся на фичи продукта.
      </p>

      {rtbs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <form method="get">
              <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
            </form>
            <p className="text-sm text-muted-foreground">
              {groups.length} {groups.length === 1 ? 'продукт' : 'продуктов'} · {rtbs.length}{' '}
              записей
            </p>
          </div>
          <CsvExportButton
            filename="marketing.csv"
            rows={rtbs.map((r) => ({
              statement: r.statement,
              product: r.product.name,
              features: r.features.length,
            }))}
          />
        </div>
      )}

      {rtbs.length === 0 ? (
        <p className="text-muted-foreground">RTB пока нет.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="text-lg font-semibold mb-3">
                {group.name}{' '}
                <span className="text-muted-foreground font-normal">({group.items.length})</span>
              </h2>
              <ul className="divide-y rounded-md border">
                {group.items.map((rtb) => (
                  <li key={rtb.id}>
                    <Link
                      href={`/marketing/${rtb.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1 truncate">{rtb.statement}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {rtb.features.length} фич
                      </span>
                      <PinButton
                        pinned={rtb.pinned}
                        action={toggleRTBPinned.bind(null, rtb.id, !rtb.pinned)}
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
