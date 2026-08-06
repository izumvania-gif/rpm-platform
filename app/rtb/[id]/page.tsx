import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteRTB, toggleRTBPinned } from '@/lib/actions/rtbs'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'

export const dynamic = 'force-dynamic'

export default async function RTBDetailPage({ params }: { params: { id: string } }) {
  const rtb = await prisma.rTB.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, features: true },
  })

  if (!rtb) notFound()

  const deleteRTBWithId = deleteRTB.bind(null, rtb.id)
  const toggleRTBPinnedWithId = toggleRTBPinned.bind(null, rtb.id, !rtb.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker href={`/rtb/${rtb.id}`} title={rtb.statement} kind="RTB" />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{rtb.statement}</h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={rtb.pinned} action={toggleRTBPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/rtb/new?productId=${rtb.product.id}&duplicateFrom=${rtb.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link href={`/rtb/${rtb.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              Редактировать
            </Link>
            <DeleteButton action={deleteRTBWithId} />
          </div>
        </div>
        <Link
          href={`/products/${rtb.product.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {rtb.product.name}
        </Link>
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Фичи, на которых основано{' '}
            <span className="font-normal text-muted-foreground">({rtb.features.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rtb.features.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока не привязано ни одной фичи.</p>
          ) : (
            <ul className="space-y-2">
              {rtb.features.map((f) => (
                <li key={f.id}>
                  <Link href={`/features/${f.id}`} className="text-sm hover:underline">
                    {f.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
