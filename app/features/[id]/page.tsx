import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { deleteFeature, toggleFeaturePinned, updateFeatureField } from '@/lib/actions/features'
import { buttonVariants } from '@/components/ui/button'
import { JobTypeDot } from '@/components/shared/job-type-dot'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { ChainRibbon } from '@/components/shared/chain-ribbon'
import { RecordPage, RecordSection } from '@/components/shared/record-page'
import { recordBlockers } from '@/lib/record-blockers'
import { jtbdKeyPhrase } from '@/lib/key-phrase'

export const dynamic = 'force-dynamic'

export default async function FeatureDetailPage({ params }: { params: { id: string } }) {
  const feature = await prisma.feature.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    // Segments come one join past the jobs, for the chain ribbon's first slot.
    include: {
      product: true,
      jtbds: { include: { segments: true } },
      rtbs: true,
      // Гипотезы не показываются секцией — из них считается условие блока
      // «Что мешает». На ленте цепочки этого звена нет, поэтому здесь оно не
      // дублирует её, а добавляет то, чего в ней не видно.
      _count: { select: { hypotheses: true } },
    },
  })

  if (!feature) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const chainSegments = Array.from(
    new Map(feature.jtbds.flatMap((j) => j.segments).map((s) => [s.id, s])).values()
  )

  return (
    <RecordPage
      product={feature.product}
      activeProductId={activeProductId}
      href={`/features/${feature.id}`}
      moduleHref="/features"
      moduleLabel="Фичи"
      kind="Фича"
      plainTitle={feature.name}
      recordId={feature.id}
      deleteModel="feature"
      deleteAction={deleteFeature.bind(null, feature.id)}
      pinned={feature.pinned}
      togglePinned={toggleFeaturePinned.bind(null, feature.id, !feature.pinned)}
      duplicateHref={`/features/new?productId=${feature.product.id}&duplicateFrom=${feature.id}`}
      editHref={`/features/${feature.id}/edit`}
      title={
        <InlineEditableField
          value={feature.name}
          action={updateFeatureField.bind(null, feature.id, 'name')}
        />
      }
      ribbon={
        <ChainRibbon
          stages={[
            {
              title: 'Сегмент',
              items: chainSegments.map((s) => ({ label: s.name, href: `/segments/${s.id}` })),
              emptyLabel: 'через JTBD не виден',
              addHref: `/features/${feature.id}/edit`,
            },
            {
              title: 'JTBD',
              items: feature.jtbds.map((j) => ({
                label: jtbdKeyPhrase(j.title),
                fullLabel: j.title,
                href: `/jtbd/${j.id}`,
              })),
              emptyLabel: 'ни одного',
              gap: { kind: 'feature-jtbd', anchorId: feature.id, productId: feature.product.id },
            },
            {
              title: 'Фича',
              items: [{ label: feature.name, href: `/features/${feature.id}` }],
              emptyLabel: '',
              current: true,
            },
            {
              title: 'Маркетинг',
              items: feature.rtbs.map((r) => ({
                label: r.statement,
                href: `/marketing/${r.id}`,
              })),
              emptyLabel: 'нет обещаний',
              gap: { kind: 'feature-rtb', anchorId: feature.id, productId: feature.product.id },
            },
          ]}
        />
      }
      description={
        <InlineEditableField
          value={feature.description ?? ''}
          type="textarea"
          placeholder="+ добавить описание"
          action={updateFeatureField.bind(null, feature.id, 'description')}
        />
      }
      blockers={recordBlockers({
        kind: 'feature',
        id: feature.id,
        productId: feature.productId,
        hypothesisCount: feature._count.hypotheses,
      })}
    >
      <RecordSection
        title="JTBD, которые закрывает"
        count={feature.jtbds.length}
        empty="Ни одной задачи не привязано."
      >
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
      </RecordSection>

      <RecordSection
        title="Обещания на основе этой фичи"
        count={feature.rtbs.length}
        empty={
          /* Derive, don't demand (C4): a feature nothing in marketing leans on
             is a real gap in the positioning chain, so it says what is missing
             and offers the action instead of a flat "Пока нет RTB." Phrased as
             an observation, not an error — a feature can legitimately ship
             before its marketing claim exists. */
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              На эту фичу не опирается ни одно маркетинговое обещание — её нечем продавать.
            </p>
            <Link
              href={`/marketing/new?productId=${feature.productId}&featureId=${feature.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Сформулировать обещание
            </Link>
          </div>
        }
      >
        <ul className="space-y-2">
          {feature.rtbs.map((r) => (
            <li key={r.id}>
              <Link href={`/marketing/${r.id}`} className="text-sm hover:underline">
                {r.statement}
              </Link>
            </li>
          ))}
        </ul>
      </RecordSection>
    </RecordPage>
  )
}
