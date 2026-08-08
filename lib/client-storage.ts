'use client'

const RECENTLY_VIEWED_KEY = 'rpm:recently-viewed'
const DEFAULT_PRODUCT_KEY = 'rpm:default-product-id'
const DASHBOARD_LAYOUT_KEY = 'rpm:dashboard-layout'
const RECENTLY_VIEWED_LIMIT = 8

export interface RecentlyViewedEntry {
  href: string
  title: string
  kind: string
  viewedAt: number
}

export function recordRecentlyViewed(entry: Omit<RecentlyViewedEntry, 'viewedAt'>) {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentlyViewed().filter((e) => e.href !== entry.href)
    const next = [{ ...entry, viewedAt: Date.now() }, ...existing].slice(0, RECENTLY_VIEWED_LIMIT)
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable (private mode, etc.) - skip silently, not critical
  }
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setDefaultProductId(productId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEFAULT_PRODUCT_KEY, productId)
  } catch {
    // ignore
  }
}

export function getDefaultProductId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(DEFAULT_PRODUCT_KEY)
  } catch {
    return null
  }
}

// Dashboard widget show/hide + order (plans/archive/dashboard-redesign-plan.md
// Фаза 2) — per-browser like everything else in this file, not synced
// across devices (no multi-user backend to persist it against yet).
export interface DashboardWidgetLayout {
  id: string
  visible: boolean
}

export function getDashboardLayout(): DashboardWidgetLayout[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setDashboardLayout(layout: DashboardWidgetLayout[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout))
  } catch {
    // ignore
  }
}
