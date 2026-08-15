import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { HypothesisKanbanBoard } from '@/components/hypotheses/kanban-board'
import { SectionHeading } from '@/components/shared/section-heading'
import { hypothesisStatusLabels } from '@/lib/labels'
import { moduleByHref } from '@/lib/module-meta'
import { EmptyState } from '@/components/shared/empty-state'
import { QuickAddButton } from '@/components/shared/quick-add-button'

export const dynamic = 'force-dynamic'

export default async function HypothesesPage() {
  const hypotheses = await prisma.hypothesis.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading
          level={1}
          title="Гипотезы"
          description={moduleByHref['/hypotheses'].description}
        />
        <QuickAddButton
          type="hypothesis"
          href="/hypotheses/new"
          label="Быстро добавить гипотезу, не уходя со страницы"
        />
        <Link href="/hypotheses/new" className={buttonVariants()}>
          Новая гипотеза
        </Link>
      </div>

      {hypotheses.length === 0 ? (
        <EmptyState moduleKey="/hypotheses" />
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
          <p className="mb-4 text-xs text-muted-foreground">
            Перетащите карточку в другую колонку, чтобы изменить статус гипотезы.
          </p>
          <HypothesisKanbanBoard hypotheses={hypotheses} />
        </>
      )}
    </main>
  )
}
