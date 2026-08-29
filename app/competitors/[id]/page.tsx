import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import {
  deleteCompetitor,
  toggleCompetitorPinned,
  updateCompetitorField,
} from '@/lib/actions/competitors'
import { CompetitorNewsList } from '@/components/shared/competitor-news-list'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { RecordPage } from '@/components/shared/record-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { recordBlockers } from '@/lib/record-blockers'

export const dynamic = 'force-dynamic'

export default async function CompetitorDetailPage({ params }: { params: { id: string } }) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, newsItems: { orderBy: { date: 'desc' } } },
  })

  if (!competitor) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  return (
    // Конкурент — не звено цепочки, поэтому без ленты связей. Всё остальное
    // общее с сегментом, JTBD, фичей и обещанием: крошки, шапка, ключевые
    // поля, «Что мешает», секции связанных записей.
    <RecordPage
      product={competitor.product}
      activeProductId={activeProductId}
      href={`/competitors/${competitor.id}`}
      moduleHref="/competitors"
      moduleLabel="Конкуренты"
      kind="Конкурент"
      plainTitle={competitor.name}
      recordId={competitor.id}
      deleteModel="competitor"
      deleteAction={deleteCompetitor.bind(null, competitor.id)}
      pinned={competitor.pinned}
      togglePinned={toggleCompetitorPinned.bind(null, competitor.id, !competitor.pinned)}
      duplicateHref={`/competitors/new?productId=${competitor.product.id}&duplicateFrom=${competitor.id}`}
      editHref={`/competitors/${competitor.id}/edit`}
      title={
        <InlineEditableField
          value={competitor.name}
          action={updateCompetitorField.bind(null, competitor.id, 'name')}
        />
      }
      meta={
        <InlineEditableField
          value={competitor.url ?? ''}
          placeholder="+ добавить сайт"
          action={updateCompetitorField.bind(null, competitor.id, 'url')}
          display="link"
        />
      }
      tags={
        <span id="rival-features" className="block scroll-mt-24">
          <InlineEditableField
            value={competitor.features.join(', ')}
            action={updateCompetitorField.bind(null, competitor.id, 'features')}
            placeholder="+ добавить фичи конкурента"
            display="tags"
          />
        </span>
      }
      description={
        <span id="positioning" className="block scroll-mt-24">
          <InlineEditableField
            value={competitor.positioning ?? ''}
            type="textarea"
            placeholder="+ описать позиционирование"
            action={updateCompetitorField.bind(null, competitor.id, 'positioning')}
          />
        </span>
      }
      facts={[
        {
          label: 'Модель ценообразования',
          value: (
            <InlineEditableField
              value={competitor.pricingModel ?? ''}
              placeholder="+ указать модель"
              action={updateCompetitorField.bind(null, competitor.id, 'pricingModel')}
            />
          ),
        },
        {
          label: 'Размер компании / стадия',
          value: (
            <InlineEditableField
              value={competitor.companySize ?? ''}
              placeholder="+ указать размер"
              action={updateCompetitorField.bind(null, competitor.id, 'companySize')}
            />
          ),
        },
        {
          label: 'Последняя проверка',
          value: (
            <span id="last-checked" className="block scroll-mt-24">
              <InlineEditableField
                value={
                  competitor.lastCheckedAt
                    ? competitor.lastCheckedAt.toISOString().slice(0, 10)
                    : ''
                }
                type="date"
                placeholder="+ отметить проверку"
                action={updateCompetitorField.bind(null, competitor.id, 'lastCheckedAt')}
                display="date"
              />
            </span>
          ),
        },
      ]}
      blockers={recordBlockers({
        kind: 'competitor',
        id: competitor.id,
        productId: competitor.productId,
        hasPositioning: Boolean(competitor.positioning?.trim()),
        featureCount: competitor.features.length,
        lastCheckedAt: competitor.lastCheckedAt,
      })}
    >
      {/* Не RecordSection: лента новостей пополняется на месте и держит своё
          состояние, поэтому её «пусто» — это её собственная форма. */}
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
    </RecordPage>
  )
}
