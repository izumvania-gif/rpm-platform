import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { FeatureFilterForm } from '@/components/forms/feature-filter-form'

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
          ? { jtbds: { some: { segmentId: searchParams.segmentId } } }
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

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">Фичи</h1>
        <Link href="/features/new" className={buttonVariants()}>
          Новая фича
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
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

      {features.length === 0 ? (
        <p className="text-muted-foreground">
          {searchParams.jtbdId || searchParams.segmentId
            ? 'Ничего не найдено по выбранным фильтрам.'
            : 'Фич пока нет.'}
        </p>
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
