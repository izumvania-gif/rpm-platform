import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteConversation } from '@/lib/actions/conversations'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'

export const dynamic = 'force-dynamic'

export default async function ConversationDetailPage({ params }: { params: { id: string } }) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { product: true, segment: true, research: true },
  })

  if (!conversation) notFound()

  const deleteConversationWithId = deleteConversation.bind(null, conversation.id)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{conversation.title}</h1>
          <div className="flex gap-2">
            <Link
              href={`/conversations/${conversation.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton action={deleteConversationWithId} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link
            href={`/products/${conversation.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {conversation.product.name}
          </Link>
          {conversation.segment && (
            <Link
              href={`/segments/${conversation.segment.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {conversation.segment.name}
            </Link>
          )}
          {conversation.research && (
            <Link
              href={`/research/${conversation.research.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              #{conversation.research.number} {conversation.research.title}
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {conversation.date.toLocaleDateString('ru-RU')}
          </span>
        </div>
        {conversation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {conversation.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {conversation.transcript && (
          <p className="text-muted-foreground whitespace-pre-wrap">{conversation.transcript}</p>
        )}
      </div>
    </main>
  )
}
