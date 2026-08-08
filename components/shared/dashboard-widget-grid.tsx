'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { GripVertical, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  dashboardWidgetDefs,
  reconcileDashboardLayout,
  type DashboardWidgetDef,
} from '@/lib/dashboard-widgets'
import { getDashboardLayout, setDashboardLayout, type DashboardWidgetLayout } from '@/lib/client-storage'
import { cn } from '@/lib/utils'

// Renders the dashboard's customizable widgets in a saved (or default) order,
// with a settings overlay to show/hide and reorder them
// (plans/archive/dashboard-redesign-plan.md Фаза 2). `widgets` is pre-rendered
// server content keyed by widget id — a Server Component can pass finished
// JSX into a Client Component as a prop, it just can't be constructed here.
export function DashboardWidgetGrid({ widgets }: { widgets: Record<string, ReactNode> }) {
  const [layout, setLayout] = useState<DashboardWidgetLayout[]>(() => reconcileDashboardLayout(null))
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setLayout(reconcileDashboardLayout(getDashboardLayout()))
  }, [])

  function persist(next: DashboardWidgetLayout[]) {
    setLayout(next)
    setDashboardLayout(next)
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings2 size={14} />
          Настроить дашборд
        </Button>
      </div>

      <div className="space-y-6">
        {layout
          .filter((w) => w.visible)
          .map((w) => (
            <div key={w.id}>{widgets[w.id] ?? null}</div>
          ))}
      </div>

      {settingsOpen && (
        <DashboardSettingsOverlay
          layout={layout}
          onChange={persist}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

function DashboardSettingsOverlay({
  layout,
  onChange,
  onClose,
}: {
  layout: DashboardWidgetLayout[]
  onChange: (next: DashboardWidgetLayout[]) => void
  onClose: () => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const titleById: Record<string, string> = Object.fromEntries(
    dashboardWidgetDefs.map((d: DashboardWidgetDef) => [d.id, d.title])
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function toggleVisible(id: string) {
    onChange(layout.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  }

  function moveBefore(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const fromIndex = layout.findIndex((w) => w.id === draggedId)
    const toIndex = layout.findIndex((w) => w.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const next = [...layout]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(next.findIndex((w) => w.id === targetId), 0, moved)
    onChange(next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настроить дашборд"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg motion-safe:animate-card-settle"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Настроить дашборд</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Перетащите, чтобы изменить порядок. Настройка сохраняется в этом браузере.
        </p>
        <ul className="space-y-1.5">
          {layout.map((w) => (
            <li
              key={w.id}
              draggable
              onDragStart={() => setDraggingId(w.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (draggingId) moveBefore(draggingId, w.id)
              }}
              className={cn(
                'flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-opacity',
                draggingId === w.id && 'opacity-40'
              )}
            >
              <GripVertical
                size={14}
                className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
              />
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={w.visible}
                  onChange={() => toggleVisible(w.id)}
                  className="h-4 w-4 rounded border-input"
                />
                {titleById[w.id] ?? w.id}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
