import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteCompetitor, toggleCompetitorPinned } from '@/lib/actions/competitors'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { CompetitorNewsList } from '@/components/shared/competitor-news-list'

export const dynamic = 'force-dynamic'

export default async function CompetitorDetailPage({ params }: { params: { id: string } }) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, newsItems: { orderBy: { date: 'desc' } } },
  })

  if (!competitor) notFound()

  const deleteCompetitorWithId = deleteCompetitor.bind(null, competitor.id)
  const toggleCompetitorPinnedWithId = toggleCompetitorPinned.bind(
    null,
    competitor.id,
    !competitor.pinned
  )

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker
        href={`/competitors/${competitor.id}`}
        title={competitor.name}
        kind="Конкурент"
      />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{competitor.name}</h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={competitor.pinned} action={toggleCompetitorPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/competitors/new?productId=${competitor.product.id}&duplicateFrom=${competitor.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/competitors/${competitor.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteCompetitorWithId} />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <Link href={`/products/${competitor.product.id}`} className="hover:underline">
            {competitor.product.name}
          </Link>
          {competitor.url && (
            <a href={competitor.url} target="_blank" rel="noreferrer" className="hover:underline">
              {competitor.url}
            </a>
          )}
        </div>
        {competitor.features.length > 0 && (
          <div className="mb-4">
            <TagBadges tags={competitor.features} />
          </div>
        )}
        {competitor.positioning && (
          <p className="text-muted-foreground">{competitor.positioning}</p>
        )}
        {(competitor.pricingModel || competitor.companySize || competitor.lastCheckedAt) && (
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {competitor.pricingModel && (
              <div>
                <dt className="text-xs text-muted-foreground">Модель ценообразования</dt>
                <dd>{competitor.pricingModel}</dd>
              </div>
            )}
            {competitor.companySize && (
              <div>
                <dt className="text-xs text-muted-foreground">Размер компании / стадия</dt>
                <dd>{competitor.companySize}</dd>
              </div>
            )}
            {competitor.lastCheckedAt && (
              <div>
                <dt className="text-xs text-muted-foreground">Последняя проверка</dt>
                <dd>{competitor.lastCheckedAt.toLocaleDateString('ru-RU')}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Новости и наблюдения{' '}
            <span className="font-normal text-muted-foreground">
              ({competitor.newsItems.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompetitorNewsList competitorId={competitor.id} initialItems={competitor.newsItems} />
        </CardContent>
      </Card>
    </main>
  )
}
