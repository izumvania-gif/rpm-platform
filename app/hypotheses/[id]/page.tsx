import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteHypothesis, updateHypothesisStatus } from '@/lib/actions/hypotheses'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { SubmitButton } from '@/components/shared/submit-button'
import { hypothesisStatusLabels, hypothesisStatusOrder } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function HypothesisDetailPage({ params }: { params: { id: string } }) {
  const hypothesis = await prisma.hypothesis.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, jtbd: true, segment: true, research: true },
  })

  if (!hypothesis) notFound()

  const deleteHypothesisWithId = deleteHypothesis.bind(null, hypothesis.id)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{hypothesis.statement}</h1>
          <div className="flex gap-2">
            <Link
              href={`/hypotheses/${hypothesis.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteHypothesisWithId} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge>{hypothesisStatusLabels[hypothesis.status]}</Badge>
          <Link
            href={`/products/${hypothesis.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {hypothesis.product.name}
          </Link>
          {hypothesis.jtbd && (
            <Link
              href={`/jtbd/${hypothesis.jtbd.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
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
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Сменить статус</h2>
        <div className="flex flex-wrap gap-2">
          {hypothesisStatusOrder.map((status) => {
            const setStatus = updateHypothesisStatus.bind(null, hypothesis.id, status)
            return (
              <form key={status} action={setStatus}>
                <SubmitButton
                  variant={status === hypothesis.status ? 'default' : 'outline'}
                  size="sm"
                  disabled={status === hypothesis.status}
                  pendingText="..."
                >
                  {hypothesisStatusLabels[status]}
                </SubmitButton>
              </form>
            )
          })}
        </div>
      </section>
    </main>
  )
}
