import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteFeature, toggleFeaturePinned } from '@/lib/actions/features'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'

export const dynamic = 'force-dynamic'

export default async function FeatureDetailPage({ params }: { params: { id: string } }) {
  const feature = await prisma.feature.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, jtbds: true, rtbs: true },
  })

  if (!feature) notFound()

  const deleteFeatureWithId = deleteFeature.bind(null, feature.id)
  const toggleFeaturePinnedWithId = toggleFeaturePinned.bind(null, feature.id, !feature.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker href={`/features/${feature.id}`} title={feature.name} kind="Фича" />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{feature.name}</h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={feature.pinned} action={toggleFeaturePinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/features/new?productId=${feature.product.id}&duplicateFrom=${feature.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/features/${feature.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteFeatureWithId} />
          </div>
        </div>
        <Link
          href={`/products/${feature.product.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {feature.product.name}
        </Link>
        {feature.description && <p className="text-muted-foreground mt-4">{feature.description}</p>}
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            JTBD, которые закрывает{' '}
            <span className="font-normal text-muted-foreground">({feature.jtbds.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feature.jtbds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока не привязано ни одного JTBD.</p>
          ) : (
            <ul className="space-y-2">
              {feature.jtbds.map((j) => (
                <li key={j.id}>
                  <Link href={`/jtbd/${j.id}`} className="text-sm hover:underline">
                    {j.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            RTB на основе этой фичи{' '}
            <span className="font-normal text-muted-foreground">({feature.rtbs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feature.rtbs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет RTB.</p>
          ) : (
            <ul className="space-y-2">
              {feature.rtbs.map((r) => (
                <li key={r.id}>
                  <Link href={`/marketing/${r.id}`} className="text-sm hover:underline">
                    {r.statement}
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
