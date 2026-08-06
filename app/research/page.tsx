import Link from 'next/link'
import { ResearchStatus, ResearchType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { toggleResearchPinned } from '@/lib/actions/research'
import { statusLabels, typeLabels } from '@/lib/labels'
import { ResearchFilterForm } from '@/components/forms/research-filter-form'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'title_asc', label: 'По названию' },
]

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; sort?: string }
}) {
  const userId = getCurrentUserId()
  const status = Object.values(ResearchStatus).find((s) => s === searchParams.status)
  const type = Object.values(ResearchType).find((t) => t === searchParams.type)
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'date_desc'

  const orderBy =
    sort === 'date_asc'
      ? ({ date: 'asc' } as const)
      : sort === 'title_asc'
        ? ({ title: 'asc' } as const)
        : ({ date: 'desc' } as const)

  const researches = await prisma.research.findMany({
    where: { userId, ...(status ? { status } : {}), ...(type ? { type } : {}) },
    orderBy,
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">Исследования</h1>
        <Link href="/research/new" className={buttonVariants()}>
          Новое исследование
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <ResearchFilterForm status={status} type={type} sort={sort} sortOptions={SORT_OPTIONS} />
        <CsvExportButton
          filename="research.csv"
          rows={researches.map((r) => ({
            number: r.number,
            title: r.title,
            product: r.product.name,
            type: typeLabels[r.type],
            status: statusLabels[r.status],
            date: r.date.toISOString().slice(0, 10),
            tags: r.tags.join('; '),
          }))}
        />
      </div>

      {researches.length === 0 ? (
        <p className="text-muted-foreground">Исследований пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Название</th>
                <th className="py-2 pr-4">Продукт</th>
                <th className="py-2 pr-4">Тип</th>
                <th className="py-2 pr-4">Статус</th>
                <th className="py-2 pr-4">Теги</th>
                <th className="py-2 pr-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {researches.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/50">
                  <td className="py-2 pr-4">
                    <PinButton
                      pinned={r.pinned}
                      action={toggleResearchPinned.bind(null, r.id, !r.pinned)}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Link href={`/research/${r.id}`} className="hover:underline">
                      {r.number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <Link href={`/research/${r.id}`} className="hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{r.product.name}</td>
                  <td className="py-2 pr-4">{typeLabels[r.type]}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={r.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {statusLabels[r.status]}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <TagBadges tags={r.tags} />
                  </td>
                  <td className="py-2 pr-4">{r.date.toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
