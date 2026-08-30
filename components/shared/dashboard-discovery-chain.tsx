import Link from 'next/link'
import { Link2 } from 'lucide-react'
import type { ChainCounts } from '@/lib/discovery-chain'
import { buildChainRows, chainIsEmpty } from '@/lib/discovery-chain'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'

// Five ratios against a limit → five meters, built exactly like the JTBD
// coverage meter (dataviz skill, choosing-a-form.md). Deliberately NOT a
// funnel: a funnel claims each stage is a subset of the one above it, and a
// hypothesis is not a subset of a JTBD — see lib/discovery-chain.ts.
//
// One measure, so one hue and no legend — the title names it. Blue is already
// the app's color for a link (the JTBD graph draws its sequence edges in
// --signal-blue-border), and this widget is about links, so it inherits that
// meaning rather than inventing one. Validated with the skill's script against
// both card surfaces: fill #2463eb on white and #527fe0 on the dark card both
// pass contrast; the pale track is a meter track, not a data mark.
//
// Numbers stay in text tokens — the colored mark beside them carries identity.
//
// Вывод про слабое звено с фазы 10 живёт не здесь, а отдельной плашкой над
// карточкой (`DashboardWeakLink`): это главное, что говорит экран, а сноска
// под пятью полосками читается последней. Дублировать её тут нельзя — один и
// тот же вывод дважды на одном экране это шум, а не акцент.
export function DashboardDiscoveryChain({ counts }: { counts: ChainCounts }) {
  const rows = buildChainRows(counts)

  return (
    <DashboardWidgetCard
      icon={Link2}
      title="Цепочка дискавери"
      description="Сколько записей на каждом шаге связано с соседним звеном"
    >
      {chainIsEmpty(rows) ? (
        <p className="text-sm text-muted-foreground">
          Цепочка пока пустая — начните с{' '}
          <Link href="/segments/new" className="underline hover:no-underline">
            сегмента
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <Link
                  href={row.href}
                  className="truncate text-sm hover:underline"
                  title={`Связано, если ${row.attachedTo}`}
                >
                  {row.label}
                </Link>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {row.total === 0 ? 'нет записей' : `${row.attached} из ${row.total}`}
                </span>
              </div>
              <div
                role="meter"
                aria-valuenow={row.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.label}: ${row.attached} из ${row.total} связано`}
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'hsl(var(--signal-blue-bg))' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${row.percent}%`,
                    backgroundColor: 'hsl(var(--signal-blue-border))',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  )
}
