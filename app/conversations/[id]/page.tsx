import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteConversation, toggleConversationPinned } from '@/lib/actions/conversations'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuickAddInsight } from '@/components/shared/quick-add-insight'

export const dynamic = 'force-dynamic'

export default async function ConversationDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
    include: { product: true, segment: true, research: true, insights: true },
  })

  if (!conversation) notFound()

  const [segments, jtbds] = await Promise.all([
    prisma.segment.findMany({
      where: { productId: conversation.productId, userId },
      orderBy: { name: 'asc' },
    }),
    prisma.jTBD.findMany({
      where: { productId: conversation.productId, userId },
      orderBy: { title: 'asc' },
    }),
  ])

  const deleteConversationWithId = deleteConversation.bind(null, conversation.id)
  const toggleConversationPinnedWithId = toggleConversationPinned.bind(
    null,
    conversation.id,
    !conversation.pinned
  )

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <RecentlyViewedTracker
        href={`/conversations/${conversation.id}`}
        title={conversation.title}
        kind="Разговор"
      />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{conversation.title}</h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={conversation.pinned} action={toggleConversationPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/conversations/new?productId=${conversation.product.id}&duplicateFrom=${conversation.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
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
          <div className="mb-4">
            <TagBadges tags={conversation.tags} />
          </div>
        )}
        {conversation.transcript && (
          <p className="text-muted-foreground whitespace-pre-wrap">{conversation.transcript}</p>
        )}
      </div>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Инсайты{' '}
            <span className="font-normal text-muted-foreground">
              ({conversation.insights.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAddInsight
            productId={conversation.productId}
            conversationId={conversation.id}
            segments={segments}
            jtbds={jtbds}
            initialInsights={conversation.insights}
          />
        </CardContent>
      </Card>
    </main>
  )
}
