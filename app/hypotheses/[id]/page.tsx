import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import {
  deleteHypothesis,
  toggleHypothesisPinned,
  updateHypothesisField,
  updateHypothesisStatus,
} from '@/lib/actions/hypotheses'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { SubmitButton } from '@/components/shared/submit-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { SignalBadge } from '@/components/shared/signal-badge'
import { JobTypeDot } from '@/components/shared/job-type-dot'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { ChainRibbon } from '@/components/shared/chain-ribbon'
import { hypothesisStatusLabels, hypothesisStatusOrder, hypothesisStatusTone } from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'

export const dynamic = 'force-dynamic'

export default async function HypothesisDetailPage({ params }: { params: { id: string } }) {
  const hypothesis = await prisma.hypothesis.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      product: true,
      // The job carries the rest of the chain for the ribbon: which segments
      // it serves and which features (and their marketing claims) rest on it.
      jtbd: { include: { segments: true, features: { include: { rtbs: true } } } },
      segment: true,
      research: true,
      statusChanges: { orderBy: { changedAt: 'desc' } },
    },
  })

  if (!hypothesis) notFound()

  // A hypothesis can name a segment directly or inherit it from its job —
  // the ribbon shows whichever is available, direct link first.
  const chainSegments = hypothesis.segment
    ? [hypothesis.segment]
    : (hypothesis.jtbd?.segments ?? [])
  const chainFeatures = hypothesis.jtbd?.features ?? []
  const chainRtbs = Array.from(
    new Map(chainFeatures.flatMap((f) => f.rtbs).map((rtb) => [rtb.id, rtb])).values()
  )

  const deleteHypothesisWithId = deleteHypothesis.bind(null, hypothesis.id)
  const toggleHypothesisPinnedWithId = toggleHypothesisPinned.bind(
    null,
    hypothesis.id,
    !hypothesis.pinned
  )

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker
        href={`/hypotheses/${hypothesis.id}`}
        title={hypothesis.statement}
        kind="Гипотеза"
      />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={hypothesis.statement}
              type="textarea"
              action={updateHypothesisField.bind(null, hypothesis.id, 'statement')}
            />
          </h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={hypothesis.pinned} action={toggleHypothesisPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/hypotheses/new?productId=${hypothesis.product.id}&duplicateFrom=${hypothesis.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/hypotheses/${hypothesis.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteHypothesisWithId}
              impact={{ model: 'hypothesis', id: hypothesis.id }}
              name={hypothesis.statement}
            />
          </div>
        </div>
        <div className="mb-4">
          <ChainRibbon
            stages={[
              {
                title: 'Сегмент',
                items: chainSegments.map((s) => ({ label: s.name, href: `/segments/${s.id}` })),
                emptyLabel: 'не привязан',
                addHref: `/hypotheses/${hypothesis.id}/edit`,
              },
              {
                title: 'JTBD',
                items: hypothesis.jtbd
                  ? [{ label: hypothesis.jtbd.title, href: `/jtbd/${hypothesis.jtbd.id}` }]
                  : [],
                emptyLabel: 'не привязан',
                addHref: `/hypotheses/${hypothesis.id}/edit`,
              },
              {
                title: 'Гипотеза',
                items: [{ label: hypothesis.statement, href: `/hypotheses/${hypothesis.id}` }],
                emptyLabel: '',
                current: true,
              },
              {
                title: 'Фича',
                items: chainFeatures.map((f) => ({ label: f.name, href: `/features/${f.id}` })),
                emptyLabel: 'ни одной',
                addHref: `/features/new?productId=${hypothesis.product.id}`,
              },
              {
                title: 'Маркетинг',
                items: chainRtbs.map((r) => ({ label: r.statement, href: `/marketing/${r.id}` })),
                emptyLabel: 'нет обещаний',
                addHref: `/marketing/new?productId=${hypothesis.product.id}`,
              },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SignalBadge tone={hypothesisStatusTone[hypothesis.status]}>
            {hypothesisStatusLabels[hypothesis.status]}
          </SignalBadge>
          <Link
            href={`/products/${hypothesis.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {hypothesis.product.name}
          </Link>
          {hypothesis.jtbd && (
            <Link
              href={`/jtbd/${hypothesis.jtbd.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
            >
              <JobTypeDot jobType={hypothesis.jtbd.jobType} />
              {hypothesis.jtbd.title}
            </Link>
          )}
          {hypothesis.segment && (
            <Link
              href={`/segments/${hypothesis.segment.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {hypothesis.segment.name}
            </Link>
          )}
          {hypothesis.research && (
            <Link
              href={`/research/${hypothesis.research.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              #{hypothesis.research.number} {hypothesis.research.title}
            </Link>
          )}
          <InlineEditableField
            value={hypothesis.priority != null ? String(hypothesis.priority) : ''}
            type="number"
            placeholder="+ добавить приоритет"
            action={updateHypothesisField.bind(null, hypothesis.id, 'priority')}
            prefix="Приоритет: "
            className="text-sm text-muted-foreground"
          />
        </div>
        <InlineEditableField
          value={hypothesis.tags.join(', ')}
          action={updateHypothesisField.bind(null, hypothesis.id, 'tags')}
          placeholder="+ добавить теги"
          display="tags"
        />
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">Статус</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {hypothesisStatusOrder.map((status) => {
              const setStatus = updateHypothesisStatus.bind(null, hypothesis.id, status)
              const isCurrent = status === hypothesis.status
              const tone = signalToneColors[hypothesisStatusTone[status]]
              return (
                <form key={status} action={setStatus}>
                  <SubmitButton
                    variant={isCurrent ? 'default' : 'outline'}
                    size="sm"
                    disabled={isCurrent}
                    pendingText="..."
                    style={
                      isCurrent
                        ? { backgroundColor: tone.border, borderColor: tone.border, color: '#fff' }
                        : undefined
                    }
                  >
                    {hypothesisStatusLabels[status]}
                  </SubmitButton>
                </form>
              )
            })}
          </div>
          {hypothesis.statusChanges.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                История статусов
              </h3>
              <ul className="space-y-1">
                {hypothesis.statusChanges.map((change) => (
                  <li key={change.id} className="text-sm text-muted-foreground">
                    {hypothesisStatusLabels[change.status]} —{' '}
                    {change.changedAt.toLocaleString('ru-RU')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
