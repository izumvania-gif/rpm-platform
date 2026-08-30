import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { activeProductFilter } from '@/lib/product-context'
import { buttonVariants } from '@/components/ui/button'
import { TagBadges } from '@/components/shared/tag-badges'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { SectionHeading } from '@/components/shared/section-heading'
import { toggleConversationPinned } from '@/lib/actions/conversations'
import { moduleByHref } from '@/lib/module-meta'
import { EmptyState } from '@/components/shared/empty-state'
import { KnowledgeTabs } from '@/components/knowledge/knowledge-tabs'
import { LinkBadge } from '@/components/knowledge/link-badge'
import { conversationLinkBadge } from '@/lib/knowledge-links'

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

  // Активный продукт (фаза 5 редизайна 2.1) — список показывает только его.

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const conversations = await prisma.conversation.findMany({
    where: { userId: getCurrentUserId(), ...activeProductFilter(activeProductId) },
    orderBy,
    // Сколько инсайтов извлечено — для бейджа в строке (фаза 11).
    include: { product: true, _count: { select: { insights: true } } },
  })

  return (
    <main className="container py-12">
      <KnowledgeTabs />
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading
          level={1}
          title="Разговоры"
          description={moduleByHref['/conversations'].description}
        />
        <Link href="/conversations/new?from=/conversations" className={buttonVariants()}>
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
        <EmptyState moduleKey="/conversations" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4">Название</th>
                <th className="py-2 pr-4">Продукт</th>
                <th className="py-2 pr-4">Связи</th>
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
                    <LinkBadge badge={conversationLinkBadge(c._count.insights)} />
                  </td>
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
