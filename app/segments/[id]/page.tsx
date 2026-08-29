import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { deleteSegment, toggleSegmentPinned, updateSegmentField } from '@/lib/actions/segments'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { RecordPage } from '@/components/shared/record-page'
import { recordBlockers } from '@/lib/record-blockers'
import { QuickAddJtbd } from '@/components/shared/quick-add-jtbd'

export const dynamic = 'force-dynamic'

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const segment = await prisma.segment.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      product: true,
      // The segment is the root of the discovery chain, so its own page shows
      // what hangs off it — and lets a job be added right there.
      jtbds: { orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] },
      // Разговоры не показываются списком — из них считается одно условие
      // блока «Что мешает»: сегмент, с которым никто не говорил, это описание,
      // а не наблюдение.
      _count: { select: { conversations: true } },
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
        conversationCount: segment._count.conversations,
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
    </RecordPage>
  )
}
