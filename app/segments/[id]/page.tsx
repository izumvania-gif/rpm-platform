import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteSegment } from '@/lib/actions/segments'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const segment = await prisma.segment.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true },
  })

  if (!segment) notFound()

  const deleteSegmentWithId = deleteSegment.bind(null, segment.id)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <h1 className="text-2xl font-bold">{segment.name}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/segments/${segment.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteSegmentWithId} />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <Link href={`/products/${segment.product.id}`} className="hover:underline">
            {segment.product.name}
          </Link>
          <span>{segment.slug}</span>
          {segment.audienceShare != null && <span>{segment.audienceShare}% аудитории</span>}
        </div>
        {segment.description && <p className="text-muted-foreground">{segment.description}</p>}
      </div>
    </main>
  )
}
