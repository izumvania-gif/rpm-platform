import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteCompetitor, toggleCompetitorPinned } from '@/lib/actions/competitors'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'

export const dynamic = 'force-dynamic'

export default async function CompetitorDetailPage({ params }: { params: { id: string } }) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true },
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
      </div>
    </main>
  )
}
