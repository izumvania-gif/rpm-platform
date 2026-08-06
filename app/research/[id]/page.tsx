import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteResearch } from '@/lib/actions/research'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { statusLabels, typeLabels } from '@/lib/labels'

export default async function ResearchDetailPage({ params }: { params: { id: string } }) {
  const research = await prisma.research.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true },
  })

  if (!research) notFound()

  const deleteResearchWithId = deleteResearch.bind(null, research.id)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">
            #{research.number} {research.title}
          </h1>
          <div className="flex gap-2">
            <Link
              href={`/research/${research.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteResearchWithId} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant={research.status === 'COMPLETED' ? 'default' : 'secondary'}>
            {statusLabels[research.status]}
          </Badge>
          <Badge variant="outline">{typeLabels[research.type]}</Badge>
          <Link
            href={`/products/${research.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {research.product.name}
          </Link>
          <span className="text-sm text-muted-foreground">
            {research.date.toLocaleDateString('ru-RU')}
          </span>
        </div>
        {research.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {research.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {research.description && <p className="text-muted-foreground">{research.description}</p>}
      </div>
    </main>
  )
}
