import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { PinButton } from '@/components/shared/pin-button'
import { toggleHypothesisPinned } from '@/lib/actions/hypotheses'
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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h1 className="text-2xl font-bold">Гипотезы</h1>
        <Link href="/hypotheses/new" className={buttonVariants()}>
          Новая гипотеза
        </Link>
      </div>

      {hypotheses.length === 0 ? (
        <p className="text-muted-foreground">Гипотез пока нет.</p>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <CsvExportButton
              filename="hypotheses.csv"
              rows={hypotheses.map((h) => ({
                statement: h.statement,
                status: hypothesisStatusLabels[h.status],
                product: h.product.name,
                priority: h.priority ?? '',
                tags: h.tags.join('; '),
              }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-medium line-clamp-3">
                                {h.statement}
                              </CardTitle>
                              <PinButton
                                pinned={h.pinned}
                                action={toggleHypothesisPinned.bind(null, h.id, !h.pinned)}
                              />
                            </div>
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
        </>
      )}
    </main>
  )
}
