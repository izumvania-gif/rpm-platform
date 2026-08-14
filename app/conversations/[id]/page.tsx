import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import {
  deleteConversation,
  toggleConversationPinned,
  updateConversationField,
} from '@/lib/actions/conversations'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuickAddInsight } from '@/components/shared/quick-add-insight'
import { InsightSuggestions } from '@/components/conversations/insight-suggestions'
import { InlineEditableField } from '@/components/shared/inline-editable-field'

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
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={conversation.title}
              action={updateConversationField.bind(null, conversation.id, 'title')}
            />
          </h1>
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
            <DeleteButton
              action={deleteConversationWithId}
              impact={{ model: 'conversation', id: conversation.id }}
              name={conversation.title}
            />
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
          <InlineEditableField
            value={conversation.date.toISOString().slice(0, 10)}
            type="date"
            action={updateConversationField.bind(null, conversation.id, 'date')}
            display="date"
            className="text-sm text-muted-foreground"
          />
        </div>
        <div className="mb-4">
          <InlineEditableField
            value={conversation.tags.join(', ')}
            action={updateConversationField.bind(null, conversation.id, 'tags')}
            placeholder="+ добавить теги"
            display="tags"
          />
        </div>
        <p className="text-muted-foreground whitespace-pre-wrap">
          <InlineEditableField
            value={conversation.transcript ?? ''}
            type="textarea"
            placeholder="+ добавить транскрипт"
            action={updateConversationField.bind(null, conversation.id, 'transcript')}
          />
        </p>
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
        <CardContent className="space-y-4">
          {/* Derived suggestions above the manual form (C4): the transcript
              already holds the quotes, so offer them before asking. */}
          <InsightSuggestions
            productId={conversation.productId}
            conversationId={conversation.id}
            segmentId={conversation.segmentId}
            transcript={conversation.transcript}
            existingInsightTexts={conversation.insights.map((i) => i.text)}
          />
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
