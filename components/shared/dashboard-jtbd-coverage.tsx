import Link from 'next/link'
import { Compass } from 'lucide-react'
import type { JtbdCoverage } from '@/lib/dashboard-metrics'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'

// A single ratio against a limit → a meter, not a donut (dataviz skill,
// choosing-a-form.md). Fill uses the violet signal tone — the same tone the
// app already uses for "confirmed" elsewhere (hypothesisStatusTone.CONFIRMED,
// job-type badges), so "confirmed" reads the same color everywhere. Track is
// the lighter step of the same ramp (--signal-violet-bg), per the skill's
// meter spec.
export function DashboardJtbdCoverage({ coverage }: { coverage: JtbdCoverage }) {
  return (
    <DashboardWidgetCard
      icon={Compass}
      title="Покрытие JTBD"
      description="Доля задач клиентов, подтверждённых исследованием"
    >
      {coverage.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Пока нет ни одного JTBD —{' '}
          <Link href="/jtbd/new" className="underline hover:no-underline">
            добавьте первый
          </Link>
          .
        </p>
      ) : (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              {coverage.confirmed} из {coverage.total} подтверждены
            </span>
            <span className="font-mono text-2xl font-bold">{coverage.percent}%</span>
          </div>
          <div
            role="meter"
            aria-valuenow={coverage.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Доля подтверждённых JTBD"
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'hsl(var(--signal-violet-bg))' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${coverage.percent}%`,
                backgroundColor: 'hsl(var(--signal-violet-border))',
              }}
            />
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  )
}
