import Link from 'next/link'
import { CircleAlert, CircleCheck, ClipboardList, type LucideIcon } from 'lucide-react'
import type { GapsCounts } from '@/lib/dashboard-metrics'
import { moduleByHref } from '@/lib/module-meta'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'

interface GapStat {
  href: string
  icon: LucideIcon
  label: string
  count: number
}

// KPI row, not a chart — "a handful of headline numbers" per the dataviz
// skill's form guidance. Reuses /reports/gaps' own queries
// (lib/dashboard-metrics.ts), so the two never drift. Status is carried by
// an icon (CircleAlert vs CircleCheck) + a colored mark, never by coloring
// the number itself — text stays in text tokens per the skill's mark rules.
export function DashboardGapsSummary({ counts }: { counts: GapsCounts }) {
  const stats: GapStat[] = [
    {
      href: '/reports/gaps',
      icon: moduleByHref['/jtbd'].icon,
      label: 'JTBD без подтверждения',
      count: counts.unconfirmedJtbds,
    },
    {
      href: '/reports/gaps',
      icon: moduleByHref['/segments'].icon,
      label: 'Сегменты без JTBD',
      count: counts.segmentsWithoutJtbd,
    },
    {
      href: '/reports/gaps',
      icon: moduleByHref['/hypotheses'].icon,
      label: 'Гипотезы в черновике 14+ дней',
      count: counts.stuckHypotheses,
    },
    {
      href: '/reports/gaps',
      icon: moduleByHref['/research'].icon,
      label: 'Продукты без свежих исследований',
      count: counts.productsWithoutRecentResearch,
    },
  ]
  const totalGaps = stats.reduce((sum, s) => sum + s.count, 0)

  return (
    <DashboardWidgetCard
      icon={ClipboardList}
      title="Пробелы"
      description="Автоматически найденные пробелы в уже собранных данных"
    >
      {totalGaps === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CircleCheck size={15} className="text-[hsl(var(--signal-violet-border))]" />
          Пробелов не найдено.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            const hasGap = stat.count > 0
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-md border p-3 transition-colors hover:border-primary/50"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon size={12} strokeWidth={1.75} className="shrink-0" />
                  <span className="truncate">{stat.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-2xl font-bold">{stat.count}</span>
                  {hasGap ? (
                    <CircleAlert
                      size={14}
                      className="text-[hsl(var(--signal-red-border))]"
                      aria-label="Требует внимания"
                    />
                  ) : (
                    <CircleCheck
                      size={14}
                      className="text-[hsl(var(--signal-violet-border))]"
                      aria-label="Нет пробелов"
                    />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </DashboardWidgetCard>
  )
}
