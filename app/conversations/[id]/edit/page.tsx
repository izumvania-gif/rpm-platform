import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateConversation } from '@/lib/actions/conversations'
import { ConversationForm } from '@/components/forms/conversation-form'

export const dynamic = 'force-dynamic'

export default async function EditConversationPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const userId = getCurrentUserId()
  const [conversation, products, segments, researches] = await Promise.all([
    prisma.conversation.findFirst({ where: { id: params.id, userId } }),
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
  ])

  if (!conversation) notFound()

  const updateConversationWithId = updateConversation.bind(null, conversation.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать разговор</h1>
      <ConversationForm
        action={updateConversationWithId}
        products={products}
        segments={segments}
        researches={researches}
        defaultValues={conversation}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
