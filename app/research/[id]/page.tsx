import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteResearch, toggleResearchPinned } from '@/lib/actions/research'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { Eyebrow } from '@/components/shared/eyebrow'
import { statusLabels, typeLabels } from '@/lib/labels'
import { isStale } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ResearchDetailPage({ params }: { params: { id: string } }) {
  const research = await prisma.research.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true },
  })

  if (!research) notFound()

  const deleteResearchWithId = deleteResearch.bind(null, research.id)
  const toggleResearchPinnedWithId = toggleResearchPinned.bind(null, research.id, !research.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker
        href={`/research/${research.id}`}
        title={`#${research.number} ${research.title}`}
        kind="Исследование"
      />
      <div>
        <Eyebrow number={research.number} label="Исследование" className="mb-1" />
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{research.title}</h1>
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
            <DeleteButton action={deleteResearchWithId} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant={research.status === 'COMPLETED' ? 'default' : 'secondary'}>
            {statusLabels[research.status]}
          </Badge>
          <Badge variant="outline">{typeLabels[research.type]}</Badge>
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
          <span className="text-sm text-muted-foreground">
            {research.date.toLocaleDateString('ru-RU')}
          </span>
        </div>
        {research.tags.length > 0 && (
          <div className="mb-4">
            <TagBadges tags={research.tags} />
          </div>
        )}
        {research.description && <p className="text-muted-foreground">{research.description}</p>}
      </div>
    </main>
  )
}
