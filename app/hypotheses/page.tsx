import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { hypothesisStatusLabels, hypothesisStatusOrder } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function HypothesesPage() {
  const hypotheses = await prisma.hypothesis.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Гипотезы</h1>
        <Link href="/hypotheses/new" className={buttonVariants()}>
          Новая гипотеза
        </Link>
      </div>

      {hypotheses.length === 0 ? (
        <p className="text-muted-foreground">Гипотез пока нет.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {hypothesisStatusOrder.map((status) => {
            const items = hypotheses.filter((h) => h.status === status)
            return (
              <div key={status}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                  {hypothesisStatusLabels[status]} ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((h) => (
                    <Link key={h.id} href={`/hypotheses/${h.id}`}>
                      <Card className="hover:border-primary transition-colors">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium line-clamp-3">
                            {h.statement}
                          </CardTitle>
                          <CardDescription>{h.product.name}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
