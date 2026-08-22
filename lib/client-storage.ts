'use client'

import type { NavStage } from '@/lib/nav-disclosure'
import { ACTIVE_PRODUCT_COOKIE, ACTIVE_PRODUCT_COOKIE_MAX_AGE } from '@/lib/product-context'

const RECENTLY_VIEWED_KEY = 'rpm:recently-viewed'
/** Старый ключ. Читается только при миграции в cookie, см. getDefaultProductId. */
const DEFAULT_PRODUCT_KEY = 'rpm:default-product-id'
const DASHBOARD_LAYOUT_KEY = 'rpm:dashboard-layout'
const NAV_STAGE_KEY = 'rpm:nav-stage'
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

// Активный продукт переехал из localStorage в cookie (фаза 4 редизайна 2.1,
// plans/2.1-redesign-plan.md, правка 1): страницы со списками — Server
// Components, а из RSC localStorage не читается. Имена функций не изменились,
// поэтому 16 мест вызова трогать не пришлось.
//
// Хранилище именно одно, а не два: держать тот же факт ещё и в localStorage —
// ровно тот антипаттерн, против которого спека пишет раздел «Один источник
// правды». Старый ключ читается один раз, при миграции, и сразу удаляется.

export function setDefaultProductId(productId: string) {
  if (typeof window === 'undefined') return
  try {
    document.cookie =
      `${ACTIVE_PRODUCT_COOKIE}=${encodeURIComponent(productId)}` +
      `; path=/; max-age=${ACTIVE_PRODUCT_COOKIE_MAX_AGE}; samesite=lax`
  } catch {
    // ignore
  }
}

export function getDefaultProductId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const fromCookie = readCookie(ACTIVE_PRODUCT_COOKIE)
    if (fromCookie) return fromCookie

    // Разовая миграция: у кого продукт уже был выбран до этой фазы, он лежит
    // в localStorage. Переносим в cookie и убираем старый ключ, чтобы второго
    // хранилища не осталось.
    const legacy = window.localStorage.getItem(DEFAULT_PRODUCT_KEY)
    if (legacy) {
      setDefaultProductId(legacy)
      window.localStorage.removeItem(DEFAULT_PRODUCT_KEY)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length)) || null
    }
  }
  return null
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

// Explicit nav stage override (plans/2.0-product-leap-plan.md, C1). Null means
// "follow the workspace's own data"; a stored value pins the choice. Per-browser
// like everything else here — it is a display preference, not a permission.
export function getNavStageOverride(): NavStage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(NAV_STAGE_KEY)
    return raw === 'basic' || raw === 'full' ? raw : null
  } catch {
    return null
  }
}

export function setNavStageOverride(stage: NavStage | null) {
  if (typeof window === 'undefined') return
  try {
    if (stage === null) window.localStorage.removeItem(NAV_STAGE_KEY)
    else window.localStorage.setItem(NAV_STAGE_KEY, stage)
  } catch {
    // ignore
  }
}
