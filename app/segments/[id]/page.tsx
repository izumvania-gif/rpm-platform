import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { deleteSegment, toggleSegmentPinned, updateSegmentField } from '@/lib/actions/segments'
import Link from 'next/link'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { RecordPage, RecordSection } from '@/components/shared/record-page'
import { recordBlockers } from '@/lib/record-blockers'
import { QuickAddJtbd } from '@/components/shared/quick-add-jtbd'
import { recordTitle } from '@/lib/record-title'
import { buttonVariants } from '@/components/ui/button'
import { hypothesisStatusLabels } from '@/lib/labels'
import { hypothesisKeyPhrase, insightKeyPhrase } from '@/lib/key-phrase'

// Заголовок вкладки — имя записи (фаза 15). Один лёгкий запрос по нужному
// полю, см. lib/record-title.ts; отсутствующую запись обработает сама страница.
export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: await recordTitle('segment', params.id, 'Сегмент') }
}

export const dynamic = 'force-dynamic'

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const segment = await prisma.segment.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      product: true,
      // The segment is the root of the discovery chain, so its own page shows
      // what hangs off it — and lets a job be added right there.
      jtbds: { orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] },
      // Разговоры, инсайты и гипотезы сегмента (фаза 21 аудита 2.3). Раньше
      // разговоры только считались — для условия «Что мешает» (сегмент, с
      // которым никто не говорил, это описание, а не наблюдение), — а сами
      // записи с карточки видны не были: блокер говорил «ни одного разговора»,
      // и проверить это можно было только в другом разделе.
      conversations: { orderBy: { date: 'desc' } },
      insights: { orderBy: { createdAt: 'desc' } },
      hypotheses: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!segment) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  return (
    <RecordPage
      product={segment.product}
      activeProductId={activeProductId}
      href={`/segments/${segment.id}`}
      moduleHref="/segments"
      moduleLabel="Сегменты"
      kind="Сегмент"
      plainTitle={segment.name}
      recordId={segment.id}
      deleteModel="segment"
      deleteAction={deleteSegment.bind(null, segment.id)}
      pinned={segment.pinned}
      togglePinned={toggleSegmentPinned.bind(null, segment.id, !segment.pinned)}
      duplicateHref={`/segments/new?productId=${segment.product.id}&duplicateFrom=${segment.id}`}
      editHref={`/segments/${segment.id}/edit`}
      titleAdornment={
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: segment.color }}
        />
      }
      title={
        <InlineEditableField
          value={segment.name}
          action={updateSegmentField.bind(null, segment.id, 'name')}
        />
      }
      meta={
        <>
          <span className="text-sm text-muted-foreground">{segment.slug}</span>
          <InlineEditableField
            value={segment.audienceShare != null ? String(segment.audienceShare) : ''}
            type="number"
            placeholder="+ добавить долю аудитории"
            action={updateSegmentField.bind(null, segment.id, 'audienceShare')}
            suffix="% аудитории"
          />
        </>
      }
      tags={
        <InlineEditableField
          value={segment.tags.join(', ')}
          action={updateSegmentField.bind(null, segment.id, 'tags')}
          placeholder="+ добавить теги"
          display="tags"
        />
      }
      description={
        <InlineEditableField
          value={segment.description ?? ''}
          type="textarea"
          placeholder="+ добавить описание"
          action={updateSegmentField.bind(null, segment.id, 'description')}
        />
      }
      blockers={recordBlockers({
        kind: 'segment',
        id: segment.id,
        productId: segment.productId,
        jtbdCount: segment.jtbds.length,
        conversationCount: segment.conversations.length,
      })}
    >
      {/* Не через RecordSection: список здесь не только читается, но и
          пополняется на месте (QuickAddJtbd держит своё состояние), поэтому
          «пустое состояние» у него своё — форма, а не фраза. */}
      <div id="jtbds" className="scroll-mt-24 space-y-3">
        <div className="border-l-4 border-primary pl-3">
          <h2 className="text-xl font-bold">
            Задачи сегмента (JTBD){' '}
            <span className="font-normal text-muted-foreground">({segment.jtbds.length})</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Что этот сегмент пытается сделать. Новая задача сразу привязывается к нему.
          </p>
        </div>
        <QuickAddJtbd
          productId={segment.productId}
          segmentId={segment.id}
          initialJtbds={segment.jtbds}
        />
      </div>

      {/* Те же три отношения, что считает «Что мешает» и матрица покрытия —
          и с тем же счётчиком: секция и блокер читают одну длину списка, так
          что «ни одного разговора» и пустая секция не могут разойтись. */}
      <RecordSection
        id="conversations"
        title="Разговоры"
        count={segment.conversations.length}
        action={
          <Link
            href={`/conversations/new?productId=${segment.productId}&segmentId=${segment.id}&from=/segments/${segment.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить разговор
          </Link>
        }
        empty="С этим сегментом ещё не говорили."
      >
        <ul className="divide-y text-sm">
          {segment.conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
            >
              <Link
                href={`/conversations/${conversation.id}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {conversation.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {conversation.date.toLocaleDateString('ru-RU')}
              </span>
            </li>
          ))}
        </ul>
      </RecordSection>

      <RecordSection
        id="insights"
        title="Инсайты"
        count={segment.insights.length}
        action={
          <Link
            href={`/insights/new?productId=${segment.productId}&segmentId=${segment.id}&from=/segments/${segment.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить инсайт
          </Link>
        }
        empty="Ни одного инсайта об этом сегменте."
      >
        <ul className="space-y-2 text-sm">
          {segment.insights.map((insight) => (
            <li key={insight.id}>
              <Link
                href={`/insights/${insight.id}`}
                title={insight.text}
                className="hover:underline"
              >
                {insightKeyPhrase(insight.text)}
              </Link>
            </li>
          ))}
        </ul>
      </RecordSection>

      <RecordSection
        id="hypotheses"
        title="Гипотезы"
        count={segment.hypotheses.length}
        action={
          <Link
            href={`/hypotheses/new?productId=${segment.productId}&segmentId=${segment.id}&from=/segments/${segment.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить гипотезу
          </Link>
        }
        empty="Ни одной гипотезы про этот сегмент."
      >
        <ul className="divide-y text-sm">
          {segment.hypotheses.map((hypothesis) => (
            <li
              key={hypothesis.id}
              className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
            >
              <Link
                href={`/hypotheses/${hypothesis.id}`}
                title={hypothesis.statement}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {hypothesisKeyPhrase(hypothesis.statement)}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {hypothesisStatusLabels[hypothesis.status]}
              </span>
            </li>
          ))}
        </ul>
      </RecordSection>
    </RecordPage>
  )
}
