import Link from 'next/link'
import { Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { hypothesisStatusLabels, hypothesisStatusTone } from '@/lib/labels'
import type { DecisionItem } from '@/lib/decision-queue'

// Очередь «Требуют решения» (фаза 10 редизайна 2.1).
//
// Сколько строк показывать: столько же, сколько на карточках продукта, — пять.
// Число в подзаголовке при этом настоящее, а не «5+»: очередь считается
// целиком, обрезается только показ.
const MAX_ROWS = 5

export function DashboardDecisionQueue({ items }: { items: DecisionItem[] }) {
  const shown = items.slice(0, MAX_ROWS)

  return (
    <DashboardWidgetCard
      icon={Scale}
      title="Требуют решения"
      description="Гипотезы, у которых собрано всё нужное: критерий, доказательства, адресат и фича"
      contentClassName={items.length > 0 ? 'p-0' : undefined}
      action={
        items.length > 0 ? (
          <Link href="/hypotheses" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Все гипотезы
          </Link>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        // Не «пока пусто»: пустая очередь это осмысленный ответ, а не
        // отсутствие данных. Гипотезы могут быть — просто ни одна ещё не
        // собрала всё, что нужно для решения.
        <p className="text-sm text-muted-foreground">
          Решать пока нечего — ни одна гипотеза не собрала полный набор.{' '}
          <Link href="/hypotheses" className="underline hover:no-underline">
            К доске гипотез
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {shown.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 text-sm hover:bg-accent/60"
                >
                  <span className="min-w-0 flex-1 truncate" title={item.fullLabel}>
                    {item.label}
                  </span>
                  <Badge variant={hypothesisStatusTone[item.status]}>
                    {hypothesisStatusLabels[item.status]}
                  </Badge>
                  {/* Баланс словами и цифрами, без полосы: полоса на карточке
                      гипотезы объясняет доли, а здесь строка одна из пяти и
                      читается за секунду. Нейтральные названы отдельно — они
                      привязаны, но стороны не заняли. */}
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {item.balance.supports} за · {item.balance.contradicts} против
                    {item.balance.neutral > 0 && ` · ${item.balance.neutral} без стороны`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > shown.length && (
            <div className="px-6 py-2.5">
              <Link href="/hypotheses" className="text-sm text-primary hover:underline">
                Ещё {items.length - shown.length} →
              </Link>
            </div>
          )}
        </>
      )}
    </DashboardWidgetCard>
  )
}
