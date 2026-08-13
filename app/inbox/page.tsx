import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { SectionHeading } from '@/components/shared/section-heading'
import { InboxComposer } from '@/components/inbox/inbox-composer'

export const dynamic = 'force-dynamic'

// The Inbox (plans/2.0-product-leap-plan.md, B1) — the single entry point the
// plan asks for: paste anything, get a reviewable queue of drafts of several
// types at once. Product-scoped like every other content route, but with its
// own switcher so it works as a standalone destination rather than only from
// a product page.
export default async function InboxPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const selected =
    searchParams.productId && products.some((p) => p.id === searchParams.productId)
      ? searchParams.productId
      : (products[0]?.id ?? '')

  return (
    <main className="container py-12 space-y-8">
      <SectionHeading
        level={1}
        title="Инбокс"
        description="Вставьте заметки, транскрипт или список — каждая строка станет черновой записью нужного типа"
      />

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Сначала создайте продукт —{' '}
          <Link href="/products/new" className="underline">
            новый продукт
          </Link>
          .
        </p>
      ) : (
        <InboxComposer products={products} initialProductId={selected} />
      )}
    </main>
  )
}
