import { eachMonthOfInterval, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { roadmapStatusLabels, roadmapStatusOrder, roadmapStatusTone } from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { NO_TRACK_GROUP_LABEL, type GanttLayout } from '@/lib/roadmap-gantt'

// Server-renderable, no client state — the only interactivity is a native
// `title` hover tooltip per bar, a deliberately minimal version of the
// dataviz skill's "ship a hover layer" guidance (a full HTML tooltip
// component felt disproportionate for a chart with no other interaction).
const MIN_BAR_WIDTH_PERCENT = 0.6

function percent(date: Date, rangeStart: Date, rangeEnd: Date): number {
  const span = rangeEnd.getTime() - rangeStart.getTime()
  if (span <= 0) return 0
  return ((date.getTime() - rangeStart.getTime()) / span) * 100
}

// No client-side layout pass here (server-rendered), so "does the label
// fit" is a character-count heuristic against the chart's fixed min-width
// (~900px, ~6px/char at 11px) rather than a measured box. A label that
// doesn't fit is dropped, not clipped — a short bar next to another bar in
// the same track (a 2-day event a week before the next item starts, say)
// has nowhere free to spill the label into without risking exactly the
// overlap this replaces: the full title is still one hover away.
const CHART_MIN_WIDTH_PX = 900
const PERCENT_TO_PX = CHART_MIN_WIDTH_PX / 100
const CHAR_WIDTH_PX = 6
const BAR_LABEL_PADDING_PX = 16

function labelFitsInBar(title: string, widthPercent: number): boolean {
  const availablePx = widthPercent * PERCENT_TO_PX - BAR_LABEL_PADDING_PX
  return availablePx >= title.length * CHAR_WIDTH_PX
}

export function GanttChart({ layout }: { layout: GanttLayout }) {
  const { groups, milestones, rangeStart, rangeEnd } = layout

  if (groups.length === 0 && milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ни у одного пункта роадмапа не заполнены даты «Начало»/«Конец» (или дата вехи) — заполните
        их в форме пункта, чтобы увидеть диаграмму Ганта.
      </p>
    )
  }

  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
  const pct = (date: Date) => percent(date, rangeStart, rangeEnd)
  const now = new Date()
  const todayPct = now >= rangeStart && now <= rangeEnd ? pct(now) : null

  const rows = groups.flatMap((group) => {
    const showGroupHeader = !(groups.length === 1 && group.group === NO_TRACK_GROUP_LABEL)
    return [
      ...(showGroupHeader ? [{ kind: 'group' as const, key: `g-${group.group}`, label: group.group }] : []),
      ...group.tracks.map((t) => ({ kind: 'track' as const, key: `t-${group.group}-${t.track}`, label: t.track, bars: t.bars })),
    ]
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {roadmapStatusOrder.map((status) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: signalToneColors[roadmapStatusTone[status]].border }}
            />
            {roadmapStatusLabels[status]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <div className="flex min-w-[900px] pt-6 pb-6">
          <div className="sticky left-0 z-20 w-40 shrink-0 border-r bg-background">
            <div className="h-8 border-b" />
            {rows.map((row) =>
              row.kind === 'group' ? (
                <div
                  key={row.key}
                  className="flex h-7 items-center truncate border-b bg-muted/40 px-3 text-xs font-semibold"
                >
                  {row.label}
                </div>
              ) : (
                <div
                  key={row.key}
                  className="flex h-10 items-center truncate border-b pl-6 pr-3 text-xs text-muted-foreground"
                >
                  {row.label}
                </div>
              )
            )}
          </div>

          <div className="relative flex-1">
            <div className="relative h-8 border-b">
              {months.map((month) => (
                <div
                  key={month.toISOString()}
                  className="absolute inset-y-0 border-l pl-1.5 pt-1.5 text-[11px] text-muted-foreground"
                  style={{ left: `${pct(month)}%` }}
                >
                  {format(month, 'LLL yyyy', { locale: ru })}
                </div>
              ))}
            </div>

            <div className="relative">
              {months.map((month) => (
                <div
                  key={month.toISOString()}
                  className="pointer-events-none absolute inset-y-0 border-l border-border/60"
                  style={{ left: `${pct(month)}%` }}
                />
              ))}
              {rows.map((row) =>
                row.kind === 'group' ? (
                  <div key={row.key} className="h-7 border-b bg-muted/40" />
                ) : (
                  <div key={row.key} className="relative h-10 border-b">
                    {row.bars.map((bar) => {
                      const left = pct(bar.startDate)
                      const width = Math.max(pct(bar.endDate) - left, MIN_BAR_WIDTH_PERCENT)
                      const tone = signalToneColors[roadmapStatusTone[bar.status]]
                      const tooltip = `${bar.title} — ${roadmapStatusLabels[bar.status]} (${format(bar.startDate, 'd MMM yyyy', { locale: ru })} – ${format(bar.endDate, 'd MMM yyyy', { locale: ru })})`
                      const showLabel = labelFitsInBar(bar.title, width)
                      return (
                        <div
                          key={bar.id}
                          title={tooltip}
                          className="absolute top-1/2 h-5 -translate-y-1/2 truncate rounded-full border px-2 text-[11px] leading-5"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: showLabel ? tone.bg : tone.border,
                            borderColor: tone.border,
                            color: showLabel ? tone.text : 'transparent',
                          }}
                        >
                          {showLabel ? bar.title : ''}
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>

            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary"
                style={{ left: `${pct(milestone.date)}%` }}
              >
                <span className="absolute top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {milestone.title}
                </span>
              </div>
            ))}
            {todayPct !== null && (
              <div
                className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-muted-foreground/60"
                style={{ left: `${todayPct}%` }}
              >
                <span className="absolute bottom-0 -translate-x-1/2 translate-y-full whitespace-nowrap pt-1 text-[10px] text-muted-foreground">
                  Сегодня
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
