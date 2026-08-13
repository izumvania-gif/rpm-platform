import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { getCurrentUserId } from '@/lib/current-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { GapQuickAction } from '@/components/reports/gap-quick-action'
import { buildGapTasks, totalGapTasks, type GapGroup } from '@/lib/gap-tasks'
import {
  getProductsWithoutRecentResearch,
  getSegmentsWithoutJtbd,
  getStuckHypotheses,
  getUnconfirmedJtbds,
} from '@/lib/dashboard-metrics'

export const dynamic = 'force-dynamic'

// Gaps as a work queue (plans/2.0-product-leap-plan.md, C3) rather than a
// passive report: groups are ranked by how much they block (see GROUP_ORDER in
// lib/gap-tasks.ts), and every row carries the action that resolves it.

function GapGroupCard({ group, position }: { group: GapGroup; position: number }) {
  return (
    <Card>
      <CardHeader className="border-l-4 border-primary">
        <div className="flex flex-wrap items-center gap-2">
          {/* The number is the queue position, not decoration — the groups are
              ordered by how much they block, so "1" really does mean first. */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {position}
          </span>
          <CardTitle className="text-base font-semibold">{group.directive}</CardTitle>
          <Badge variant="slate">{group.count}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {group.heading}. {group.why}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {group.tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {/* A product row's title already is the product name. */}
                {task.kind !== 'product-without-research' && (
                  <p className="truncate text-xs text-muted-foreground">{task.productName}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {task.quickAction === 'hypothesis-to-review' && (
                  <GapQuickAction hypothesisId={task.recordId} label="На проверку" />
                )}
                <Link
                  href={task.href}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {task.actionLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default async function GapsPage() {
  const userId = getCurrentUserId()

  const [unconfirmedJtbds, segmentsWithoutJtbd, stuckHypotheses, productsWithoutRecentResearch] =
    await Promise.all([
      getUnconfirmedJtbds(userId),
      getSegmentsWithoutJtbd(userId),
      getStuckHypotheses(userId),
      getProductsWithoutRecentResearch(userId),
    ])

  const groups = buildGapTasks({
    segmentsWithoutJtbd,
    productsWithoutRecentResearch,
    stuckHypotheses,
    unconfirmedJtbds,
  })
  const total = totalGapTasks(groups)

  return (
    <main className="container py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Пробелы: что делать дальше</h1>
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? 'Пробелы, найденные прямым запросом по уже собранным связям, — в порядке от самого блокирующего к наименее срочному. У каждой строки есть действие, которое её закрывает.'
            : 'Пробелы ищутся прямым запросом по уже собранным связям, а не по ручному чек-листу.'}
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-8">
            <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden />
            <div>
              <p className="font-medium">Очередь пуста</p>
              <p className="text-sm text-muted-foreground">
                Всё, что собрано, связано: у каждого сегмента есть задачи клиента, гипотезы не стоят
                в черновике, исследования свежие. Новые пробелы появятся здесь сами, как только
                данные разойдутся.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Всего задач: <span className="font-semibold text-foreground">{total}</span>
          </p>
          {groups.map((group, index) => (
            <GapGroupCard key={group.kind} group={group} position={index + 1} />
          ))}
        </>
      )}
    </main>
  )
}
