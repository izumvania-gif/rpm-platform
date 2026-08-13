import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteFeature, toggleFeaturePinned, updateFeatureField } from '@/lib/actions/features'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { JobTypeDot } from '@/components/shared/job-type-dot'
import { InlineEditableField } from '@/components/shared/inline-editable-field'

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
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={feature.name}
              action={updateFeatureField.bind(null, feature.id, 'name')}
            />
          </h1>
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
        <p className="text-muted-foreground mt-4">
          <InlineEditableField
            value={feature.description ?? ''}
            type="textarea"
            action={updateFeatureField.bind(null, feature.id, 'description')}
          />
        </p>
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
                  <Link
                    href={`/jtbd/${j.id}`}
                    className="inline-flex items-center gap-1.5 text-sm hover:underline"
                  >
                    <JobTypeDot jobType={j.jobType} />
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
            /* Derive, don't demand (C4): a feature nothing in marketing leans
               on is a real gap in the positioning chain, so it says what is
               missing and offers the action instead of a flat "Пока нет RTB."
               Phrased as an observation, not an error — a feature can legitimately
               ship before its marketing claim exists. */
            <div className="space-y-2">
              <p className="text-sm">
                На эту фичу не опирается ни одно маркетинговое обещание — её нечем продавать.
              </p>
              <Link
                href={`/marketing/new?productId=${feature.productId}&featureId=${feature.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Сформулировать обещание
              </Link>
            </div>
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
