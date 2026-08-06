import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { createConversation } from '@/lib/actions/conversations'
import { ConversationForm } from '@/components/forms/conversation-form'

export const dynamic = 'force-dynamic'

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: { error?: string; productId?: string; duplicateFrom?: string }
}) {
  const userId = getCurrentUserId()
  const [products, segments, researches, duplicateSource] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.segment.findMany({ where: { userId } }),
    prisma.research.findMany({ where: { userId } }),
    searchParams.duplicateFrom
      ? prisma.conversation.findFirst({ where: { id: searchParams.duplicateFrom, userId } })
      : null,
  ])

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый разговор</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт — разговор должен быть привязан к продукту.
        </p>
      ) : (
        <ConversationForm
          action={createConversation}
          products={products}
          segments={segments}
          researches={researches}
          defaultValues={
            duplicateSource
              ? {
                  ...duplicateSource,
                  productId: searchParams.productId ?? duplicateSource.productId,
                }
              : { productId: searchParams.productId }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
