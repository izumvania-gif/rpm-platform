import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { JobTypeBadge } from '@/components/shared/job-type-badge'
import { TagBadges } from '@/components/shared/tag-badges'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleJtbdPinned } from '@/lib/actions/jtbd'
import { jtbdJobTypeLabels } from '@/lib/jtbd-job-types'
import { JtbdViewTabs } from '@/components/shared/jtbd-view-tabs'
import { moduleByHref } from '@/lib/module-meta'
import { coveragePercent } from '@/lib/dashboard-metrics'

export const dynamic = 'force-dynamic'

export default async function JtbdPage() {
  const jtbds = await prisma.jTBD.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  })

  const confirmedCount = jtbds.filter((j) => j.confirmed).length
  const coverage = coveragePercent(confirmedCount, jtbds.length)

  const byCategory = new Map<string, typeof jtbds>()
  for (const jtbd of jtbds) {
    const list = byCategory.get(jtbd.category) ?? []
    list.push(jtbd)
    byCategory.set(jtbd.category, list)
  }

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <SectionHeading title="JTBD" description={moduleByHref['/jtbd'].description} />
        <div className="flex flex-wrap items-center gap-2">
          <JtbdViewTabs active="list" />
          <Link href="/jtbd/new" className={buttonVariants()}>
            Новый JTBD
          </Link>
        </div>
      </div>

      {jtbds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
          <p className="text-sm text-muted-foreground">
            {byCategory.size} {byCategory.size === 1 ? 'категория' : 'категорий'} · {jtbds.length}{' '}
            записей · {coverage}% подтверждено исследованиями
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports/segments-jtbd"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Матрица Сегменты × JTBD
            </Link>
            <CsvExportButton
              filename="jtbd.csv"
              rows={jtbds.map((j) => ({
                category: j.category,
                jobType: jtbdJobTypeLabels[j.jobType],
                title: j.title,
                product: j.product.name,
                confirmed: j.confirmed ? 'да' : 'нет',
                tags: j.tags.join('; '),
              }))}
            />
          </div>
        </div>
      )}

      {jtbds.length === 0 ? (
        <p className="text-muted-foreground">JTBD пока нет.</p>
      ) : (
        <div className="space-y-8">
          {Array.from(byCategory.entries()).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold mb-3">
                {category}{' '}
                <span className="text-muted-foreground font-normal">({items.length})</span>
              </h2>
              <ul className="space-y-2">
                {items.map((jtbd) => (
                  <li
                    key={jtbd.id}
                    className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <Link href={`/jtbd/${jtbd.id}`} className="hover:underline">
                        {jtbd.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{jtbd.product.name}</p>
                      {jtbd.tags.length > 0 && (
                        <div className="mt-1">
                          <TagBadges tags={jtbd.tags} />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <JobTypeBadge jobType={jtbd.jobType} />
                      {jtbd.confirmed && <Badge variant="secondary">Подтверждён</Badge>}
                      <PinButton
                        pinned={jtbd.pinned}
                        action={toggleJtbdPinned.bind(null, jtbd.id, !jtbd.pinned)}
                      />
                    </div>
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
