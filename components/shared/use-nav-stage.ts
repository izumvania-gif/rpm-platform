'use client'

import { useCallback, useEffect, useState } from 'react'
import { getNavStageOverride, setNavStageOverride } from '@/lib/client-storage'
import { NAV_STAGE_EVENT, resolveNavStage, type NavStage } from '@/lib/nav-disclosure'

// Shared by SiteNav and the dashboard's ModuleRail (C1) so one toggle moves
// both without a provider wrapping the whole app.
//
// The override is read after mount, not during render: it lives in
// localStorage, which the server cannot see, so the first paint has to use the
// data-derived stage or the markup would not match on hydration. Same trade-off
// (and same shape) as DashboardWidgetGrid's saved layout.
export function useNavStage(autoStage: NavStage) {
  const [override, setOverride] = useState<NavStage | null>(null)

  useEffect(() => {
    setOverride(getNavStageOverride())

    function sync() {
      setOverride(getNavStageOverride())
    }
    window.addEventListener(NAV_STAGE_EVENT, sync)
    return () => window.removeEventListener(NAV_STAGE_EVENT, sync)
  }, [])

  const stage = resolveNavStage(autoStage, override)

  const choose = useCallback(
    (next: NavStage) => {
      // Picking what the data would have chosen anyway clears the override
      // rather than pinning it, so the nav goes back to following the
      // workspace — and the toggle itself disappears again once there is
      // nothing left to undo.
      const stored = next === autoStage ? null : next
      setNavStageOverride(stored)
      setOverride(stored)
      window.dispatchEvent(new CustomEvent(NAV_STAGE_EVENT))
    },
    [autoStage]
  )

  return { stage, override, choose }
}
