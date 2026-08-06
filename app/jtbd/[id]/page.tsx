import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteJtbd, toggleJtbdPinned } from '@/lib/actions/jtbd'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { isStale } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function JtbdDetailPage({ params }: { params: { id: string } }) {
  const jtbd = await prisma.jTBD.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, segment: true, research: true, hypotheses: true },
  })

  if (!jtbd) notFound()

  const deleteJtbdWithId = deleteJtbd.bind(null, jtbd.id)
  const toggleJtbdPinnedWithId = toggleJtbdPinned.bind(null, jtbd.id, !jtbd.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker href={`/jtbd/${jtbd.id}`} title={jtbd.title} kind="JTBD" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{jtbd.title}</h1>
          <div className="flex gap-2">
            <PinButton pinned={jtbd.pinned} action={toggleJtbdPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/jtbd/new?productId=${jtbd.product.id}&duplicateFrom=${jtbd.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link href={`/jtbd/${jtbd.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              Редактировать
            </Link>
            <DeleteButton action={deleteJtbdWithId} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline">{jtbd.category}</Badge>
          {jtbd.confirmed && <Badge variant="secondary">Подтверждён</Badge>}
          {isStale(jtbd.updatedAt) && (
            <Badge variant="outline" className="text-muted-foreground">
              Давно не проверялось
            </Badge>
          )}
          <Link
            href={`/products/${jtbd.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {jtbd.product.name}
          </Link>
          {jtbd.segment && (
            <Link
              href={`/segments/${jtbd.segment.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {jtbd.segment.name}
            </Link>
          )}
          {jtbd.research && (
            <Link
              href={`/research/${jtbd.research.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              #{jtbd.research.number} {jtbd.research.title}
            </Link>
          )}
        </div>
        {jtbd.tags.length > 0 && (
          <div className="mb-4">
            <TagBadges tags={jtbd.tags} />
          </div>
        )}
        {jtbd.description && <p className="text-muted-foreground">{jtbd.description}</p>}
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Гипотезы ({jtbd.hypotheses.length})</h2>
          <Link
            href={`/hypotheses/new?productId=${jtbd.product.id}&jtbdId=${jtbd.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить гипотезу
          </Link>
        </div>
        {jtbd.hypotheses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет гипотез.</p>
        ) : (
          <ul className="space-y-2">
            {jtbd.hypotheses.map((h) => (
              <li key={h.id}>
                <Link href={`/hypotheses/${h.id}`} className="text-sm hover:underline">
                  {h.statement}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
