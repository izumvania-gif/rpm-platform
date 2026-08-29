import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
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
import {
  hypothesisStatusLabels,
  hypothesisStatusOrder,
  hypothesisStatusTone,
  insightStanceLabels,
  insightStanceTone,
} from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { hypothesisKeyPhrase, insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
import { InsightStance } from '@prisma/client'
import { evidenceBalance, hypothesisReadiness } from '@/lib/hypothesis-readiness'
import { EvidenceBalanceBar } from '@/components/hypotheses/evidence-balance'
import { ReadinessChecklist } from '@/components/hypotheses/readiness-checklist'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

// Фильтр доказательств — GET-параметр, а не состояние клиента: страница и так
// force-dynamic, ссылка с выбранным фильтром остаётся ссылкой (её можно
// отправить коллеге), и фильтрация не требует ни грамма JS.
const STANCE_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'supports', label: 'За' },
  { key: 'contradicts', label: 'Против' },
] as const

type StanceFilter = (typeof STANCE_FILTERS)[number]['key']

export default async function HypothesisDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { stance?: string }
}) {
  const hypothesis = await prisma.hypothesis.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      product: true,
      // The job carries one thing the ribbon needs: which segments it serves,
      // for a hypothesis that names no segment of its own.
      jtbd: { include: { segments: true } },
      segment: true,
      research: true,
      statusChanges: { orderBy: { changedAt: 'desc' } },
      // Доказательства и фичи (фаза 2 схемы) — из них считается и баланс, и
      // чек-лист готовности.
      insights: {
        orderBy: { createdAt: 'desc' },
        include: { research: true, conversation: true },
      },
      // rtbs — на одно соединение дальше, для последнего слота ленты цепочки.
      features: { include: { rtbs: true } },
    },
  })

  if (!hypothesis) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const activeFilter: StanceFilter = STANCE_FILTERS.some((f) => f.key === searchParams.stance)
    ? (searchParams.stance as StanceFilter)
    : 'all'

  const balance = evidenceBalance(hypothesis.insights.map((i) => i.stance))
  const readiness = hypothesisReadiness({
    status: hypothesis.status,
    validationCriterion: hypothesis.validationCriterion,
    insightCount: hypothesis.insights.length,
    // Сегмент может быть указан напрямую или унаследован от задачи — для
    // «понятно, чей это вопрос» годится и то, и другое.
    hasSegment: Boolean(hypothesis.segment) || (hypothesis.jtbd?.segments.length ?? 0) > 0,
    hasJtbd: Boolean(hypothesis.jtbd),
    featureCount: hypothesis.features.length,
  })

  const visibleInsights = hypothesis.insights.filter((insight) =>
    activeFilter === 'all'
      ? true
      : activeFilter === 'supports'
        ? insight.stance === InsightStance.SUPPORTS
        : insight.stance === InsightStance.CONTRADICTS
  )

  // A hypothesis can name a segment directly or inherit it from its job —
  // the ribbon shows whichever is available, direct link first.
  const chainSegments = hypothesis.segment
    ? [hypothesis.segment]
    : (hypothesis.jtbd?.segments ?? [])
  // Обещания — через СВОИ фичи гипотезы, а не через фичи её задачи. До фазы 7
  // лента показывала здесь вторые: прямой связи «гипотеза ↔ фича» тогда просто
  // не было (она появилась в фазе 2 схемы). Теперь есть, и держать в ленте
  // фичи задачи значило бы противоречить чек-листу готовности на этой же
  // странице — он считает `hypothesis.features` и говорит «нет фичи» ровно
  // тогда, когда лента показывала бы чужие.
  const chainRtbs = Array.from(
    new Map(hypothesis.features.flatMap((f) => f.rtbs).map((rtb) => [rtb.id, rtb])).values()
  )

  const deleteHypothesisWithId = deleteHypothesis.bind(null, hypothesis.id)
  const toggleHypothesisPinnedWithId = toggleHypothesisPinned.bind(
    null,
    hypothesis.id,
    !hypothesis.pinned
  )

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={hypothesis.product}
        redirectTo={`/hypotheses/${hypothesis.id}`}
      />
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
                gap: {
                  kind: 'hypothesis-segment',
                  anchorId: hypothesis.id,
                  productId: hypothesis.product.id,
                },
              },
              {
                title: 'JTBD',
                items: hypothesis.jtbd
                  ? [
                      {
                        label: jtbdKeyPhrase(hypothesis.jtbd.title),
                        href: `/jtbd/${hypothesis.jtbd.id}`,
                      },
                    ]
                  : [],
                emptyLabel: 'не привязан',
                gap: {
                  kind: 'hypothesis-jtbd',
                  anchorId: hypothesis.id,
                  productId: hypothesis.product.id,
                },
              },
              {
                title: 'Гипотеза',
                items: [
                  {
                    label: hypothesisKeyPhrase(hypothesis.statement),
                    fullLabel: hypothesis.statement,
                    href: `/hypotheses/${hypothesis.id}`,
                  },
                ],
                emptyLabel: '',
                current: true,
              },
              {
                title: 'Фича',
                items: hypothesis.features.map((f) => ({
                  label: f.name,
                  href: `/features/${f.id}`,
                })),
                emptyLabel: 'ни одной',
                gap: {
                  kind: 'hypothesis-feature',
                  anchorId: hypothesis.id,
                  productId: hypothesis.product.id,
                },
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

      {/* Критерий проверки стоит выше доказательств намеренно: сначала «при
          каком результате мы считаем это доказанным», потом сами
          доказательства. Обратный порядок — это подгонка критерия под уже
          собранные данные. Якорь — цель кнопки «Записать критерий». */}
      <Card id="criterion" className="scroll-mt-4">
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">Критерий проверки</CardTitle>
        </CardHeader>
        <CardContent>
          <InlineEditableField
            value={hypothesis.validationCriterion ?? ''}
            type="textarea"
            placeholder="+ при каком результате считаем гипотезу подтверждённой"
            action={updateHypothesisField.bind(null, hypothesis.id, 'validationCriterion')}
          />
        </CardContent>
      </Card>

      <Card id="evidence" className="scroll-mt-4">
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Доказательства{' '}
            <span className="font-normal text-muted-foreground">{balance.total}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EvidenceBalanceBar balance={balance} />

          {balance.total > 0 && (
            <>
              <nav aria-label="Фильтр доказательств" className="flex flex-wrap gap-1.5">
                {STANCE_FILTERS.map((filter) => {
                  const count =
                    filter.key === 'all'
                      ? balance.total
                      : filter.key === 'supports'
                        ? balance.supports
                        : balance.contradicts
                  const isActive = filter.key === activeFilter
                  return (
                    <Link
                      key={filter.key}
                      href={
                        filter.key === 'all'
                          ? `/hypotheses/${hypothesis.id}`
                          : `/hypotheses/${hypothesis.id}?stance=${filter.key}`
                      }
                      aria-current={isActive ? 'true' : undefined}
                      className={buttonVariants({
                        variant: isActive ? 'default' : 'outline',
                        size: 'sm',
                      })}
                    >
                      {filter.label}{' '}
                      <span className="ml-1.5 font-mono tabular-nums opacity-70">{count}</span>
                    </Link>
                  )
                })}
              </nav>

              {visibleInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {activeFilter === 'supports'
                    ? 'Ни одного доказательства за.'
                    : 'Ни одного доказательства против.'}
                </p>
              ) : (
                <ul className="divide-y">
                  {visibleInsights.map((insight) => (
                    <li key={insight.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        {/* Ключевая фраза, как везде, где запись просматривают,
                            а не читают; полный текст — в title. */}
                        <Link
                          href={`/insights/${insight.id}`}
                          title={insight.text}
                          className="min-w-0 text-sm hover:underline"
                        >
                          {insightKeyPhrase(insight.text)}
                        </Link>
                        {insight.stance && (
                          <Badge variant={insightStanceTone[insight.stance]}>
                            {insightStanceLabels[insight.stance]}
                          </Badge>
                        )}
                      </div>
                      {(insight.research || insight.conversation) && (
                        <p className="text-xs text-muted-foreground">
                          {insight.research && (
                            <Link
                              href={`/research/${insight.research.id}`}
                              className="hover:underline"
                            >
                              #{insight.research.number} {insight.research.title}
                            </Link>
                          )}
                          {insight.research && insight.conversation && ' · '}
                          {insight.conversation && (
                            <Link
                              href={`/conversations/${insight.conversation.id}`}
                              className="hover:underline"
                            >
                              {insight.conversation.title}
                            </Link>
                          )}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <Link
            href={`/insights/new?productId=${hypothesis.product.id}&hypothesisId=${hypothesis.id}&from=/hypotheses/${hypothesis.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            + Добавить доказательство
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">Готовность к решению</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadinessChecklist
            readiness={readiness}
            hypothesisId={hypothesis.id}
            productId={hypothesis.product.id}
          />
        </CardContent>
      </Card>

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
