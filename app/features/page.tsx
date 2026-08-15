import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { SectionHeading } from '@/components/shared/section-heading'
import { FeatureFilterForm } from '@/components/forms/feature-filter-form'
import { toggleFeaturePinned } from '@/lib/actions/features'
import { moduleByHref } from '@/lib/module-meta'
import { QuickAddButton } from '@/components/shared/quick-add-button'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Сначала новые' },
  { value: 'name_asc', label: 'По названию' },
]

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: { sort?: string; jtbdId?: string; segmentId?: string }
}) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'
  const userId = getCurrentUserId()

  const [features, jtbds, segments] = await Promise.all([
    prisma.feature.findMany({
      where: {
        userId,
        ...(searchParams.jtbdId ? { jtbds: { some: { id: searchParams.jtbdId } } } : {}),
        ...(searchParams.segmentId
          ? { jtbds: { some: { segments: { some: { id: searchParams.segmentId } } } } }
          : {}),
      },
      orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
      include: { product: true, jtbds: true, rtbs: true },
    }),
    prisma.jTBD.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { title: 'asc' },
    }),
    prisma.segment.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const byProduct = new Map<string, { name: string; items: typeof features }>()
  for (const feature of features) {
    if (!byProduct.has(feature.productId)) {
      byProduct.set(feature.productId, { name: feature.product.name, items: [] })
    }
    byProduct.get(feature.productId)!.items.push(feature)
  }
  const groups = Array.from(byProduct.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading
          level={1}
          title="Фичи"
          description={moduleByHref['/features'].description}
        />
        <QuickAddButton
          type="feature"
          href="/features/new"
          label="Быстро добавить фичу, не уходя со страницы"
        />
        <Link href="/features/new?from=/features" className={buttonVariants()}>
          Новая фича
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <FeatureFilterForm
          jtbdOptions={jtbds.map((j) => ({
            id: j.id,
            label: `${j.product.name} — ${truncate(j.title, 50)}`,
          }))}
          segmentOptions={segments.map((s) => ({
            id: s.id,
            label: `${s.product.name} — ${s.name}`,
          }))}
          jtbdId={searchParams.jtbdId}
          segmentId={searchParams.segmentId}
          sort={sort}
          sortOptions={SORT_OPTIONS}
        />
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

      {features.length > 0 && (
        <p className="text-sm text-muted-foreground mb-6">
          {groups.length} {groups.length === 1 ? 'продукт' : 'продуктов'} · {features.length}{' '}
          записей
        </p>
      )}

      {features.length === 0 ? (
        <p className="text-muted-foreground">
          {searchParams.jtbdId || searchParams.segmentId
            ? 'Ничего не найдено по выбранным фильтрам.'
            : 'Фич пока нет.'}
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="text-lg font-semibold mb-3">
                {group.name}{' '}
                <span className="text-muted-foreground font-normal">({group.items.length})</span>
              </h2>
              <ul className="divide-y rounded-md border">
                {group.items.map((feature) => (
                  <li key={feature.id}>
                    <Link
                      href={`/features/${feature.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1 font-medium">{feature.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {feature.jtbds.length} JTBD · {feature.rtbs.length} RTB
                      </span>
                      <PinButton
                        pinned={feature.pinned}
                        action={toggleFeaturePinned.bind(null, feature.id, !feature.pinned)}
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
