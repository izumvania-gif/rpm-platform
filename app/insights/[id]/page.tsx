import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import { RecordCrumbs } from '@/components/shared/record-crumbs'
import {
  deleteInsight,
  toggleInsightPinned,
  updateInsightField,
  type InsightInlineField,
} from '@/lib/actions/insights'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InsightStance } from '@prisma/client'
import { insightStanceLabels } from '@/lib/labels'
import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { recordTitle } from '@/lib/record-title'

// Заголовок вкладки — имя записи (фаза 15). Один лёгкий запрос по нужному
// полю, см. lib/record-title.ts; отсутствующую запись обработает сама страница.
export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: await recordTitle('insight', params.id, 'Инсайт') }
}

export const dynamic = 'force-dynamic'

export default async function InsightDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const insight = await prisma.insight.findFirst({
    where: { id: params.id, userId },
    include: { product: true, segment: true, jtbd: true, research: true, conversation: true },
  })

  if (!insight) notFound()

  // Связи правятся инлайн (фаза 24 плана 2.4): до этого сегмент, задача,
  // исследование, разговор, гипотеза и сторона менялись только в форме, и
  // ежедневный сценарий «привязать цитату к задаче» стоил три перехода.
  // Кандидаты — записи того же продукта: связь между продуктами не считает
  // ни один отчёт, и сервер её тоже не примет.
  const scope = { productId: insight.productId, userId }
  const [activeProductId, segments, jtbds, researches, conversations, hypotheses] =
    await Promise.all([
      getActiveProductId(userId),
      prisma.segment.findMany({ where: scope, orderBy: { name: 'asc' } }),
      prisma.jTBD.findMany({ where: scope, orderBy: { title: 'asc' } }),
      prisma.research.findMany({ where: scope, orderBy: { number: 'desc' } }),
      prisma.conversation.findMany({ where: scope, orderBy: { date: 'desc' } }),
      prisma.hypothesis.findMany({ where: scope, orderBy: { createdAt: 'desc' } }),
    ])

  const withNone = (none: string, rows: { value: string; label: string }[]) => [
    { value: '', label: none },
    ...rows,
  ]
  const labelsOf = (rows: { value: string; label: string }[]) =>
    Object.fromEntries(rows.map((r) => [r.value, r.label]))
  const segmentRows = segments.map((s) => ({ value: s.id, label: s.name }))
  const jtbdRows = jtbds.map((j) => ({ value: j.id, label: jtbdKeyPhrase(j.title) }))
  const researchRows = researches.map((r) => ({ value: r.id, label: `#${r.number} ${r.title}` }))
  const conversationRows = conversations.map((c) => ({ value: c.id, label: c.title }))
  const hypothesisRows = hypotheses.map((h) => ({
    value: h.id,
    label: hypothesisKeyPhrase(h.statement),
  }))
  const stanceRows = Object.values(InsightStance).map((value) => ({
    value,
    label: insightStanceLabels[value],
  }))

  const relations: {
    label: string
    field: InsightInlineField
    value: string
    options: { value: string; label: string }[]
    placeholder: string
    href?: string
  }[] = [
    {
      label: 'Сегмент',
      field: 'segmentId',
      value: insight.segmentId ?? '',
      options: withNone('— без сегмента', segmentRows),
      placeholder: '+ сегмент',
      href: insight.segment ? `/segments/${insight.segment.id}` : undefined,
    },
    {
      label: 'Задача',
      field: 'jtbdId',
      value: insight.jtbdId ?? '',
      options: withNone('— без задачи', jtbdRows),
      placeholder: '+ задача',
      href: insight.jtbd ? `/jtbd/${insight.jtbd.id}` : undefined,
    },
    {
      label: 'Исследование',
      field: 'researchId',
      value: insight.researchId ?? '',
      options: withNone('— без исследования', researchRows),
      placeholder: '+ исследование',
      href: insight.research ? `/research/${insight.research.id}` : undefined,
    },
    {
      label: 'Разговор',
      field: 'conversationId',
      value: insight.conversationId ?? '',
      options: withNone('— без разговора', conversationRows),
      placeholder: '+ разговор',
      href: insight.conversation ? `/conversations/${insight.conversation.id}` : undefined,
    },
    {
      label: 'Гипотеза',
      field: 'hypothesisId',
      value: insight.hypothesisId ?? '',
      options: withNone('— без гипотезы', hypothesisRows),
      placeholder: '+ гипотеза',
      href: insight.hypothesisId ? `/hypotheses/${insight.hypothesisId}` : undefined,
    },
  ]

  const deleteInsightWithId = deleteInsight.bind(null, insight.id)
  const toggleInsightPinnedWithId = toggleInsightPinned.bind(null, insight.id, !insight.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={insight.product}
        redirectTo={`/insights/${insight.id}`}
      />
      <RecentlyViewedTracker href={`/insights/${insight.id}`} title={insight.text} kind="Инсайт" />
      <RecordCrumbs
        items={[
          { href: `/products/${insight.product.id}`, label: insight.product.name },
          { href: '/insights', label: 'Инсайты' },
        ]}
      />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={insight.text}
              type="textarea"
              action={updateInsightField.bind(null, insight.id, 'text')}
            />
          </h1>
          <div className="flex flex-wrap gap-2 shrink-0">
            <PinButton pinned={insight.pinned} action={toggleInsightPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/insights/new?productId=${insight.product.id}&duplicateFrom=${insight.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/insights/${insight.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteInsightWithId}
              impact={{ model: 'insight', id: insight.id }}
              name={insight.text}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link
            href={`/products/${insight.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {insight.product.name}
          </Link>
        </div>
        <InlineEditableField
          value={insight.tags.join(', ')}
          action={updateInsightField.bind(null, insight.id, 'tags')}
          placeholder="+ добавить теги"
          display="tags"
        />
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">Связи</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Каждая связь — инлайн-селект по образцу ответственного продукта, а
              рядом стрелка на саму запись: селект показывает подпись, а не
              ссылку, и без стрелки с карточки инсайта нельзя было бы перейти
              к тому, о чём он. */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {relations.map((relation) => (
              <div key={relation.field} className="contents">
                <dt className="text-muted-foreground">{relation.label}</dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-2">
                  <InlineEditableField
                    value={relation.value}
                    type="select"
                    options={relation.options}
                    labels={labelsOf(relation.options)}
                    placeholder={relation.placeholder}
                    action={updateInsightField.bind(null, insight.id, relation.field)}
                  />
                  {relation.href && (
                    <Link
                      href={relation.href}
                      aria-label={`Открыть: ${relation.label.toLowerCase()}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      →
                    </Link>
                  )}
                </dd>
              </div>
            ))}
            {insight.hypothesisId && (
              <div className="contents">
                <dt className="text-muted-foreground">Сторона</dt>
                <dd>
                  <InlineEditableField
                    value={insight.stance ?? ''}
                    type="select"
                    options={withNone('Без стороны', stanceRows)}
                    labels={insightStanceLabels}
                    placeholder="+ сторона"
                    action={updateInsightField.bind(null, insight.id, 'stance')}
                  />
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </main>
  )
}
