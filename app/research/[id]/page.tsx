import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import { deleteResearch, toggleResearchPinned, updateResearchField } from '@/lib/actions/research'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { Eyebrow } from '@/components/shared/eyebrow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuickAddInsight } from '@/components/shared/quick-add-insight'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { statusLabels, typeLabels } from '@/lib/labels'
import { isStale } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ResearchDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const research = await prisma.research.findFirst({
    where: { id: params.id, userId },
    include: { product: true, insights: true },
  })

  if (!research) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const [segments, jtbds] = await Promise.all([
    prisma.segment.findMany({
      where: { productId: research.productId, userId },
      orderBy: { name: 'asc' },
    }),
    prisma.jTBD.findMany({
      where: { productId: research.productId, userId },
      orderBy: { title: 'asc' },
    }),
  ])

  const deleteResearchWithId = deleteResearch.bind(null, research.id)
  const toggleResearchPinnedWithId = toggleResearchPinned.bind(null, research.id, !research.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={research.product}
        redirectTo={`/research/${research.id}`}
      />
      <RecentlyViewedTracker
        href={`/research/${research.id}`}
        title={`#${research.number} ${research.title}`}
        kind="Исследование"
      />
      <div>
        <Eyebrow number={research.number} label="Исследование" className="mb-1" />
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={research.title}
              action={updateResearchField.bind(null, research.id, 'title')}
            />
          </h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={research.pinned} action={toggleResearchPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/research/new?productId=${research.product.id}&duplicateFrom=${research.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/research/${research.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteResearchWithId}
              impact={{ model: 'research', id: research.id }}
              name={research.title}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <InlineEditableField
            value={research.status}
            type="select"
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            action={updateResearchField.bind(null, research.id, 'status')}
            display="badge"
            labels={statusLabels}
            badgeVariant={{ IN_PROGRESS: 'secondary', COMPLETED: 'default' }}
          />
          <InlineEditableField
            value={research.type}
            type="select"
            options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
            action={updateResearchField.bind(null, research.id, 'type')}
            display="badge"
            labels={typeLabels}
            badgeVariant="outline"
          />
          {isStale(research.updatedAt) && (
            <Badge variant="outline" className="text-muted-foreground">
              Давно не обновлялось
            </Badge>
          )}
          <Link
            href={`/products/${research.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {research.product.name}
          </Link>
          <InlineEditableField
            value={research.date.toISOString().slice(0, 10)}
            type="date"
            action={updateResearchField.bind(null, research.id, 'date')}
            display="date"
            className="text-sm text-muted-foreground"
          />
        </div>
        <div className="mb-4">
          <InlineEditableField
            value={research.tags.join(', ')}
            action={updateResearchField.bind(null, research.id, 'tags')}
            placeholder="+ добавить теги"
            display="tags"
          />
        </div>
        <p className="text-muted-foreground">
          <InlineEditableField
            value={research.description ?? ''}
            type="textarea"
            action={updateResearchField.bind(null, research.id, 'description')}
          />
        </p>
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Инсайты{' '}
            <span className="font-normal text-muted-foreground">({research.insights.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAddInsight
            productId={research.productId}
            researchId={research.id}
            segments={segments}
            jtbds={jtbds}
            initialInsights={research.insights}
          />
        </CardContent>
      </Card>
    </main>
  )
}
