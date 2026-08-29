import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { deleteRTB, toggleRTBPinned, updateRTBField } from '@/lib/actions/rtbs'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { RecordPage, RecordSection } from '@/components/shared/record-page'
import { recordBlockers } from '@/lib/record-blockers'

export const dynamic = 'force-dynamic'

export default async function RTBDetailPage({ params }: { params: { id: string } }) {
  const rtb = await prisma.rTB.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, features: true },
  })

  if (!rtb) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  return (
    <RecordPage
      product={rtb.product}
      activeProductId={activeProductId}
      href={`/marketing/${rtb.id}`}
      moduleHref="/marketing"
      moduleLabel="Обещания"
      kind="RTB"
      plainTitle={rtb.statement}
      recordId={rtb.id}
      deleteModel="rtb"
      deleteAction={deleteRTB.bind(null, rtb.id)}
      pinned={rtb.pinned}
      togglePinned={toggleRTBPinned.bind(null, rtb.id, !rtb.pinned)}
      duplicateHref={`/marketing/new?productId=${rtb.product.id}&duplicateFrom=${rtb.id}`}
      editHref={`/marketing/${rtb.id}/edit`}
      title={
        <InlineEditableField
          value={rtb.statement}
          type="textarea"
          action={updateRTBField.bind(null, rtb.id)}
        />
      }
      blockers={recordBlockers({
        kind: 'rtb',
        id: rtb.id,
        productId: rtb.productId,
        featureCount: rtb.features.length,
      })}
    >
      <RecordSection
        title="Фичи, на которых основано"
        count={rtb.features.length}
        empty="Ни одной фичи не привязано."
      >
        <ul className="space-y-2">
          {rtb.features.map((f) => (
            <li key={f.id}>
              <Link href={`/features/${f.id}`} className="text-sm hover:underline">
                {f.name}
              </Link>
            </li>
          ))}
        </ul>
      </RecordSection>
    </RecordPage>
  )
}
