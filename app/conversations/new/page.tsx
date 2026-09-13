import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { createConversation } from '@/lib/actions/conversations'
import { ConversationForm } from '@/components/forms/conversation-form'

export const metadata = { title: 'Новый разговор' }

export const dynamic = 'force-dynamic'

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string; productId?: string; duplicateFrom?: string }
}) {
  const userId = getCurrentUserId()
  // Продукт по умолчанию — активный, тот же, что назван в шапке (фаза 20):
  // раньше форма читала только cookie, а шапка ещё и подставляла первый
  // продукт, и в свежем браузере они расходились.
  const activeProductId = await getActiveProductId(userId)
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
          redirectTo={searchParams.from}
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
              : { productId: searchParams.productId ?? activeProductId ?? undefined }
          }
          error={searchParams.error}
          submitLabel="Создать"
        />
      )}
    </main>
  )
}
