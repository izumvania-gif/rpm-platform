'use client'

import { useRef, useState, useTransition } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { eachMonthOfInterval, format, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { roadmapStatusLabels, roadmapStatusOrder, roadmapStatusTone } from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { cn } from '@/lib/utils'
import { updateRoadmapItemDates } from '@/lib/actions/roadmap'
import {
  NO_TRACK_GROUP_LABEL,
  type GanttBar,
  type GanttLayout,
  type UnscheduledItem,
} from '@/lib/roadmap-gantt'

// Editable canvas (plans/2.0-ux-improvement-plan.md, Фаза 6) — a client
// component, an architectural reversal from the original "no client
// state" design (see git history). Layout/grouping still happens once on
// the server (buildGanttLayout/getMultiProductGanttLayout); only the bar
// render + drag interaction moved to the client. Dragging uses native
// Pointer Events + setPointerCapture (same "no new drag library"
// philosophy already used by the hypothesis kanban board and the
// @xyflow/react canvases), not a dedicated DnD library.
// Dropping an unscheduled item gives it a span, because a bar needs two
// dates. Two weeks is a starting guess the PM then drags — the alternative,
// asking for an end date in a dialog, is the trip to a form this whole tray
// exists to remove.
const DEFAULT_SCHEDULE_DAYS = 14

const MIN_BAR_WIDTH_PERCENT = 0.6
const MIN_DURATION_MS = 24 * 60 * 60 * 1000

function percent(date: Date, rangeStart: Date, rangeEnd: Date): number {
  const span = rangeEnd.getTime() - rangeStart.getTime()
  if (span <= 0) return 0
  return ((date.getTime() - rangeStart.getTime()) / span) * 100
}

// No client-side text measurement here either (still a character-count
// heuristic, see below) — the chart's fixed min-width doesn't change just
// because bars are now draggable.
const CHART_MIN_WIDTH_PX = 900
const PERCENT_TO_PX = CHART_MIN_WIDTH_PX / 100
const CHAR_WIDTH_PX = 6
const BAR_LABEL_PADDING_PX = 16

function labelFitsInBar(title: string, widthPercent: number): boolean {
  const availablePx = widthPercent * PERCENT_TO_PX - BAR_LABEL_PADDING_PX
  return availablePx >= title.length * CHAR_WIDTH_PX
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'milestone' | 'schedule'

interface DragState {
  id: string
  mode: DragMode
  pointerId: number
  startX: number
  initialStart: Date
  initialEnd: Date | null
  initialGroup: string | null
  initialTrack: string | null
}

interface Override {
  startDate: Date
  endDate?: Date
}

export function GanttChart({
  layout,
  allowTrackChange = false,
}: {
  layout: GanttLayout
  // Dragging a bar onto another track's row (plan's "Перетащить полосу по
  // вертикали на другой трек") is /pm-only — on /cpo each "track" row is a
  // whole product (getMultiProductGanttLayout), where reassigning a
  // product doesn't make sense and isn't offered there at all. Restricted
  // to the same trackGroup as the bar's own row (the drag-save action
  // only ever writes RoadmapItem.track, never trackGroup).
  allowTrackChange?: boolean
}) {
  const router = useRouter()
  const { groups, milestones, unscheduled, rangeStart, rangeEnd } = layout
  const timelineRef = useRef<HTMLDivElement>(null)
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverTrackKey, setHoverTrackKey] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [dragError, setDragError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (groups.length === 0 && milestones.length === 0 && unscheduled.length === 0) {
    return <p className="text-sm text-muted-foreground">В роадмапе пока нет пунктов.</p>
  }

  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
  const pct = (date: Date) => percent(date, rangeStart, rangeEnd)
  const now = new Date()
  const todayPct = now >= rangeStart && now <= rangeEnd ? pct(now) : null
  const totalSpanMs = rangeEnd.getTime() - rangeStart.getTime()

  const rows = groups.flatMap((group) => {
    const showGroupHeader = !(groups.length === 1 && group.group === NO_TRACK_GROUP_LABEL)
    return [
      ...(showGroupHeader
        ? [{ kind: 'group' as const, key: `g-${group.group}`, label: group.group }]
        : []),
      ...group.tracks.map((t) => ({
        kind: 'track' as const,
        key: `t-${group.group}-${t.track}`,
        label: t.track,
        group: group.group,
        track: t.track,
        bars: t.bars,
      })),
    ]
  })

  // Scheduling needs the date *under* the pointer, not a delta from where the
  // drag began — the item has no bar to move from.
  function dateAtClientX(clientX: number): Date {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return new Date(rangeStart)
    const fraction = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    return new Date(rangeStart.getTime() + fraction * totalSpanMs)
  }

  function pointerDeltaMs(e: ReactPointerEvent, startX: number): number {
    const timelineWidth = timelineRef.current?.getBoundingClientRect().width || 1
    const deltaPx = e.clientX - startX
    return (deltaPx / timelineWidth) * totalSpanMs
  }

  function startBarDrag(
    e: ReactPointerEvent<HTMLDivElement>,
    bar: GanttBar,
    mode: DragMode,
    group: string,
    track: string
  ) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragError(null)
    setDrag({
      id: bar.id,
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      initialStart: overrides[bar.id]?.startDate ?? bar.startDate,
      initialEnd: overrides[bar.id]?.endDate ?? bar.endDate,
      initialGroup: group,
      initialTrack: track,
    })
  }

  function startScheduleDrag(e: ReactPointerEvent<HTMLElement>, item: UnscheduledItem) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragError(null)
    setDrag({
      id: item.id,
      mode: 'schedule',
      pointerId: e.pointerId,
      startX: e.clientX,
      initialStart: dateAtClientX(e.clientX),
      initialEnd: null,
      initialGroup: null,
      initialTrack: null,
    })
  }

  function startMilestoneDrag(e: ReactPointerEvent<HTMLDivElement>, id: string, date: Date) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragError(null)
    setDrag({
      id,
      mode: 'milestone',
      pointerId: e.pointerId,
      startX: e.clientX,
      initialStart: overrides[id]?.startDate ?? date,
      initialEnd: null,
      initialGroup: null,
      initialTrack: null,
    })
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return

    if (drag.mode === 'schedule') {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const rowEl = el?.closest('[data-track-key]') as HTMLElement | null
      setHoverTrackKey(rowEl?.dataset.trackKey ?? null)
      return
    }

    const deltaMs = pointerDeltaMs(e, drag.startX)

    let newStart = drag.initialStart
    let newEnd = drag.initialEnd

    if (drag.mode === 'move' || drag.mode === 'milestone') {
      newStart = new Date(drag.initialStart.getTime() + deltaMs)
      newEnd = drag.initialEnd ? new Date(drag.initialEnd.getTime() + deltaMs) : null
    } else if (drag.mode === 'resize-start') {
      const candidate = new Date(drag.initialStart.getTime() + deltaMs)
      const maxStart = drag.initialEnd
        ? new Date(drag.initialEnd.getTime() - MIN_DURATION_MS)
        : candidate
      newStart = candidate > maxStart ? maxStart : candidate
    } else if (drag.mode === 'resize-end') {
      const minEnd = new Date(drag.initialStart.getTime() + MIN_DURATION_MS)
      const candidate = drag.initialEnd ? new Date(drag.initialEnd.getTime() + deltaMs) : minEnd
      newEnd = candidate < minEnd ? minEnd : candidate
    }

    setOverrides((prev) => ({
      ...prev,
      [drag.id]: { startDate: newStart, endDate: newEnd ?? undefined },
    }))

    if (allowTrackChange && drag.mode === 'move') {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const rowEl = el?.closest('[data-track-key]') as HTMLElement | null
      setHoverTrackKey(rowEl?.dataset.trackKey ?? null)
    }
  }

  /** Puts an item on the timeline: shared by the tray drop and its keyboard twin. */
  function schedule(id: string, isMilestone: boolean, start: Date, group?: string, track?: string) {
    const snappedStart = startOfDay(start)
    const snappedEnd = isMilestone
      ? undefined
      : startOfDay(new Date(snappedStart.getTime() + DEFAULT_SCHEDULE_DAYS * 24 * 60 * 60 * 1000))

    setSavingIds((prev) => new Set(prev).add(id))
    startTransition(async () => {
      const result = await updateRoadmapItemDates(
        id,
        snappedStart.toISOString(),
        snappedEnd ? snappedEnd.toISOString() : undefined,
        track,
        group
      )
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      if (!result.ok) {
        setDragError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return

    if (drag.mode === 'schedule') {
      const item = unscheduled.find((u) => u.id === drag.id)
      const droppedOnRow = hoverTrackKey
      setDrag(null)
      setHoverTrackKey(null)
      // Dropped outside any lane: nothing happens, rather than guessing a lane
      // the PM did not point at.
      if (!item || !droppedOnRow) return
      const [group, track] = droppedOnRow.split('::')
      schedule(item.id, item.isMilestone, dateAtClientX(e.clientX), group, track)
      return
    }

    const current = overrides[drag.id]
    const snappedStart = startOfDay(current?.startDate ?? drag.initialStart)
    const snappedEnd =
      drag.mode === 'milestone'
        ? undefined
        : startOfDay(current?.endDate ?? drag.initialEnd ?? drag.initialStart)

    let newTrack: string | undefined
    if (allowTrackChange && drag.mode === 'move' && hoverTrackKey) {
      const [group, track] = hoverTrackKey.split('::')
      if (group === drag.initialGroup && track !== drag.initialTrack) newTrack = track
    }

    setOverrides((prev) => ({
      ...prev,
      [drag.id]: { startDate: snappedStart, endDate: snappedEnd },
    }))
    const draggedId = drag.id
    setDrag(null)
    setHoverTrackKey(null)
    setSavingIds((prev) => new Set(prev).add(draggedId))

    startTransition(async () => {
      const result = await updateRoadmapItemDates(
        draggedId,
        snappedStart.toISOString(),
        snappedEnd ? snappedEnd.toISOString() : undefined,
        newTrack
      )
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(draggedId)
        return next
      })
      if (!result.ok) {
        setOverrides((prev) => {
          const next = { ...prev }
          delete next[draggedId]
          return next
        })
        setDragError(result.error)
        return
      }
      router.refresh()
    })
  }

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

      {dragError && <p className="text-xs text-destructive">Не удалось сохранить: {dragError}</p>}

      {unscheduled.length > 0 && (
        // The tray is the fix for the round trip: an item created here has no
        // dates, and a bar needs two, so it used to be invisible on this tab
        // and you had to switch to «Список» to discover it existed at all.
        <div
          className={cn(
            'rounded-md border border-dashed p-3',
            drag?.mode === 'schedule' && 'border-primary'
          )}
        >
          <p className="mb-2 text-xs text-muted-foreground">
            Не на диаграмме — {unscheduled.length}.{' '}
            {groups.length === 0
              ? 'Нажмите «с сегодня», чтобы поставить первый пункт на диаграмму'
              : 'Перетащите на дорожку, чтобы запланировать'}
            {drag?.mode === 'schedule' && !hoverTrackKey && ' — отпустите над дорожкой'}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {unscheduled.map((item) => {
              const tone = signalToneColors[roadmapStatusTone[item.status]]
              const isSaving = savingIds.has(item.id)
              return (
                <li key={item.id}>
                  <div
                    onPointerDown={(e) => startScheduleDrag(e, item)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title={`${item.title} — ${item.missing}`}
                    className={cn(
                      'flex max-w-[18rem] cursor-grab touch-none items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs',
                      drag?.id === item.id && 'opacity-60',
                      isSaving && 'opacity-60'
                    )}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tone.border }}
                    />
                    <span className="truncate">{item.title}</span>
                    {/* The keyboard twin of the drag: without it the tray would
                        be a pointer-only feature, and the roadmap is the one
                        place a PM plans from a laptop on a call. */}
                    <button
                      type="button"
                      // The chip captures the pointer to start a drag, which
                      // would otherwise swallow this button's click entirely —
                      // same guard the bar's edit link needs.
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => schedule(item.id, item.isMilestone, new Date())}
                      disabled={isSaving}
                      title="Запланировать с сегодняшнего дня"
                      className="shrink-0 rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      с сегодня
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

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

          <div ref={timelineRef} className="relative flex-1">
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
                  <div
                    key={row.key}
                    data-track-key={`${row.group}::${row.track}`}
                    className={cn(
                      'relative h-10 border-b',
                      allowTrackChange &&
                        drag?.mode === 'move' &&
                        hoverTrackKey === `${row.group}::${row.track}` &&
                        'bg-primary/10'
                    )}
                  >
                    {row.bars.map((bar) => {
                      const effective = overrides[bar.id]
                      const startDate = effective?.startDate ?? bar.startDate
                      const endDate = effective?.endDate ?? bar.endDate
                      const left = pct(startDate)
                      const width = Math.max(pct(endDate) - left, MIN_BAR_WIDTH_PERCENT)
                      const tone = signalToneColors[roadmapStatusTone[bar.status]]
                      const tooltip = `${bar.title} — ${roadmapStatusLabels[bar.status]} (${format(startDate, 'd MMM yyyy', { locale: ru })} – ${format(endDate, 'd MMM yyyy', { locale: ru })})`
                      const showLabel = labelFitsInBar(bar.title, width)
                      const isDraggingThis = drag?.id === bar.id
                      const isSaving = savingIds.has(bar.id)
                      return (
                        <div
                          key={bar.id}
                          className="group absolute top-1/2 h-5 -translate-y-1/2"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <div
                            title={tooltip}
                            onPointerDown={(e) =>
                              startBarDrag(e, bar, 'move', row.group, row.track)
                            }
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            className={cn(
                              'absolute inset-0 cursor-grab touch-none select-none truncate rounded-full border px-2 text-[11px] leading-5',
                              isDraggingThis && 'cursor-grabbing shadow-md',
                              isSaving && 'opacity-60'
                            )}
                            style={{
                              backgroundColor: showLabel ? tone.bg : tone.border,
                              borderColor: tone.border,
                              color: showLabel ? tone.text : 'transparent',
                            }}
                          >
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation()
                                startBarDrag(e, bar, 'resize-start', row.group, row.track)
                              }}
                              onPointerMove={handlePointerMove}
                              onPointerUp={handlePointerUp}
                              className="absolute inset-y-0 left-0 w-2 cursor-ew-resize touch-none"
                            />
                            {showLabel ? bar.title : ''}
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation()
                                startBarDrag(e, bar, 'resize-end', row.group, row.track)
                              }}
                              onPointerMove={handlePointerMove}
                              onPointerUp={handlePointerUp}
                              className="absolute inset-y-0 right-0 w-2 cursor-ew-resize touch-none"
                            />
                          </div>
                          <Link
                            href={`/pm/roadmap/${bar.id}/edit`}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute -top-6 left-0 z-30 whitespace-nowrap rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
                          >
                            ✎ Изменить даты
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>

            {milestones.map((milestone) => {
              const position = overrides[milestone.id]?.startDate ?? milestone.date
              const left = pct(position)
              const isSaving = savingIds.has(milestone.id)
              return (
                <div
                  key={milestone.id}
                  className="group absolute inset-y-0 z-10"
                  style={{ left: `${left}%` }}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-y-0 w-px bg-primary',
                      isSaving && 'opacity-60'
                    )}
                  />
                  <div
                    onPointerDown={(e) => startMilestoneDrag(e, milestone.id, milestone.date)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="absolute inset-y-0 -left-1.5 w-3 cursor-grab touch-none"
                  />
                  <span className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    {milestone.title}
                  </span>
                  <Link
                    href={`/pm/roadmap/${milestone.id}/edit`}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute bottom-0 left-0 z-30 -translate-x-1/2 translate-y-full whitespace-nowrap rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
                  >
                    ✎ Изменить дату
                  </Link>
                </div>
              )
            })}
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
