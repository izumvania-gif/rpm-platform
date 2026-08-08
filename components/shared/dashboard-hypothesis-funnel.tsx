import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import type { HypothesisStatusCounts } from '@/lib/dashboard-metrics'
import {
  hypothesisStatusIcon,
  hypothesisStatusLabels,
  hypothesisStatusOrder,
  hypothesisStatusTone,
} from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'

// Part-to-whole with ≤4 categories → a horizontal stacked bar, categorical
// color job (dataviz skill). Reuses the app's existing hypothesis-status
// signal palette/icons (Фаза 3 of the visual redesign) rather than a new
// palette — and since that palette's slate↔blue pair is hard to tell apart
// in dark mode (validated with the skill's script when this widget was
// planned), status is never color-only here: every segment/legend row also
// carries its status icon and a direct count label.
export function DashboardHypothesisFunnel({ counts }: { counts: HypothesisStatusCounts }) {
  const total = hypothesisStatusOrder.reduce((sum, status) => sum + counts[status], 0)

  return (
    <DashboardWidgetCard
      icon={FlaskConical}
      title="Воронка гипотез"
      description="Сколько гипотез сейчас в каждом статусе пайплайна"
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Пока нет ни одной гипотезы —{' '}
          <Link href="/hypotheses/new" className="underline hover:no-underline">
            добавьте первую
          </Link>
          .
        </p>
      ) : (
        <div>
          <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-md bg-muted">
            {hypothesisStatusOrder.map((status) => {
              const count = counts[status]
              if (count === 0) return null
              const tone = signalToneColors[hypothesisStatusTone[status]]
              return (
                <div
                  key={status}
                  title={`${hypothesisStatusLabels[status]}: ${count}`}
                  style={{ width: `${(count / total) * 100}%`, backgroundColor: tone.border }}
                />
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
            {hypothesisStatusOrder.map((status) => {
              const Icon = hypothesisStatusIcon[status]
              const tone = signalToneColors[hypothesisStatusTone[status]]
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <Icon size={13} strokeWidth={2} style={{ color: tone.border }} />
                  <span className="truncate text-muted-foreground">
                    {hypothesisStatusLabels[status]}
                  </span>
                  <span className="ml-auto shrink-0 font-mono font-semibold">{counts[status]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  )
}
