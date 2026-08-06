import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteSegment, toggleSegmentPinned } from '@/lib/actions/segments'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'

export const dynamic = 'force-dynamic'

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const segment = await prisma.segment.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true },
  })

  if (!segment) notFound()

  const deleteSegmentWithId = deleteSegment.bind(null, segment.id)
  const toggleSegmentPinnedWithId = toggleSegmentPinned.bind(null, segment.id, !segment.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker href={`/segments/${segment.id}`} title={segment.name} kind="Сегмент" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <h1 className="text-2xl font-bold">{segment.name}</h1>
          </div>
          <div className="flex gap-2">
            <PinButton pinned={segment.pinned} action={toggleSegmentPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/segments/new?productId=${segment.product.id}&duplicateFrom=${segment.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/segments/${segment.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteSegmentWithId} />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <Link href={`/products/${segment.product.id}`} className="hover:underline">
            {segment.product.name}
          </Link>
          <span>{segment.slug}</span>
          {segment.audienceShare != null && <span>{segment.audienceShare}% аудитории</span>}
        </div>
        {segment.tags.length > 0 && (
          <div className="mb-4">
            <TagBadges tags={segment.tags} />
          </div>
        )}
        {segment.description && <p className="text-muted-foreground">{segment.description}</p>}
      </div>
    </main>
  )
}
