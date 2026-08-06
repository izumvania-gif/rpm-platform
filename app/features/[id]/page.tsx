import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteFeature } from '@/lib/actions/features'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
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

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker href={`/features/${feature.id}`} title={feature.name} kind="Фича" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{feature.name}</h1>
          <div className="flex gap-2">
            <CopyLinkButton />
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

      <section>
        <h2 className="text-lg font-semibold mb-3">
          JTBD, которые закрывает ({feature.jtbds.length})
        </h2>
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
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          RTB на основе этой фичи ({feature.rtbs.length})
        </h2>
        {feature.rtbs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет RTB.</p>
        ) : (
          <ul className="space-y-2">
            {feature.rtbs.map((r) => (
              <li key={r.id}>
                <Link href={`/rtb/${r.id}`} className="text-sm hover:underline">
                  {r.statement}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
