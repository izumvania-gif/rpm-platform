import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import { deleteJtbd, toggleJtbdPinned, updateJtbdField } from '@/lib/actions/jtbd'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { ChainRibbon } from '@/components/shared/chain-ribbon'
import { jtbdJobTypeLabels, jtbdJobTypeOrder } from '@/lib/jtbd-job-types'
import { isStale } from '@/lib/utils'
import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

export const dynamic = 'force-dynamic'

export default async function JtbdDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { from?: string; productId?: string }
}) {
  const jtbd = await prisma.jTBD.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      product: true,
      segments: true,
      research: true,
      hypotheses: true,
      // rtbs comes along for the chain ribbon's last slot — the RTBs that
      // ultimately rest on this job, one join further than the page itself
      // needs.
      features: { include: { rtbs: true } },
    },
  })

  if (!jtbd) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const chainRtbs = Array.from(
    new Map(jtbd.features.flatMap((f) => f.rtbs).map((rtb) => [rtb.id, rtb])).values()
  )

  const deleteJtbdWithId = deleteJtbd.bind(null, jtbd.id)
  const toggleJtbdPinnedWithId = toggleJtbdPinned.bind(null, jtbd.id, !jtbd.pinned)
  const backToGraphHref =
    searchParams.from === 'graph'
      ? `/jtbd/graph?productId=${searchParams.productId ?? jtbd.product.id}`
      : null

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={jtbd.product}
        redirectTo={`/jtbd/${jtbd.id}`}
      />
      <RecentlyViewedTracker href={`/jtbd/${jtbd.id}`} title={jtbd.title} kind="JTBD" />
      {backToGraphHref && (
        <Link href={backToGraphHref} className="text-sm text-muted-foreground hover:underline">
          ← Назад к графу
        </Link>
      )}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={jtbd.title}
              type="textarea"
              action={updateJtbdField.bind(null, jtbd.id, 'title')}
            />
          </h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={jtbd.pinned} action={toggleJtbdPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/jtbd/new?productId=${jtbd.product.id}&duplicateFrom=${jtbd.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/jtbd/${jtbd.id}/edit${backToGraphHref ? `?from=graph&productId=${searchParams.productId ?? jtbd.product.id}` : ''}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteJtbdWithId}
              impact={{ model: 'jtbd', id: jtbd.id }}
              name={jtbd.title}
            />
          </div>
        </div>
        <div className="mb-4">
          <ChainRibbon
            stages={[
              {
                title: 'Сегмент',
                items: jtbd.segments.map((s) => ({ label: s.name, href: `/segments/${s.id}` })),
                emptyLabel: 'не привязан',
                gap: { kind: 'jtbd-segment', anchorId: jtbd.id, productId: jtbd.product.id },
              },
              {
                title: 'JTBD',
                items: [
                  {
                    label: jtbdKeyPhrase(jtbd.title),
                    fullLabel: jtbd.title,
                    href: `/jtbd/${jtbd.id}`,
                  },
                ],
                emptyLabel: '',
                current: true,
              },
              {
                title: 'Гипотеза',
                items: jtbd.hypotheses.map((h) => ({
                  label: hypothesisKeyPhrase(h.statement),
                  fullLabel: h.statement,
                  href: `/hypotheses/${h.id}`,
                })),
                emptyLabel: 'ни одной',
                gap: { kind: 'jtbd-hypothesis', anchorId: jtbd.id, productId: jtbd.product.id },
              },
              {
                title: 'Фича',
                items: jtbd.features.map((f) => ({ label: f.name, href: `/features/${f.id}` })),
                emptyLabel: 'ни одной',
                gap: { kind: 'jtbd-feature', anchorId: jtbd.id, productId: jtbd.product.id },
              },
              {
                title: 'Маркетинг',
                items: chainRtbs.map((r) => ({ label: r.statement, href: `/marketing/${r.id}` })),
                emptyLabel: 'нет обещаний',
                addHref: `/marketing/new?productId=${jtbd.product.id}`,
              },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <InlineEditableField
            value={jtbd.jobType}
            type="select"
            options={jtbdJobTypeOrder.map((type) => ({
              value: type,
              label: jtbdJobTypeLabels[type],
            }))}
            action={updateJtbdField.bind(null, jtbd.id, 'jobType')}
            display="jobType"
          />
          <InlineEditableField
            value={jtbd.category}
            action={updateJtbdField.bind(null, jtbd.id, 'category')}
            display="badge"
            badgeVariant="outline"
          />
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
          {jtbd.segments.map((segment) => (
            <Link
              key={segment.id}
              href={`/segments/${segment.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {segment.name}
            </Link>
          ))}
          {jtbd.research && (
            <Link
              href={`/research/${jtbd.research.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              #{jtbd.research.number} {jtbd.research.title}
            </Link>
          )}
        </div>
        <div className="mb-4">
          <InlineEditableField
            value={jtbd.tags.join(', ')}
            action={updateJtbdField.bind(null, jtbd.id, 'tags')}
            placeholder="+ добавить теги"
            display="tags"
          />
        </div>
        <p className="text-muted-foreground">
          <InlineEditableField
            value={jtbd.description ?? ''}
            type="textarea"
            action={updateJtbdField.bind(null, jtbd.id, 'description')}
          />
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Гипотезы{' '}
            <span className="font-normal text-muted-foreground">({jtbd.hypotheses.length})</span>
          </CardTitle>
          <Link
            href={`/hypotheses/new?productId=${jtbd.product.id}&jtbdId=${jtbd.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить гипотезу
          </Link>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Фичи, которые закрывают{' '}
            <span className="font-normal text-muted-foreground">({jtbd.features.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jtbd.features.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока не привязано ни одной фичи.</p>
          ) : (
            <ul className="space-y-2">
              {jtbd.features.map((f) => (
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
