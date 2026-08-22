import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import { deleteInsight, toggleInsightPinned, updateInsightField } from '@/lib/actions/insights'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { JobTypeDot } from '@/components/shared/job-type-dot'
import { InlineEditableField } from '@/components/shared/inline-editable-field'

export const dynamic = 'force-dynamic'

export default async function InsightDetailPage({ params }: { params: { id: string } }) {
  const insight = await prisma.insight.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, segment: true, jtbd: true, research: true, conversation: true },
  })

  if (!insight) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const deleteInsightWithId = deleteInsight.bind(null, insight.id)
  const toggleInsightPinnedWithId = toggleInsightPinned.bind(null, insight.id, !insight.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={insight.product}
        redirectTo={`/insights/${insight.id}`}
      />
      <RecentlyViewedTracker href={`/insights/${insight.id}`} title={insight.text} kind="Инсайт" />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={insight.text}
              type="textarea"
              action={updateInsightField.bind(null, insight.id, 'text')}
            />
          </h1>
          <div className="flex flex-wrap gap-2 shrink-0">
            <PinButton pinned={insight.pinned} action={toggleInsightPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/insights/new?productId=${insight.product.id}&duplicateFrom=${insight.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/insights/${insight.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteInsightWithId}
              impact={{ model: 'insight', id: insight.id }}
              name={insight.text}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link
            href={`/products/${insight.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {insight.product.name}
          </Link>
          {insight.segment && (
            <Link
              href={`/segments/${insight.segment.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {insight.segment.name}
            </Link>
          )}
          {insight.jtbd && (
            <Link
              href={`/jtbd/${insight.jtbd.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
            >
              <JobTypeDot jobType={insight.jtbd.jobType} />
              {insight.jtbd.title}
            </Link>
          )}
          {insight.research && (
            <Link
              href={`/research/${insight.research.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              #{insight.research.number} {insight.research.title}
            </Link>
          )}
          {insight.conversation && (
            <Link
              href={`/conversations/${insight.conversation.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {insight.conversation.title}
            </Link>
          )}
        </div>
        <InlineEditableField
          value={insight.tags.join(', ')}
          action={updateInsightField.bind(null, insight.id, 'tags')}
          placeholder="+ добавить теги"
          display="tags"
        />
      </div>
    </main>
  )
}
