import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import {
  deleteCompetitor,
  toggleCompetitorPinned,
  updateCompetitorField,
} from '@/lib/actions/competitors'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { CompetitorNewsList } from '@/components/shared/competitor-news-list'
import { InlineEditableField } from '@/components/shared/inline-editable-field'

export const dynamic = 'force-dynamic'

export default async function CompetitorDetailPage({ params }: { params: { id: string } }) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, newsItems: { orderBy: { date: 'desc' } } },
  })

  if (!competitor) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const deleteCompetitorWithId = deleteCompetitor.bind(null, competitor.id)
  const toggleCompetitorPinnedWithId = toggleCompetitorPinned.bind(
    null,
    competitor.id,
    !competitor.pinned
  )

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={competitor.product}
        redirectTo={`/competitors/${competitor.id}`}
      />
      <RecentlyViewedTracker
        href={`/competitors/${competitor.id}`}
        title={competitor.name}
        kind="Конкурент"
      />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={competitor.name}
              action={updateCompetitorField.bind(null, competitor.id, 'name')}
            />
          </h1>
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
            <DeleteButton
              action={deleteCompetitorWithId}
              impact={{ model: 'competitor', id: competitor.id }}
              name={competitor.name}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <Link href={`/products/${competitor.product.id}`} className="hover:underline">
            {competitor.product.name}
          </Link>
          <InlineEditableField
            value={competitor.url ?? ''}
            placeholder="+ добавить сайт"
            action={updateCompetitorField.bind(null, competitor.id, 'url')}
            display="link"
          />
        </div>
        <div className="mb-4">
          <InlineEditableField
            value={competitor.features.join(', ')}
            action={updateCompetitorField.bind(null, competitor.id, 'features')}
            placeholder="+ добавить фичи конкурента"
            display="tags"
          />
        </div>
        <p className="text-muted-foreground">
          <InlineEditableField
            value={competitor.positioning ?? ''}
            type="textarea"
            action={updateCompetitorField.bind(null, competitor.id, 'positioning')}
          />
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Модель ценообразования</dt>
            <dd>
              <InlineEditableField
                value={competitor.pricingModel ?? ''}
                action={updateCompetitorField.bind(null, competitor.id, 'pricingModel')}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Размер компании / стадия</dt>
            <dd>
              <InlineEditableField
                value={competitor.companySize ?? ''}
                action={updateCompetitorField.bind(null, competitor.id, 'companySize')}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Последняя проверка</dt>
            <dd>
              <InlineEditableField
                value={
                  competitor.lastCheckedAt
                    ? competitor.lastCheckedAt.toISOString().slice(0, 10)
                    : ''
                }
                type="date"
                action={updateCompetitorField.bind(null, competitor.id, 'lastCheckedAt')}
                display="date"
              />
            </dd>
          </div>
        </dl>
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
