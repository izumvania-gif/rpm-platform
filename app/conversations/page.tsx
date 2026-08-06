import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { TagBadges } from '@/components/shared/tag-badges'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { toggleConversationPinned } from '@/lib/actions/conversations'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'title_asc', label: 'По названию' },
]

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: { sort?: string }
}) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'date_desc'

  const orderBy =
    sort === 'date_asc'
      ? ({ date: 'asc' } as const)
      : sort === 'title_asc'
        ? ({ title: 'asc' } as const)
        : ({ date: 'desc' } as const)

  const conversations = await prisma.conversation.findMany({
    where: { userId: getCurrentUserId() },
    orderBy,
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">Разговоры</h1>
        <Link href="/conversations/new" className={buttonVariants()}>
          Новый разговор
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <form method="get">
          <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
        </form>
        <CsvExportButton
          filename="conversations.csv"
          rows={conversations.map((c) => ({
            title: c.title,
            product: c.product.name,
            date: c.date.toISOString().slice(0, 10),
            tags: c.tags.join('; '),
          }))}
        />
      </div>

      {conversations.length === 0 ? (
        <p className="text-muted-foreground">Разговоров пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4">Название</th>
                <th className="py-2 pr-4">Продукт</th>
                <th className="py-2 pr-4">Теги</th>
                <th className="py-2 pr-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className="border-b hover:bg-accent/50">
                  <td className="py-2 pr-4">
                    <PinButton
                      pinned={c.pinned}
                      action={toggleConversationPinned.bind(null, c.id, !c.pinned)}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Link href={`/conversations/${c.id}`} className="hover:underline">
                      {c.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{c.product.name}</td>
                  <td className="py-2 pr-4">
                    <TagBadges tags={c.tags} />
                  </td>
                  <td className="py-2 pr-4">{c.date.toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
