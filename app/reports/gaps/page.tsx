import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { ALL_PRODUCTS } from '@/lib/report-scope'
import { ReportsProductFilterForm } from '@/components/forms/reports-product-filter-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { GapQuickAction } from '@/components/reports/gap-quick-action'
import { ConfirmWithResearch } from '@/components/jtbd/confirm-with-research'
import { buildGapTasks, totalGapTasks, type GapGroup } from '@/lib/gap-tasks'
import {
  getProductsWithoutRecentResearch,
  getSegmentsWithoutJtbd,
  getStuckHypotheses,
  getUnconfirmedJtbds,
} from '@/lib/dashboard-metrics'

export const metadata = { title: 'Пробелы' }

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
                <p className="truncate text-sm font-medium" title={task.fullTitle}>
                  {task.title}
                </p>
                {/* A product row's title already is the product name. */}
                {task.kind !== 'product-without-research' && (
                  <p className="truncate text-xs text-muted-foreground">{task.productName}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {task.quickAction === 'hypothesis-to-review' && (
                  <GapQuickAction hypothesisId={task.recordId} label="На проверку" />
                )}
                {/* Пикер, а не кнопка «Подтвердить» (фаза 25 плана 2.4): строка
                    спрашивает, каким исследованием, и только тогда ставит флаг. */}
                {task.quickAction === 'jtbd-confirm' && (
                  <ConfirmWithResearch jtbdId={task.recordId} productId={task.productId} compact />
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

export default async function GapsPage({ searchParams }: { searchParams: { productId?: string } }) {
  const userId = getCurrentUserId()

  // Область — активный продукт, как у списков и дашборда (фаза 20); «все
  // продукты» — явный режим, а не умолчание. Раньше очередь считалась по всей
  // базе, и под шапкой с одним продуктом стояли строки другого.
  const [products, activeProductId] = await Promise.all([
    prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    getActiveProductId(userId),
  ])
  const scopeProduct =
    searchParams.productId === ALL_PRODUCTS
      ? null
      : (products.find((p) => p.id === searchParams.productId) ??
        products.find((p) => p.id === activeProductId) ??
        null)
  const scope = scopeProduct?.id

  const [unconfirmedJtbds, segmentsWithoutJtbd, stuckHypotheses, productsWithoutRecentResearch] =
    await Promise.all([
      getUnconfirmedJtbds(userId, scope),
      getSegmentsWithoutJtbd(userId, scope),
      getStuckHypotheses(userId, scope),
      getProductsWithoutRecentResearch(userId, scope),
    ])

  // Адрес очереди с её областью — чтобы форма, открытая из строки, вернула
  // сюда, а карточка показала «← К очереди» (фаза 25 плана 2.4). Область
  // пишется явно даже для активного продукта: cookie может смениться, пока
  // форма открыта, а вернуться нужно в ту очередь, из которой ушли.
  const returnTo = scopeProduct
    ? `/reports/gaps?productId=${scopeProduct.id}`
    : `/reports/gaps?productId=${ALL_PRODUCTS}`
  const groups = buildGapTasks(
    {
      segmentsWithoutJtbd,
      productsWithoutRecentResearch,
      stuckHypotheses,
      unconfirmedJtbds,
    },
    { returnTo }
  )
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

      {products.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <ReportsProductFilterForm
            products={products}
            productId={scopeProduct?.id ?? ALL_PRODUCTS}
            allowAll
          />
          <span className="text-sm text-muted-foreground">
            {scopeProduct
              ? `Очередь по продукту «${scopeProduct.name}»`
              : 'Очередь по всем продуктам'}
          </span>
        </div>
      )}

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
              {/* Пустая очередь — успех, но не конец работы (фаза 16): отсюда
                  есть куда идти, и страница обязана это показать, а не только
                  поздравить. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/reports/segments-jtbd"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Матрица Сегменты × JTBD
                </Link>
                <Link
                  href="/research/new?from=/reports/gaps"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Запланировать исследование
                </Link>
                <Link
                  href="/hypotheses"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  К доске гипотез
                </Link>
              </div>
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
