import type { DashboardWidgetLayout } from '@/lib/client-storage'

// Single source of truth for "which dashboard widgets exist" — the settings
// panel and the grid both key off this (plans/dashboard-redesign-plan.md
// Фаза 2). The hero product block above the widget grid isn't a widget —
// it's always shown, not customizable.
export interface DashboardWidgetDef {
  id: string
  title: string
}

export const dashboardWidgetDefs: DashboardWidgetDef[] = [
  { id: 'gaps-summary', title: 'Пробелы' },
  { id: 'jtbd-coverage', title: 'Покрытие JTBD' },
  { id: 'hypothesis-funnel', title: 'Воронка гипотез' },
  { id: 'research-cadence', title: 'Частота исследований' },
  { id: 'research-group', title: 'Исследование клиентов' },
  { id: 'positioning-group', title: 'Позиционирование' },
  { id: 'recently-viewed', title: 'Недавно просмотренное' },
  { id: 'pinned', title: 'Закреплённое' },
  { id: 'activity', title: 'Последняя активность' },
]

export const defaultDashboardLayout: DashboardWidgetLayout[] = dashboardWidgetDefs.map((w) => ({
  id: w.id,
  visible: true,
}))

// A browser's saved layout can predate a widget being added or removed here
// (e.g. Фаза 3/4 adding new widgets) — keep the saved order for anything
// still known, append newly-introduced widgets at the end (visible by
// default), and drop ids that no longer exist.
export function reconcileDashboardLayout(
  saved: DashboardWidgetLayout[] | null,
  defs: DashboardWidgetDef[] = dashboardWidgetDefs
): DashboardWidgetLayout[] {
  if (!saved) return defs.map((w) => ({ id: w.id, visible: true }))
  const knownIds = new Set(defs.map((d) => d.id))
  const kept = saved.filter((w) => knownIds.has(w.id))
  const keptIds = new Set(kept.map((w) => w.id))
  const added = defs.filter((d) => !keptIds.has(d.id)).map((d) => ({ id: d.id, visible: true }))
  return [...kept, ...added]
}
