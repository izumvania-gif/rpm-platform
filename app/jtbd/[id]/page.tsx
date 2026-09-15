import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { deleteJtbd, toggleJtbdPinned, updateJtbdField } from '@/lib/actions/jtbd'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { ChainRibbon } from '@/components/shared/chain-ribbon'
import { RecordPage, RecordSection } from '@/components/shared/record-page'
import { ConfirmWithResearch } from '@/components/jtbd/confirm-with-research'
import { Tooltip } from '@/components/ui/tooltip'
import { recordBlockers } from '@/lib/record-blockers'
import { gapsQueuePath } from '@/lib/gap-tasks'
import { jtbdJobTypeLabels, jtbdJobTypeOrder } from '@/lib/jtbd-job-types'
import { isStale } from '@/lib/utils'
import { hypothesisKeyPhrase, insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
import { recordTitle } from '@/lib/record-title'

// Заголовок вкладки — имя записи (фаза 15). Один лёгкий запрос по нужному
// полю, см. lib/record-title.ts; отсутствующую запись обработает сама страница.
export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: await recordTitle('jtbd', params.id, 'JTBD') }
}

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
      // Инсайты, привязанные к задаче (фаза 21 аудита 2.3). Форма инсайта
      // предлагает эту связь, гайд обещал её на карточке — а карточка молчала,
      // и проверить, что задача на чём-то основана, было негде.
      insights: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!jtbd) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const chainRtbs = Array.from(
    new Map(jtbd.features.flatMap((f) => f.rtbs).map((rtb) => [rtb.id, rtb])).values()
  )

  const backToGraphHref =
    searchParams.from === 'graph'
      ? `/jtbd/graph?productId=${searchParams.productId ?? jtbd.product.id}`
      : null
  // Карточка, открытая из очереди «Пробелов», ведёт обратно в очередь (фаза 25
  // плана 2.4): раньше, закрыв пробел здесь, очередь приходилось искать заново.
  const backToQueueHref = gapsQueuePath(searchParams.from)

  return (
    <RecordPage
      product={jtbd.product}
      activeProductId={activeProductId}
      href={`/jtbd/${jtbd.id}`}
      moduleHref="/jtbd"
      moduleLabel="JTBD"
      kind="JTBD"
      plainTitle={jtbd.title}
      recordId={jtbd.id}
      deleteModel="jtbd"
      deleteAction={deleteJtbd.bind(null, jtbd.id)}
      pinned={jtbd.pinned}
      togglePinned={toggleJtbdPinned.bind(null, jtbd.id, !jtbd.pinned)}
      duplicateHref={`/jtbd/new?productId=${jtbd.product.id}&duplicateFrom=${jtbd.id}`}
      editHref={`/jtbd/${jtbd.id}/edit${
        backToGraphHref ? `?from=graph&productId=${searchParams.productId ?? jtbd.product.id}` : ''
      }`}
      title={
        <InlineEditableField
          value={jtbd.title}
          type="textarea"
          action={updateJtbdField.bind(null, jtbd.id, 'title')}
        />
      }
      ribbon={
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
              title: 'Обещание',
              items: chainRtbs.map((r) => ({ label: r.statement, href: `/marketing/${r.id}` })),
              emptyLabel: 'нет обещаний',
              addHref: `/marketing/new?productId=${jtbd.product.id}`,
            },
          ]}
        />
      }
      contextLink={
        backToGraphHref ? (
          <Link href={backToGraphHref} className="text-sm text-muted-foreground hover:underline">
            ← Назад к графу
          </Link>
        ) : (
          backToQueueHref && (
            <Link href={backToQueueHref} className="text-sm text-muted-foreground hover:underline">
              ← К очереди
            </Link>
          )
        )
      }
      meta={
        <>
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
          {jtbd.confirmed ? (
            <Tooltip content="Отмечено вручную или пикером; должно опираться на привязанное исследование">
              <span tabIndex={0} className="inline-flex rounded-full">
                <Badge variant="green">Подтверждён</Badge>
              </span>
            </Tooltip>
          ) : (
            // На месте бейджа — действие, которое его ставит (фаза 25 плана
            // 2.4): выбрать исследование и подтвердить, не уходя в форму. Блок
            // «Что мешает» ниже ведёт сюда якорем и открывает пикер.
            <ConfirmWithResearch
              hashOpens
              jtbdId={jtbd.id}
              productId={jtbd.product.id}
              currentResearchId={jtbd.researchId}
              fullFormHref={`/jtbd/${jtbd.id}/edit`}
            />
          )}
          {isStale(jtbd.updatedAt) && (
            <Badge variant="outline" className="text-muted-foreground">
              Давно не проверялось
            </Badge>
          )}
          {jtbd.research && (
            <Link
              href={`/research/${jtbd.research.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              #{jtbd.research.number} {jtbd.research.title}
            </Link>
          )}
        </>
      }
      tags={
        <InlineEditableField
          value={jtbd.tags.join(', ')}
          action={updateJtbdField.bind(null, jtbd.id, 'tags')}
          placeholder="+ добавить теги"
          display="tags"
        />
      }
      description={
        <InlineEditableField
          value={jtbd.description ?? ''}
          type="textarea"
          placeholder="+ добавить описание"
          action={updateJtbdField.bind(null, jtbd.id, 'description')}
        />
      }
      blockers={recordBlockers({
        kind: 'jtbd',
        id: jtbd.id,
        productId: jtbd.productId,
        confirmed: jtbd.confirmed,
        hasResearch: Boolean(jtbd.researchId),
      })}
    >
      <RecordSection
        title="Гипотезы"
        count={jtbd.hypotheses.length}
        action={
          <Link
            href={`/hypotheses/new?productId=${jtbd.product.id}&jtbdId=${jtbd.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить гипотезу
          </Link>
        }
        empty="Ни одной гипотезы не заведено."
      >
        <ul className="space-y-2">
          {jtbd.hypotheses.map((h) => (
            <li key={h.id}>
              <Link href={`/hypotheses/${h.id}`} className="text-sm hover:underline">
                {h.statement}
              </Link>
            </li>
          ))}
        </ul>
      </RecordSection>

      <RecordSection
        title="Фичи, которые закрывают"
        count={jtbd.features.length}
        empty="Ни одной фичи не привязано."
      >
        <ul className="space-y-2">
          {jtbd.features.map((f) => (
            <li key={f.id}>
              <Link href={`/features/${f.id}`} className="text-sm hover:underline">
                {f.name}
              </Link>
            </li>
          ))}
        </ul>
      </RecordSection>

      <RecordSection
        title="Инсайты"
        count={jtbd.insights.length}
        action={
          <Link
            href={`/insights/new?productId=${jtbd.product.id}&jtbdId=${jtbd.id}&from=/jtbd/${jtbd.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить инсайт
          </Link>
        }
        empty="Ни одного инсайта не привязано — на чём основана эта задача, пока не записано."
      >
        <ul className="space-y-2">
          {jtbd.insights.map((insight) => (
            <li key={insight.id}>
              <Link
                href={`/insights/${insight.id}`}
                title={insight.text}
                className="text-sm hover:underline"
              >
                {insightKeyPhrase(insight.text)}
              </Link>
            </li>
          ))}
        </ul>
      </RecordSection>
    </RecordPage>
  )
}
