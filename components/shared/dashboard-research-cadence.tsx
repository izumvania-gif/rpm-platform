import { CircleAlert, TrendingUp } from 'lucide-react'
import type { MonthlyResearchCount } from '@/lib/dashboard-metrics'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'

const WIDTH = 600
const HEIGHT = 140
const PAD_X = 20
const PAD_TOP = 20
const PAD_BOTTOM = 26

// Trend over time, single series → a line + light area wash, one hue
// (dataviz skill). No axes/gridlines beyond a single hairline baseline —
// this is a sparkline, not a full chart. Only the endpoint is direct-labeled
// (skill: "lines → value at the end"); the rest stay readable from the
// month ticks. A zero-count final month — the "провал" the redesign plan
// calls out — gets its own marker color and a text note below, since color
// alone on a single small dot isn't a reliable signal.
export function DashboardResearchCadence({ data }: { data: MonthlyResearchCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <DashboardWidgetCard
      icon={TrendingUp}
      title="Частота исследований"
      description={`Исследования по месяцам, последние ${data.length} мес.`}
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          За последние {data.length} мес. не было ни одного исследования.
        </p>
      ) : (
        <Sparkline data={data} />
      )}
    </DashboardWidgetCard>
  )
}

function Sparkline({ data }: { data: MonthlyResearchCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const plotWidth = WIDTH - PAD_X * 2
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0
  const baselineY = PAD_TOP + plotHeight

  const points = data.map((d, i) => ({
    ...d,
    x: PAD_X + i * stepX,
    y: PAD_TOP + plotHeight - (d.count / max) * plotHeight,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${baselineY} L${points[0].x},${baselineY} Z`
  const last = points[points.length - 1]
  const lastIsEmpty = last.count === 0
  // Not a distinct marker color for the "gap" case — the line itself is drawn
  // in the brand primary, so a second colored dot on it would read as part of
  // the series rather than as a warning. The text note below the chart (icon +
  // label, not color alone) carries that signal instead, in amber.

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-28 w-full" aria-hidden="true">
        <line
          x1={PAD_X}
          y1={baselineY}
          x2={WIDTH - PAD_X}
          y2={baselineY}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
        <path d={areaPath} fill="hsl(var(--primary))" opacity={0.1} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <text
            key={p.label + p.monthStart.toISOString()}
            x={p.x}
            y={HEIGHT - 6}
            textAnchor="middle"
            style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          >
            {p.label}
          </text>
        ))}
        <circle
          cx={last.x}
          cy={last.y}
          r={4}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--card))"
          strokeWidth={2}
        />
        <text
          x={last.x}
          y={last.y - 10}
          textAnchor="middle"
          style={{ fontSize: 13, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
        >
          {last.count}
        </text>
      </svg>

      {/* Screen-reader table view of the same data — dataviz skill's
          accessibility pass ("a table view exists"). */}
      <table className="sr-only">
        <caption>Исследования по месяцам</caption>
        <thead>
          <tr>
            <th>Месяц</th>
            <th>Количество</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label + d.monthStart.toISOString()}>
              <td>{d.label}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {lastIsEmpty && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--signal-amber-text))]">
          <CircleAlert size={13} />В этом месяце пока нет исследований.
        </p>
      )}
    </div>
  )
}
